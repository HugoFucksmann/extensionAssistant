// src/orchestrator/handlers/explainCodeHandler.ts

import { BaseHandler } from './baseHandler';
import { ExecutionStep, StepResult, InputAnalysisResult } from '../execution/types';

/**
 * Handler specifically for 'explainCode' intent.
 * Orchestrates steps to gather relevant code context and generate an explanation.
 */
export class ExplainCodeHandler extends BaseHandler {
    private MAX_GATHERING_ITERATIONS = 4; // Limit iterations to avoid infinite loops

    /**
     * Handles the 'explainCode' intent.
     * Implements an iterative process to gather code context and generate an explanation.
     * @returns A promise resolving to the generated explanation text.
     */
    async handle(): Promise<string> {
        // Get relevant information from the context
        const analysis = this.context.getAnalysisResult();
        const objective = this.context.getObjective();
        const entities = this.context.getExtractedEntities();
        const userMessage = this.context.getValue<string>('userMessage');

        const chatId = this.context.getChatId();

        if (!objective) {
             console.warn(`[ExplainCodeHandler:${chatId}] No objective found in analysis.`);
             return "I need a clear objective to explain the code. What specifically would you like me to explain?";
        }

        console.log(`[ExplainCodeHandler:${chatId}] Handling explainCode intent. Objective: ${objective}`);

        // --- Paso 1: Recopilación de Contexto Inicial ---
        // Define initial steps to get started, e.g., reading files mentioned by the user
        const initialFilesToRead = entities?.filesMentioned || [];
        const initialSteps: ExecutionStep[] = [];

        if (initialFilesToRead.length > 0) {
            console.log(`[ExplainCodeHandler:${chatId}] Initial files mentioned: ${initialFilesToRead.join(', ')}. Reading...`);
            initialSteps.push(...initialFilesToRead.map((filePath, index) => ({
                 name: `readInitialFile:${index}:${filePath}`,
                 type: 'tool' as const, // Use 'as const' for literal type
                 execute: 'filesystem.getFileContents', // Assuming this tool exists
                 params: { filePath: filePath },
                 storeAs: `fileContent:${filePath.replace(/[^a-zA-Z0-9]/g, '_')}` // Store using a key derived from file path, sanitize key
            })));
        } else {
             // If no files mentioned, try getting the active editor content as a starting point
             console.log(`[ExplainCodeHandler:${chatId}] No initial files mentioned. Attempting to get active editor content.`);
             initialSteps.push({
                 name: 'readActiveEditorInitial',
                 type: 'tool' as const,
                 execute: 'filesystem.getActiveEditorContent', // Assuming this tool exists
                 // tool params might take { uri: activeEditorUri } depending on tool implementation
                 params: {}, // Assuming tool gets active editor automatically if no params
                 storeAs: 'activeEditorContent' // Store active file content under a standard key
             });
        }

        // Execute the initial steps (run in parallel if safe, sequence if dependencies exist)
        // Since reading files is usually independent, parallel is good here.
        console.log(`[ExplainCodeHandler:${chatId}] Running initial context gathering steps...`);
        const initialResults = await this.runStepsParallel(initialSteps);

        // Log results of initial steps (handlers can check stepResult.success later if needed)
        initialResults.forEach(result => {
             if (!result.success) {
                 console.warn(`[ExplainCodeHandler:${chatId}] Initial step failed: ${result.step.name}`, result.error);
                 // Could add a message to the context or history about the failure
                 if (result.step.storeAs) {
                     this.context.setValue(`${result.step.storeAs}_error`, result.error?.message || 'Failed to execute');
                 }
             } else if (result.skipped) {
                  console.log(`[ExplainCodeHandler:${chatId}] Initial step skipped: ${result.step.name}`);
             } else {
                  console.log(`[ExplainCodeHandler:${chatId}] Initial step succeeded: ${result.step.name}. Stored as '${result.step.storeAs}'.`);
             }
        });


        // --- Paso 2 & 3: Evaluación Iterativa del Contexto y Recopilación Adicional ---
        // Use a loop where the model evaluates the current context and suggests next steps if needed.
        let contextSufficient = false;
        let iteration = 0;
        const gatheredDataKeys: Set<string> = new Set(initialResults.filter(r => r.success && r.step.storeAs).map(r => r.step.storeAs!)); // Keep track of where data is stored

        while (!contextSufficient && iteration < this.MAX_GATHERING_ITERATIONS) {
            iteration++;
            console.log(`[ExplainCodeHandler:${chatId}] Gathering context iteration ${iteration}...`);

            // Define the step to evaluate the current context state
            // This prompt ('explainContextEvaluator') must be designed to return a structure like:
            // { sufficient: boolean, suggestedSteps?: ExecutionStep[] }
            const evaluateStep: ExecutionStep = {
                name: `evaluateExplainContext-${iteration}`,
                type: 'prompt' as const,
                execute: 'explainContextEvaluator', // Assuming this prompt type exists
                params: {
                    objective: objective,
                    userMessage: userMessage,
                    extractedEntities: entities,
                    chatHistory: this.context.getHistoryForModel(10), // Provide recent history
                    // Pass relevant gathered context data.
                    // We can pass the entire resolution context, and the prompt is designed
                    // to make sense of the keys/values available.
                    currentContextData: this.context.getResolutionContext(),
                    // You could also explicitly list important keys or summarize parts:
                    // filesRead: this.context.getValue('activeEditorContent') ? ['activeEditorContent'] : initialFilesToRead,
                    // // Pass content via placeholders, StepExecutor resolves them:
                    // activeEditorContent: '{{activeEditorContent}}',
                    // fileContents: initialFilesToRead.reduce((acc, file) => {
                    //      const key = `fileContent:${file.replace(/[^a-zA-Z0-9]/g, '_')}`;
                    //      if(this.context.getValue(key)) acc[file] = `{{${key}}}`; // Use placeholder
                    //      return acc;
                    // }, {} as Record<string, string>),
                    // ... other relevant context from previous steps (e.g., search results)
                },
                storeAs: `explainEvaluationResult-${iteration}` // Store the evaluation result
            };

            // Run the evaluation step
            const evaluationResultStep: StepResult<{ sufficient: boolean, suggestedSteps?: ExecutionStep[] }> = await this.runExecutionStep(evaluateStep);

            // Process the evaluation result
            if (!evaluationResultStep.success || !evaluationResultStep.result) {
                console.warn(`[ExplainCodeHandler:${chatId}] Context evaluation failed or returned no result in iteration ${iteration}.`, evaluationResultStep.error);
                 // If evaluation itself fails, we might have to stop gathering
                 break;
            }

            const evaluation = evaluationResultStep.result;
            contextSufficient = evaluation.sufficient ?? false; // Default to false if 'sufficient' is missing

            console.log(`[ExplainCodeHandler:${chatId}] Context evaluated as sufficient: ${contextSufficient}.`);

            // If context is not sufficient and the model suggested more steps
            if (!contextSufficient && evaluation.suggestedSteps && evaluation.suggestedSteps.length > 0) {
                console.log(`[ExplainCodeHandler:${chatId}] Model suggested ${evaluation.suggestedSteps.length} steps for further gathering.`);

                // Validate suggested steps (basic check) and add unique names/storeAs keys
                const validSuggestedSteps: ExecutionStep[] = evaluation.suggestedSteps.map((suggestedStep, index) => {
                     // Add iteration and index to name/storeAs for uniqueness across iterations and parallel runs
                     const uniqueId = `${iteration}-${index}`;
                     if (!suggestedStep.name) suggestedStep.name = `suggestedStep:${uniqueId}`;
                     else suggestedStep.name = `suggestedStep:${suggestedStep.name}-${uniqueId}`;

                     if (suggestedStep.storeAs) {
                         suggestedStep.storeAs = `${suggestedStep.storeAs}-${uniqueId}`;
                         // Add potential new key to our set
                         gatheredDataKeys.add(suggestedStep.storeAs);
                     }
                     // TODO: Add more robust validation for suggestedStep structure?

                     return suggestedStep;
                });


                // Execute suggested steps (can run in parallel if safe)
                const suggestedStepResults = await this.runStepsParallel(validSuggestedSteps);

                // Log and process results of suggested steps
                suggestedStepResults.forEach(result => {
                    if (!result.success) {
                        console.warn(`[ExplainCodeHandler:${chatId}] Suggested step failed: ${result.step.name}`, result.error);
                        // Optionally store failure info in context
                        if (result.step.storeAs) {
                             this.context.setValue(`${result.step.storeAs}_error`, result.error?.message || 'Failed to execute');
                             gatheredDataKeys.delete(result.step.storeAs); // Remove from successful keys set
                        }
                    } else if (result.skipped) {
                         console.log(`[ExplainCodeHandler:${chatId}] Suggested step skipped: ${result.step.name}`);
                    }
                    else {
                        console.log(`[ExplainCodeHandler:${chatId}] Suggested step succeeded: ${result.step.name}. Stored as '${result.step.storeAs}'.`);
                         // Result is already stored in context by StepExecutor if storeAs was present
                    }
                });

            } else if (!contextSufficient) {
                // If context is not sufficient but no steps suggested, or suggested steps were empty
                console.warn(`[ExplainCodeHandler:${chatId}] Model indicates context insufficient but provided no valid suggested steps in iteration ${iteration}. Stopping gathering loop.`);
                break; // Stop loop
            }
        }

        console.log(`[ExplainCodeHandler:${chatId}] Finished gathering phase. Context sufficient: ${contextSufficient}, Iterations: ${iteration}`);
        // console.log(`[ExplainCodeHandler:${chatId}] Gathered data keys in context:`, Array.from(gatheredDataKeys));


        // --- Paso 4: Generar la Explicación Final ---
        // If max iterations reached and context still not sufficient, log a warning, but still try to explain
        if (!contextSufficient && iteration === this.MAX_GATHERING_ITERATIONS) {
             console.warn(`[ExplainCodeHandler:${chatId}] Max gathering iterations reached. Context might be insufficient.`);
             // Check if we actually gathered *any* code content
             const hasCodeContent = Object.keys(this.context.getResolutionContext()).some(key => key.startsWith('fileContent:') || key === 'activeEditorContent');
             if (!hasCodeContent) {
                  return "I couldn't find any relevant code content to explain based on your request.";
             }
        }

        // Define the step to generate the final explanation
        const generateExplanationStep: ExecutionStep = {
            name: 'generateExplanation',
            type: 'prompt' as const,
            execute: 'explanationGenerator', // Assuming this prompt type exists
            params: {
                objective: objective,
                userMessage: userMessage,
                extractedEntities: entities,
                chatHistory: this.context.getHistoryForModel(5), // Pass recent history for tone
                // Pass all relevant gathered context for the explanation prompt
                // The prompt must be designed to handle potentially large context
                fullContextData: this.context.getResolutionContext(),
                // Alternative: Manually select and pass specific keys if context is huge
                // selectedContextData: Object.fromEntries(
                //     Array.from(gatheredDataKeys)
                //         .filter(key => this.context.getValue(key) !== undefined && !key.endsWith('_error')) // Only include successful results
                //         .map(key => [key, this.context.getValue(key)])
                // )
            },
            storeAs: 'finalExplanationResult' // Store the final explanation text
        };

        console.log(`[ExplainCodeHandler:${chatId}] Running final explanation generation step...`);
        const explanationResultStep: StepResult<string> = await this.runExecutionStep(generateExplanationStep);

        // Process the final explanation result
        if (explanationResultStep.success && explanationResultStep.result !== undefined) {
            console.log(`[ExplainCodeHandler:${chatId}] Successfully generated explanation.`);
            return explanationResultStep.result; // The final explanation text
        } else {
            // Handle failure in generating the final explanation
            console.error(`[ExplainCodeHandler:${chatId}] Failed to generate final explanation:`, explanationResultStep.error);
            return "Sorry, I encountered an error while generating the explanation.";
        }
    }
}