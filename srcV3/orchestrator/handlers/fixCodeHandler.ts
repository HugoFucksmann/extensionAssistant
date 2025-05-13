// src/orchestrator/handlers/fixCodeHandler.ts

import { BaseHandler } from './baseHandler';
import { ExecutionStep, StepResult, InputAnalysisResult } from '../execution/types';

/**
 * Handler specifically for 'fixCode' intent.
 * Orchestrates steps to diagnose a problem, gather context, propose a fix, and validate it.
 */
export class FixCodeHandler extends BaseHandler {
    private MAX_GATHERING_ITERATIONS = 5; // Maybe need more iterations for fixing than explaining

    /**
     * Handles the 'fixCode' intent.
     * Implements an iterative process to diagnose, gather context, propose, and validate a fix.
     * @returns A promise resolving to a message indicating the fix is ready for review
     *          or an error message. Can also store proposed changes in context for UI.
     */
    async handle(): Promise<string | any> { // Return type can be string or object
        // Get relevant information from the context
        const analysis = this.context.getAnalysisResult();
        const objective = this.context.getObjective();
        const entities = this.context.getExtractedEntities();
        const userMessage = this.context.getValue<string>('userMessage');
        const referencedFiles = this.context.getValue<string[]>('referencedFiles'); // Files initially referenced by user

        const chatId = this.context.getChatId();

        if (!objective) {
             console.warn(`[FixCodeHandler:${chatId}] No objective found in analysis.`);
             return "I need a clear objective to fix code. What problem are you trying to solve?";
        }

        console.log(`[FixCodeHandler:${chatId}] Handling fixCode intent. Objective: ${objective}`);

        // --- Paso 1: Recopilación de Contexto Inicial ---
        // Define initial steps to get started, crucial for diagnosing problems.
        // This might include reading mentioned files, active editor, searching for errors, etc.
        const initialSteps: ExecutionStep[] = [];

        // Always try to get the active editor content as a starting point for code changes
        initialSteps.push({
            name: 'readActiveEditorForFix',
            type: 'tool' as const,
            execute: 'filesystem.getActiveEditorContent', // Tool to get content of the currently active editor
            params: {}, // Assuming tool needs no params or gets editor automatically
            storeAs: 'activeEditorContentForFix' // Store active file content
        });

        // Read any specific files the user mentioned, if they are not the active one
        const filesToReadExplicitly = (entities?.filesMentioned || [])
            .filter(filePath => {
                 // Avoid re-reading the active editor file if it's already handled
                 // This check might need access to the active editor URI, which could be in context or the initial `files` array
                 // For simplicity here, we assume activeEditorContentForFix key contains info about which file it is or is primary focus
                 // A more robust check would compare paths/URIs
                 console.log(`[FixCodeHandler:${chatId}] Considering file mention: ${filePath}`);
                 // Simple check: if referencedFiles array contains this path, maybe it's already implicitly handled by activeEditorContentForFix?
                 // Or better: rely on the model to ask for more files if needed via iteration.
                 // Let's just read *all* explicitly mentioned files for now, even if it duplicates the active one. ToolRunner might cache or handle this.
                 return true; // Read all mentioned files explicitly
            });

        if (filesToReadExplicitly.length > 0) {
             console.log(`[FixCodeHandler:${chatId}] Explicitly mentioned files to read: ${filesToReadExplicitly.join(', ')}.`);
             initialSteps.push(...filesToReadExplicitly.map((filePath, index) => ({
                  name: `readMentionedFile:${index}:${filePath}`,
                  type: 'tool' as const,
                  execute: 'filesystem.getFileContents',
                  params: { filePath: filePath },
                  storeAs: `fileContent:${filePath.replace(/[^a-zA-Z0-9]/g, '_')}_forFix` // Store with unique key
             })));
        }


        // If entities mention errors, maybe search the workspace or error logs
        const errorsToSearch = entities?.errorsMentioned || [];
        if (errorsToSearch.length > 0) {
             console.log(`[FixCodeHandler:${chatId}] Errors mentioned, searching workspace...`);
             initialSteps.push(...errorsToSearch.map((errorMsg, index) => ({
                 name: `searchError:${index}`,
                 type: 'tool' as const,
                 execute: 'project.search', // Assuming a tool for project-wide search exists
                 params: { query: errorMsg, scope: 'workspace' }, // Scope could be 'files', 'references', etc.
                 storeAs: `searchResults:${errorMsg.replace(/[^a-zA-Z0-9]/g, '_')}` // Store search results
             })));
        }

        // Execute initial steps in parallel
        console.log(`[FixCodeHandler:${chatId}] Running initial context gathering steps...`);
        const initialResults = await this.runStepsParallel(initialSteps);

         initialResults.forEach(result => {
             if (!result.success || result.error) {
                 console.warn(`[FixCodeHandler:${chatId}] Initial step failed: ${result.step.name}`, result.error);
                 if (result.step.storeAs) {
                      this.context.setValue(`${result.step.storeAs}_error`, result.error?.message || 'Failed to execute');
                 }
             } else if (result.skipped) {
                  console.log(`[FixCodeHandler:${chatId}] Initial step skipped: ${result.step.name}`);
             } else {
                  console.log(`[FixCodeHandler:${chatId}] Initial step succeeded: ${result.step.name}. Stored as '${result.step.storeAs}'.`);
             }
         });


        // --- Paso 2 & 3: Evaluación Iterativa del Contexto y Recopilación Adicional ---
        // Loop where the model evaluates context and suggests more steps if needed for fixing.
        let contextSufficient = false;
        let iteration = 0;

        while (!contextSufficient && iteration < this.MAX_GATHERING_ITERATIONS) {
            iteration++;
            console.log(`[FixCodeHandler:${chatId}] Gathering context iteration ${iteration}...`);

            // Step to evaluate the current context for fixing
            // This prompt ('fixContextEvaluator') must be designed to return:
            // { sufficient: boolean, suggestedSteps?: ExecutionStep[] }
            const evaluateStep: ExecutionStep = {
                name: `evaluateFixContext-${iteration}`,
                type: 'prompt' as const,
                execute: 'fixContextEvaluator', // Assuming this prompt type exists
                params: {
                    objective: objective,
                    userMessage: userMessage,
                    extractedEntities: entities,
                    chatHistory: this.context.getHistoryForModel(10), // Provide recent history
                    // Pass all relevant gathered context data for the diagnosis
                    currentContextData: this.context.getResolutionContext(), // Access via {{}} in prompt template
                },
                storeAs: `fixEvaluationResult-${iteration}` // Store the evaluation result
            };

            const evaluationResultStep: StepResult<{ sufficient: boolean, suggestedSteps?: ExecutionStep[] }> = await this.runExecutionStep(evaluateStep);

             if (!evaluationResultStep.success || !evaluationResultStep.result) {
                 console.warn(`[FixCodeHandler:${chatId}] Fix context evaluation failed or returned no result in iteration ${iteration}.`, evaluationResultStep.error);
                  break; // Stop gathering if evaluation fails
             }

            const evaluation = evaluationResultStep.result;
            contextSufficient = evaluation.sufficient ?? false;

            console.log(`[FixCodeHandler:${chatId}] Context evaluated as sufficient for fixing: ${contextSufficient}.`);

            // If not sufficient and model suggested steps
            if (!contextSufficient && evaluation.suggestedSteps && evaluation.suggestedSteps.length > 0) {
                console.log(`[FixCodeHandler:${chatId}] Model suggested ${evaluation.suggestedSteps.length} steps for further context for fix.`);

                 const validSuggestedSteps: ExecutionStep[] = evaluation.suggestedSteps.map((suggestedStep, index) => {
                     // Add iteration and index for uniqueness
                     const uniqueId = `${iteration}-${index}`;
                     if (!suggestedStep.name) suggestedStep.name = `suggestedFixStep:${uniqueId}`;
                     else suggestedStep.name = `suggestedFixStep:${suggestedStep.name}-${uniqueId}`;

                     if (suggestedStep.storeAs) {
                         suggestedStep.storeAs = `${suggestedStep.storeAs}-${uniqueId}`;
                     }
                     // TODO: Add more robust validation for suggestedStep structure for fix context

                     return suggestedStep;
                 });

                // Execute suggested steps in parallel
                const suggestedStepResults = await this.runStepsParallel(validSuggestedSteps);

                 suggestedStepResults.forEach(result => {
                     if (!result.success || result.error) {
                         console.warn(`[FixCodeHandler:${chatId}] Suggested fix step failed: ${result.step.name}`, result.error);
                         if (result.step.storeAs) {
                             this.context.setValue(`${result.step.storeAs}_error`, result.error?.message || 'Failed to execute');
                         }
                     } else if (result.skipped) {
                          console.log(`[FixCodeHandler:${chatId}] Suggested fix step skipped: ${result.step.name}`);
                     } else {
                         console.log(`[FixCodeHandler:${chatId}] Suggested fix step succeeded: ${result.step.name}. Stored as '${result.step.storeAs}'.`);
                     }
                 });

            } else if (!contextSufficient) {
                console.warn(`[FixCodeHandler:${chatId}] Model indicates fix context insufficient but provided no valid suggested steps in iteration ${iteration}. Stopping gathering loop.`);
                break;
            }
        }

        console.log(`[FixCodeHandler:${chatId}] Finished gathering phase for fix. Context sufficient: ${contextSufficient}, Iterations: ${iteration}`);


        // --- Paso 4: Proponer la Solución (Generar Cambios) ---
        // If max iterations reached and context still not sufficient, maybe try to explain the problem instead?
        if (!contextSufficient && iteration === this.MAX_GATHERING_ITERATIONS) {
             console.warn(`[FixCodeHandler:${chatId}] Max gathering iterations reached for fix. Context might be insufficient. Cannot confidently propose a fix.`);
             // Fallback: Return a message explaining the issue based on the partial context
             // Or delegate to ExplainCodeHandler logic? (Requires more complex handling)
             // For now, return a specific error message
             return "I couldn't gather enough information to confidently propose a fix for that issue. Please provide more details or context.";
        }

        // Define the step to generate the fix proposal
        // This prompt ('fixProposer') must be designed to return a STRUCTURED format
        // that your UI can parse and apply (e.g., JSON describing file edits).
        const proposeFixStep: ExecutionStep = {
            name: 'proposeCodeFix',
            type: 'prompt' as const,
            execute: 'fixProposer', // Assuming this prompt type exists
            params: {
                objective: objective,
                userMessage: userMessage,
                extractedEntities: entities,
                chatHistory: this.context.getHistoryForModel(5), // Pass recent history
                // Pass all relevant gathered context for the model to propose a fix
                fullContextData: this.context.getResolutionContext(), // Access via {{}}
                // You might explicitly request the output format in the prompt's system instructions
            },
            storeAs: 'proposedChangesRawResult' // Store the raw structured output from the model
        };

        console.log(`[FixCodeHandler:${chatId}] Running fix proposal step...`);
        const proposeResultStep: StepResult<any> = await this.runExecutionStep(proposeFixStep);

        // Process the fix proposal result
        if (!proposeResultStep.success || proposeResultStep.result === undefined) {
             console.error(`[FixCodeHandler:${chatId}] Failed to propose fix:`, proposeResultStep.error);
             // Fallback: Explain the problem or return a specific error
             return "Sorry, I encountered an error while generating a proposed fix.";
        }

        const proposedChanges = proposeResultStep.result;
        // Store the proposed changes in a dedicated context key that the UI can easily access
        // You might need to parse or transform `proposedChangesRawResult` into a format
        // your UI understands before storing it in 'proposedChanges'.
        // Assuming proposeResultStep.result is already the correct format for UI:
        this.context.setValue('proposedChanges', proposedChanges);
        console.log(`[FixCodeHandler:${chatId}] Proposed changes stored in context.`);


        // --- Paso 5 (Opcional): Validación Interna del Código Arreglado ---
        // This phase adds robustness by checking the proposed fix.
        // Can use a prompt (model) or a tool (linter, compiler, formatter).
        let validationMessage = "";
        let validationSuccessful = false;

        // Only run validation if proposal was successful
        if (proposedChanges) {
            console.log(`[FixCodeHandler:${chatId}] Running validation step for proposed fix...`);
            const validateFixStep: ExecutionStep = {
                name: 'validateProposedFix',
                type: 'prompt' as const, // Example: Use a model prompt for validation
                // type: 'tool' as const, // Alternative: Use a linter or compiler tool
                execute: 'codeValidator', // Assuming this prompt/tool exists
                params: {
                    proposedChanges: proposedChanges, // Pass the proposed changes structure
                    originalCode: this.context.getValue('activeEditorContentForFix'), // Pass original code for comparison/context
                    fullContextData: this.context.getResolutionContext(), // Pass relevant gathered context
                    objective: objective
                    // Parameters depend heavily on the validation method (prompt vs tool)
                },
                storeAs: 'fixValidationResult' // Store the validation result
            };

            const validationResultStep: StepResult<any> = await this.runExecutionStep(validateFixStep);

            if (validationResultStep.success && validationResultStep.result !== undefined) {
                 const validationResult = validationResultStep.result as { isValid?: boolean, feedback?: string }; // Assuming prompt returns this shape
                 validationSuccessful = validationResult.isValid ?? true; // Assume valid if 'isValid' is missing or true
                 validationMessage = validationResult.feedback || '';
                 console.log(`[FixCodeHandler:${chatId}] Fix validation completed. Valid: ${validationSuccessful}`);
            } else {
                console.warn(`[FixCodeHandler:${chatId}] Fix validation step failed:`, validationResultStep.error);
                validationSuccessful = false; // Validation step failed, so validation didn't pass
                validationMessage = `Warning: Automated validation of the fix failed (${validationResultStep.error?.message || 'unknown error'}).`;
            }
        } else {
             console.warn(`[FixCodeHandler:${chatId}] No proposed changes available for validation.`);
             validationSuccessful = false; // Cannot be successful if no changes proposed
             validationMessage = "Note: No changes were proposed, so validation could not be performed.";
        }

        // Store validation status in context
        this.context.setValue('proposedFixValidationPassed', validationSuccessful);
        this.context.setValue('proposedFixValidationMessage', validationMessage);


        // --- Paso 6: Notificar a la UI y Devolver Mensaje ---
        // Return a message to the user. The UI should check the context for 'proposedChanges'.
        let responseMessage = "I've analyzed the issue and generated a potential fix.";

        if (proposedChanges) {
             responseMessage += " Please review the proposed changes.";
             if (validationMessage) {
                 responseMessage += `\n\n${validationMessage}`; // Add validation feedback
             }
        } else {
             responseMessage += " However, I couldn't generate a specific code change proposal.";
             if (validationMessage) { // Display validation message even if no changes proposed (e.g., validation failed)
                 responseMessage += `\n\n${validationMessage}`;
             }
        }


        // You could return a specific object instead of a string to signal UI action
        // For example: { type: 'showProposedChanges', message: responseMessage, proposedChanges: proposedChanges, validationStatus: { passed: validationSuccessful, message: validationMessage } }
        // But sticking to string for now and UI reads context:
        return responseMessage;
    }

     // Optional: Implement helper methods if needed, e.g., explainCurrentProblem
     // private async explainCurrentProblem(): Promise<string> { ... } // Could use StepExecutor internally
}