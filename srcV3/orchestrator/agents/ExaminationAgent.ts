// src/orchestrator/agents/ExaminationAgent.ts

import { IAgent } from './IAgent';
import { FlowContext } from '../context/flowContext';
import { StepExecutor } from '../execution/stepExecutor';
import { ExecutionStep } from '../execution/types';

/**
 * Agent responsible for handling 'examination' intents.
 * This agent gathers information about the project or specific code elements
 * using relevant tools and formats the results for the user.
 * Sequence (example for project-level examination):
 * 1. Get project info using 'project.getProjectInfo'.
 * 2. Get package dependencies using 'project.getPackageDependencies'.
 * 3. Run the 'examinationResultsFormatter' prompt to format the results.
 * 4. Respond to the user with the formatted results.
 *
 * More complex examination tasks (e.g., analyzing a specific function) might
 * require getting file content first or using other tools (if implemented).
 * This agent could potentially use an internal planner for complex examination workflows.
 */
export class ExaminationAgent implements IAgent {
    private stepExecutor: StepExecutor;

    constructor(stepExecutor: StepExecutor) {
        this.stepExecutor = stepExecutor;
    }

    async execute(flowContext: FlowContext): Promise<string | any> {
        const chatId = flowContext.getChatId();
        const analysis = flowContext.getAnalysisResult();
        // Get the examination objective from the objective or user message
        const examinationObjective = analysis?.objective || flowContext.getValue<string>('userMessage') || '';

        console.log(`[ExaminationAgent:${chatId}] Executing for examination objective: "${examinationObjective.substring(0, 50)}..."`);

        if (!examinationObjective) {
            console.warn(`[ExaminationAgent:${chatId}] No examination objective found.`);
            return "Sorry, I couldn't determine what you want me to examine.";
        }

        // Determine the target of examination (project, specific file, function, etc.)
        // For this simple implementation, let's assume project-level examination unless a file is mentioned.
        const filesMentioned = analysis?.extractedEntities?.filesMentioned || [];
        const targetFilePath = filesMentioned.length > 0 ? filesMentioned[0] : undefined; // Take the first mentioned file

        const steps: ExecutionStep[] = [];

        // Step 1: Gather relevant information using tools
        // Check if project info is already in context (e.g., from SessionContext pre-fetch)
        const existingProjectInfo = flowContext.getValue('projectInfo'); // projectInfo is added to FlowContext from SessionContext

        if (!targetFilePath) { // Assume project-level examination
            // Get project info (only add step if not already in context)
            if (existingProjectInfo === undefined) {
                 steps.push({
                     name: 'getProjectInfoForExamination',
                     type: 'tool',
                     execute: 'project.getProjectInfo',
                     params: {},
                     storeAs: 'projectInfoResult' // Store the result
                 });
            } else {
                 console.log(`[ExaminationAgent:${chatId}] Project info already available in context.`);
                 // Store the existing info under the expected key for the formatter prompt
                 flowContext.setValue('projectInfoResult', existingProjectInfo);
            }

            // Get package dependencies
            // Need workspace path for this tool, which is in SessionContext -> FlowContext resolution context
            steps.push({
                name: 'getPackageDependenciesForExamination',
                type: 'tool',
                execute: 'project.getPackageDependencies',
                params: { projectPath: '{{workspacePath}}' }, // Use placeholder for workspace path
                storeAs: 'packageDependenciesResult', // Store the result
                 // Condition: Only run if workspacePath is available
                 condition: (ctx) => ctx.workspacePath !== undefined && ctx.workspacePath !== null && ctx.workspacePath !== ''
            });
        } else { // Assume file-level examination
            // Get file content (only add step if not already in context)
            const existingFileContent = flowContext.getValue(`fileContent:${targetFilePath}`);
            if (existingFileContent === undefined) {
                 // TODO: Add validation if file exists/is accessible
                 steps.push({
                     name: 'getFileContentForExamination',
                     type: 'tool',
                     execute: 'filesystem.getFileContents',
                     params: { filePath: targetFilePath },
                     storeAs: `fileContent:${targetFilePath}` // Store using a dynamic key
                 });
            } else {
                 console.log(`[ExaminationAgent:${chatId}] File content already available in context.`);
                 // Content is already stored with the dynamic key by mapContextToBaseVariables
            }
             // TODO: Add steps here for code analysis tools if implemented
             // e.g., steps.push({ name: 'analyzeCodeStructure', type: 'tool', execute: 'codeAnalysis.getStructure', params: { filePath: targetFilePath }, storeAs: 'codeStructureResult' });
        }


        // Step 2: Format the examination results using a prompt
        steps.push({
            name: 'formatExaminationResults',
            type: 'prompt',
            execute: 'examinationResultsFormatter',
            params: {}, // examinationResultsFormatter prompt uses full context (including tool results)
            storeAs: 'formattedExaminationResults', // Store the formatted string
             // Condition: Only run if at least one of the relevant tool results is available
             condition: (ctx) => {
                  const hasFileContent = targetFilePath ? (ctx[`fileContent:${targetFilePath}`] !== undefined && ctx[`fileContent:${targetFilePath}`] !== null && ctx[`fileContent:${targetFilePath}`] !== '') : false;
                  const hasProjectInfo = ctx.projectInfoResult !== undefined && ctx.projectInfoResult !== null;
                  const hasDependencies = ctx.packageDependenciesResult !== undefined && ctx.packageDependenciesResult !== null;
                  // TODO: Add conditions for other potential examination results
                  return hasFileContent || hasProjectInfo || hasDependencies;
             }
        });

        let finalResponse: string | any = "Sorry, I couldn't perform the examination."; // Default failure message

        for (const step of steps) {
            const stepResult = await this.stepExecutor.runStep(step, flowContext);

            if (stepResult.skipped) {
                 console.log(`[ExaminationAgent:${chatId}] Step skipped: '${step.name}'. Condition was false.`);
                 // If a step is skipped, check if it was a critical step.
                 // If 'get project info' or 'get file content' is skipped because data was already there, fine.
                 // If 'get dependencies' is skipped because workspace path is missing, the formatter might still work with just project info.
                 // If 'format results' is skipped because no results were available, finalResponse remains default.
            } else if (!stepResult.success) {
                console.error(`[ExaminationAgent:${chatId}] Step failed: '${step.name}'.`, stepResult.error?.message || 'Unknown error');
                // If a step fails, set the final response to an error and stop the sequence
                finalResponse = `Sorry, a step failed while trying to perform the examination ('${step.name}'). Error: ${stepResult.error?.message || 'Unknown error'}.`;
                return finalResponse; // Exit early
            } else {
                 console.log(`[ExaminationAgent:${chatId}] Step succeeded: '${step.name}'.`);
                 // If the last step (formatExaminationResults) succeeded, its result is the desired output
                 if (step.name === 'formatExaminationResults' && stepResult.result !== undefined) {
                      finalResponse = stepResult.result; // Assuming the formatter prompt returns the string
                 }
            }
        }

         // After running all steps, return the finalResponse.
         // If the formatter prompt succeeded, finalResponse will hold its result.
         // Otherwise, it will hold the default failure message or an error message from a failed step.
        return finalResponse;
    }
}