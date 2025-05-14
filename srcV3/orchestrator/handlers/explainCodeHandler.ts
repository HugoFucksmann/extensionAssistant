// src/orchestrator/handlers/explainCodeHandler.ts

import { BaseHandler } from './baseHandler';
import { ExecutionStep, StepResult, InputAnalysisResult } from '../execution/types';
// Import FlowContext instead of InteractionContext
import { FlowContext } from '../context';
import { StepExecutor } from '../execution/stepExecutor';


/**
 * Handler specifically for 'explainCode' intent.
 * Orchestrates steps to gather relevant code context and generate an explanation.
 */
export class ExplainCodeHandler extends BaseHandler {

    // Constructor receives FlowContext
    constructor(context: FlowContext, stepExecutor: StepExecutor) {
        super(context, stepExecutor); // Pass FlowContext to BaseHandler
    }


    /**
     * Handles the 'explainCode' intent.
     * Gathers context and sends it to a single explanation prompt.
     * @returns A promise resolving to the generated explanation text (string).
     */
    async handle(): Promise<string> {
        // Access data via FlowContext methods or getResolutionContext
        const analysis = this.context.getAnalysisResult();
        const objective = this.context.getObjective();
        // const entities = this.context.getExtractedEntities(); // Access via analysis or getResolutionContext

        const chatId = this.context.getChatId(); // Get chat ID from FlowContext

        if (!objective) {
             console.warn(`[ExplainCodeHandler:${chatId}] No objective found in analysis.`);
             return "I need a clear objective to explain the code. What specifically would you like me to explain?";
        }

        console.log(`[ExplainCodeHandler:${chatId}] Handling explainCode intent. Objective: ${objective}`);

        // --- Paso 1: Recopilación de Contexto ---
        // Define all relevant context gathering steps upfront.
        const gatheringSteps: ExecutionStep[] = [];

        // Always try to get the active editor content using the new tool name
        gatheringSteps.push({
            name: 'readActiveEditorForExplain',
            type: 'tool' as const,
            execute: 'editor.getActiveEditorContent', // Updated tool name
            params: {}, // No params needed for this tool
            storeAs: 'activeEditorContent' // Standard key for active editor content in FlowContext
        });

        // Read any specific files the user mentioned (entities.filesMentioned is in context after analysis)
        const filesToReadExplicitly = (analysis?.extractedEntities?.filesMentioned || []);
        if (filesToReadExplicitly.length > 0) {
             console.log(`[ExplainCodeHandler:${chatId}] Explicitly mentioned files to read: ${filesToReadExplicitly.join(', ')}.`);
             gatheringSteps.push(...filesToReadExplicitly.map((filePath, index) => ({
                  name: `readMentionedFile:${index}:${filePath}`,
                  type: 'tool' as const,
                  execute: 'filesystem.getFileContents', // Updated tool name
                  params: { filePath: filePath }, // Parameter name matches tool expectation
                  storeAs: `fileContent:${filePath.replace(/[^a-zA-Z0-9]/g, '_')}` // Store with standard dynamic key in FlowContext
             })));
        }


        // Add other potential gathering steps here using new tool names
        // Example: If objective mentions a function name, maybe add a step to find its definition location?
        // This would require a tool like 'codeAnalysis.findDefinition' (placeholder for future)
        // gatheringSteps.push({
        //      name: 'findDefinitionOfSymbol',
        //      type: 'tool' as const,
        //      execute: 'codeAnalysis.findDefinition', // Placeholder tool name
        //      params: { symbol: '{{extractedEntities.functionsMentioned.[0]}}' }, // Example param resolution
        //      storeAs: 'symbolDefinition',
        //      condition: (contextData) => Array.isArray(contextData.extractedEntities?.functionsMentioned) && contextData.extractedEntities.functionsMentioned.length > 0
        // });


        // Execute all gathering steps in parallel (using BaseHandler helper)
        console.log(`[ExplainCodeHandler:${chatId}] Running context gathering steps...`);
        // runStepsParallel uses StepExecutor internally, which uses FlowContext.getResolutionContext()
        const gatheringResults = await this.runStepsParallel(gatheringSteps);

         gatheringResults.forEach(result => {
             if (!result.success || result.error) {
                 console.warn(`[ExplainCodeHandler:${chatId}] Gathering step failed: ${result.step.name}`, result.error);
             } else if (result.skipped) {
                  console.log(`[ExplainCodeHandler:${chatId}] Gathering step skipped: ${result.step.name}`);
             } else {
                  console.log(`[ExplainCodeHandler:${chatId}] Gathering step succeeded: ${result.step.name}. Stored as '${result.step.storeAs}' in FlowContext.`);
             }
         });

         // Check if *any* code content was gathered. If not, we can't explain.
         // Access the FlowContext state directly or via getResolutionContext
         const resolutionContext = this.context.getResolutionContext(); // Get flattened context
         const hasCodeContent = resolutionContext.activeEditorContent !== undefined ||
                                Object.keys(resolutionContext).some(key => key.startsWith('fileContent:') && resolutionContext[key] !== undefined && resolutionContext[key] !== null);


         if (!hasCodeContent) {
              console.warn(`[ExplainCodeHandler:${chatId}] No code content gathered.`);
              return "I couldn't find any relevant code content to explain based on your request. Please make sure the file is open or mentioned correctly.";
         }


        // --- Paso 2: Generar la Explicación Final usando el Contexto Recopilado ---
        // Define the step to call the single explanation prompt
        const generateExplanationStep: ExecutionStep = {
            name: 'generateExplanation',
            type: 'prompt' as const,
            execute: 'explainCodePrompt', // Use the prompt type
            params: {
                // No need to list context variables here.
                // The buildExplainCodeVariables function in prompt.explainCode.ts
                // will get them from the full resolution context passed by StepExecutor.
            },
            storeAs: 'explanationResult' // Store the parsed result object { explanation: string, ... } in FlowContext
        };

        console.log(`[ExplainCodeHandler:${chatId}] Running explanation generation step...`);
        // runExecutionStep uses StepExecutor internally, which passes FlowContext.getResolutionContext()
        const explanationResultStep: StepResult<{ explanation?: string, error?: string }> = await this.runExecutionStep(generateExplanationStep);

        // Process the final explanation result from the StepResult
        if (explanationResultStep.success && explanationResultStep.result !== undefined) {
            const explanationResult = explanationResultStep.result;
            if (explanationResult.explanation) {
                 console.log(`[ExplainCodeHandler:${chatId}] Successfully generated explanation.`);
                 return explanationResult.explanation; // Return the explanation string
            } else if (explanationResult.error) {
                 console.error(`[ExplainCodeHandler:${chatId}] Explanation prompt returned an error:`, explanationResult.error);
                 return `Sorry, I encountered an error while generating the explanation: ${explanationResult.error}`;
            } else {
                 console.warn(`[ExplainCodeHandler:${chatId}] Explanation prompt returned success but no explanation or error property.`, explanationResult);
                 return "Successfully ran explanation process, but the model didn't provide an explanation.";
            }
        } else {
            // Handle failure in generating the final explanation step itself
            console.error(`[ExplainCodeHandler:${chatId}] Failed to run explanation generation step:`, explanationResultStep.error);
            return "Sorry, I encountered an error while generating the explanation.";
        }
    }
}