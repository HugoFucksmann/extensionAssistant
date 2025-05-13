// src/orchestrator/handlers/explainCodeHandler.ts

import { BaseHandler } from './baseHandler';
import { ExecutionStep, StepResult, InputAnalysisResult } from '../execution/types';

/**
 * Handler specifically for 'explainCode' intent.
 * Orchestrates steps to gather relevant code context and generate an explanation.
 */
export class ExplainCodeHandler extends BaseHandler {

    /**
     * Handles the 'explainCode' intent.
     * Gathers context and sends it to a single explanation prompt.
     * @returns A promise resolving to the generated explanation text (string).
     */
    async handle(): Promise<string> {
        const analysis = this.context.getAnalysisResult();
        const objective = this.context.getObjective();
        const entities = this.context.getExtractedEntities();
        const userMessage = this.context.getValue<string>('userMessage');
        const referencedFiles = this.context.getValue<string[]>('referencedFiles'); // Files initially referenced by user

        const chatId = this.context.getChatId();

        if (!objective) {
             console.warn(`[ExplainCodeHandler:${chatId}] No objective found in analysis.`);
             return "I need a clear objective to explain the code. What specifically would you like me to explain?";
        }

        console.log(`[ExplainCodeHandler:${chatId}] Handling explainCode intent. Objective: ${objective}`);

        // --- Paso 1: Recopilación de Contexto ---
        // Define all relevant context gathering steps upfront.
        const gatheringSteps: ExecutionStep[] = [];

        // Always try to get the active editor content
        gatheringSteps.push({
            name: 'readActiveEditorForExplain',
            type: 'tool' as const,
            execute: 'filesystem.getActiveEditorContent',
            params: {},
            storeAs: 'activeEditorContent' // Standard key for active editor content
        });

        // Read any specific files the user mentioned
        const filesToReadExplicitly = (entities?.filesMentioned || []);
        if (filesToReadExplicitly.length > 0) {
             console.log(`[ExplainCodeHandler:${chatId}] Explicitly mentioned files to read: ${filesToReadExplicitly.join(', ')}.`);
             gatheringSteps.push(...filesToReadExplicitly.map((filePath, index) => ({
                  name: `readMentionedFile:${index}:${filePath}`,
                  type: 'tool' as const,
                  execute: 'filesystem.getFileContents',
                  params: { filePath: filePath },
                  storeAs: `fileContent:${filePath.replace(/[^a-zA-Z0-9]/g, '_')}` // Store with unique key derived from path
             })));
        }

        // Add other potential gathering steps here (e.g., search for symbols, get project structure)
        // Example: If objective mentions a function name, maybe add a step to find its definition location?
        // if (entities?.functionsMentioned && entities.functionsMentioned.length > 0) {
        //      gatheringSteps.push({
        //           name: 'findFunctionDefinition',
        //           type: 'tool' as const,
        //           execute: 'project.findDefinition', // Assuming this tool exists
        //           params: { symbol: entities.functionsMentioned[0] },
        //           storeAs: 'functionDefinitionLocation'
        //      });
        // }


        // Execute all gathering steps in parallel
        console.log(`[ExplainCodeHandler:${chatId}] Running context gathering steps...`);
        const gatheringResults = await this.runStepsParallel(gatheringSteps);

         gatheringResults.forEach(result => {
             if (!result.success || result.error) {
                 console.warn(`[ExplainCodeHandler:${chatId}] Gathering step failed: ${result.step.name}`, result.error);
             } else if (result.skipped) {
                  console.log(`[ExplainCodeHandler:${chatId}] Gathering step skipped: ${result.step.name}`);
             } else {
                  console.log(`[ExplainCodeHandler:${chatId}] Gathering step succeeded: ${result.step.name}. Stored as '${result.step.storeAs}'.`);
             }
         });

         // Check if *any* code content was gathered. If not, we can't explain.
         const resolutionContext = this.context.getResolutionContext();
         const hasCodeContent = Object.keys(resolutionContext).some(key =>
             (key.startsWith('fileContent:') || key === 'activeEditorContent') && resolutionContext[key] !== undefined && resolutionContext[key] !== null
         );

         if (!hasCodeContent) {
              console.warn(`[ExplainCodeHandler:${chatId}] No code content gathered.`);
              return "I couldn't find any relevant code content to explain based on your request. Please make sure the file is open or mentioned correctly.";
         }


        // --- Paso 2: Generar la Explicación Final usando el Contexto Recopilado ---
        // Define the step to call the single explanation prompt
        const generateExplanationStep: ExecutionStep = {
            name: 'generateExplanation',
            type: 'prompt' as const,
            execute: 'explainCodePrompt', // <-- Use the single new prompt type
            params: {
                // buildPromptVariables in promptSystem will take the resolution context
                // and map these keys, but listing them here makes the dependency clear.
                objective: objective,
                userMessage: userMessage,
                extractedEntities: entities,
                chatHistory: this.context.getHistoryForModel(5),
                // The fullContextData will be passed via buildPromptVariables
                // fullContextData: this.context.getResolutionContext(), // This is handled by buildPromptVariables
            },
            storeAs: 'explanationResult' // Store the parsed result object
        };

        console.log(`[ExplainCodeHandler:${chatId}] Running explanation generation step...`);
        // The parseModelResponse for explainCodePrompt is expected to return { explanation: string, ... }
        const explanationResultStep: StepResult<{ explanation?: string, error?: string }> = await this.runExecutionStep(generateExplanationStep);

        // Process the final explanation result
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