// src/orchestrator/agents/ProjectManagementAgent.ts

import { IAgent } from './IAgent';
import { FlowContext } from '../context/flowContext';
import { StepExecutor } from '../execution/stepExecutor';
import { ExecutionStep, ProjectManagementParamsFormatterResponse } from '../execution/types'; // Import response type

/**
 * Agent responsible for handling 'projectManagement' intents.
 * This agent performs tasks related to project structure or dependencies,
 * such as creating files/directories or adding/installing packages.
 * It uses a prompt to format parameters for specific tools.
 * Sequence (example for "create file"):
 * 1. Get the objective and relevant entities.
 * 2. Run 'projectManagementParamsFormatter' to get parameters for 'filesystem.createFile'.
 * 3. Run 'filesystem.createFile' tool.
 * 4. Respond to the user.
 *
 * Sequence (example for "add dependency"):
 * 1. Get the objective and relevant entities.
 * 2. Run 'projectManagementParamsFormatter' to get parameters for 'project.addDependency'.
 * 3. Run 'project.addDependency' tool.
 * 4. Respond to the user.
 *
 * This agent uses conditional logic to determine the specific tool sequence needed.
 */
export class ProjectManagementAgent implements IAgent {
    private stepExecutor: StepExecutor;

    constructor(stepExecutor: StepExecutor) {
        this.stepExecutor = stepExecutor;
    }

    async execute(flowContext: FlowContext): Promise<string | any> {
        const chatId = flowContext.getChatId();
        const analysis = flowContext.getAnalysisResult();
        // Get the project management objective
        const pmObjective = analysis?.objective || flowContext.getValue<string>('userMessage') || '';

        console.log(`[ProjectManagementAgent:${chatId}] Executing for objective: "${pmObjective.substring(0, 50)}..."`);

        if (!pmObjective) {
            console.warn(`[ProjectManagementAgent:${chatId}] No project management objective found.`);
            return "Sorry, I couldn't determine the project management task you want me to perform.";
        }

        // Determine the type of project management action needed based on the objective/analysis
        // This is a simplified example; a real implementation might use a prompt or more complex logic here.
        let actionType: 'createFile' | 'createDirectory' | 'addDependency' | 'installDependencies' | 'unknown' = 'unknown';

        const lowerObjective = pmObjective.toLowerCase();
        const entities = analysis?.extractedEntities;

        if (lowerObjective.includes('create file') || lowerObjective.includes('add file') || (entities?.filesMentioned && entities.filesMentioned.length > 0 && !lowerObjective.includes('fix') && !lowerObjective.includes('explain'))) {
             actionType = 'createFile';
        } else if (lowerObjective.includes('create directory') || lowerObjective.includes('add folder')) {
             actionType = 'createDirectory';
        } else if (lowerObjective.includes('add dependency') || lowerObjective.includes('install package') || lowerObjective.includes('add package') || (entities?.customKeywords?.some(k => ['add', 'install'].includes(k)) && entities?.customKeywords?.some(k => ['package', 'dependency', 'lib'].includes(k)))) {
             actionType = 'addDependency';
        } else if (lowerObjective.includes('install dependencies') || lowerObjective.includes('install packages') || lowerObjective.includes('npm install') || lowerObjective.includes('yarn install') || lowerObjective.includes('pnpm install')) {
             actionType = 'installDependencies';
        }

        console.log(`[ProjectManagementAgent:${chatId}] Determined action type: ${actionType}`);

        if (actionType === 'unknown') {
             return `Sorry, I understand this is a project management task, but I'm not sure how to proceed with "${pmObjective}".`;
        }

        const steps: ExecutionStep[] = [];
        let targetTool: string | undefined; // The tool determined by the agent's logic

        // Step 1: Format parameters using the prompt (common for most actions)
        steps.push({
            name: 'formatProjectManagementParams',
            type: 'prompt',
            execute: 'projectManagementParamsFormatter',
            params: {}, // prompt uses full context
            storeAs: 'projectManagementParams', // Store the generated JSON parameters
        });

        // Step 2: Determine and add the specific tool step based on actionType
        // This needs to happen *after* the formatter step is defined, but before execution.
        // We'll add the tool step conditionally based on the *expected* output of the formatter.

        let successMessage = "Project management task completed."; // Default success message

        switch (actionType) {
            case 'createFile':
                targetTool = 'filesystem.createFile';
                successMessage = "File created successfully.";
                break;
            case 'createDirectory':
                targetTool = 'filesystem.createDirectory';
                successMessage = "Directory created successfully.";
                break;
            case 'addDependency':
                targetTool = 'project.addDependency';
                successMessage = "Dependency added successfully.";
                break;
            case 'installDependencies':
                targetTool = 'project.installDependencies';
                successMessage = "Dependencies installed successfully.";
                break;
             default:
                 // Should not happen due to check above, but as safeguard
                 return `Internal error: Unknown action type ${actionType}`;
        }

        // Add the determined tool step
        steps.push({
            name: `run_${actionType}_tool`,
            type: 'tool',
            execute: targetTool,
            // Params come from the result of the formatter prompt
            params: {} as ProjectManagementParamsFormatterResponse, // Will be replaced by the actual params object at runtime
            storeAs: 'projectManagementResult', // Store the result of the tool execution
             // Condition: Only run if the parameters were successfully generated by the prompt
             // Check if projectManagementParams exists, is an object, and is not empty (basic check)
             condition: (ctx) => {
                 const params = ctx.projectManagementParams;
                 return params !== undefined && params !== null && typeof params === 'object' && !Array.isArray(params) && Object.keys(params).length > 0;
             }
        });


        let finalResponse: string | any = `Sorry, I couldn't complete the project management task (${actionType}).`; // Default failure message

        for (const step of steps) {
            const stepResult = await this.stepExecutor.runStep(step, flowContext);

            if (stepResult.skipped) {
                 console.log(`[ProjectManagementAgent:${chatId}] Step skipped: '${step.name}'. Condition was false.`);
                 // If the tool step is skipped because parameters are missing/invalid,
                 // the finalResponse will remain the default failure message.
            } else if (!stepResult.success) {
                console.error(`[ProjectManagementAgent:${chatId}] Step failed: '${step.name}'.`, stepResult.error?.message || 'Unknown error');
                // If a step fails, set the final response to an error and stop the sequence
                finalResponse = `Sorry, a step failed while trying to perform the project management task ('${step.name}'). Error: ${stepResult.error?.message || 'Unknown error'}.`;
                return finalResponse; // Exit early
            } else {
                 console.log(`[ProjectManagementAgent:${chatId}] Step succeeded: '${step.name}'.`);
                 // If the last step (the tool execution) succeeded, use the predefined success message
                 if (step.name === `run_${actionType}_tool` && stepResult.result !== undefined) {
                      // Optionally use a message from the tool result if available
                      finalResponse = stepResult.result.message || successMessage;
                 }
            }
        }

         // After running all steps, return the finalResponse.
         // If the tool succeeded, finalResponse will hold the success message.
         // Otherwise, it will hold the default failure message or an error message from a failed step.
        return finalResponse;
    }
}