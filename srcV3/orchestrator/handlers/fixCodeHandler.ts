// src/orchestrator/handlers/fixCodeHandler.ts

import { BaseHandler } from './baseHandler';
import { ExecutionStep, StepResult, InputAnalysisResult } from '../execution/types';

/**
 * Handler specifically for 'fixCode' intent.
 * Orchestrates steps to diagnose a problem, gather context, propose a fix, and validate it.
 */
export class FixCodeHandler extends BaseHandler {

    /**
     * Handles the 'fixCode' intent.
     * Gathers context, sends it to a single fix prompt, and processes the result.
     * @returns A promise resolving to a string message for the user.
     */
    async handle(): Promise<string> { // Return type is string
        const analysis = this.context.getAnalysisResult();
        const objective = this.context.getObjective();
        const entities = this.context.getExtractedEntities();
        const userMessage = this.context.getValue<string>('userMessage');
        const referencedFiles = this.context.getValue<string[]>('referencedFiles');

        const chatId = this.context.getChatId();

        if (!objective) {
             console.warn(`[FixCodeHandler:${chatId}] No objective found in analysis.`);
             return "I need a clear objective to fix code. What problem are you trying to solve?";
        }

        console.log(`[FixCodeHandler:${chatId}] Handling fixCode intent. Objective: ${objective}`);

        // --- Paso 1: Recopilación de Contexto ---
        // Define all relevant context gathering steps upfront.
        const gatheringSteps: ExecutionStep[] = [];

        // Always try to get the active editor content
        gatheringSteps.push({
            name: 'readActiveEditorForFix',
            type: 'tool' as const,
            execute: 'filesystem.getActiveEditorContent',
            params: {},
            storeAs: 'activeEditorContentForFix' // Standard key for active editor content for fix
        });

        // Read any specific files the user mentioned
        const filesToReadExplicitly = (entities?.filesMentioned || []);
        if (filesToReadExplicitly.length > 0) {
             console.log(`[FixCodeHandler:${chatId}] Explicitly mentioned files to read: ${filesToReadExplicitly.join(', ')}.`);
             gatheringSteps.push(...filesToReadExplicitly.map((filePath, index) => ({
                  name: `readMentionedFile:${index}:${filePath}`,
                  type: 'tool' as const,
                  execute: 'filesystem.getFileContents',
                  params: { filePath: filePath },
                  storeAs: `fileContent:${filePath.replace(/[^a-zA-Z0-9]/g, '_')}_forFix` // Store with unique key
             })));
        }

        // If entities mention errors, maybe search the workspace
        const errorsToSearch = entities?.errorsMentioned || [];
        if (errorsToSearch.length > 0) {
             console.log(`[FixCodeHandler:${chatId}] Errors mentioned, searching workspace...`);
             // Only search for the first few errors to keep context size manageable
             const errorsForSearch = errorsToSearch.slice(0, 3);
             gatheringSteps.push(...errorsForSearch.map((errorMsg, index) => ({
                 name: `searchError:${index}`,
                 type: 'tool' as const,
                 execute: 'project.search',
                 params: { query: errorMsg, scope: 'workspace' },
                 storeAs: `searchResults:${errorMsg.replace(/[^a-zA-Z0-9]/g, '_')}`
             })));
        }

        // Add other potential gathering steps here (e.g., find references, get related files)


        // Execute all gathering steps in parallel
        console.log(`[FixCodeHandler:${chatId}] Running context gathering steps...`);
        const gatheringResults = await this.runStepsParallel(gatheringSteps);

         gatheringResults.forEach(result => {
             if (!result.success || result.error) {
                 console.warn(`[FixCodeHandler:${chatId}] Gathering step failed: ${result.step.name}`, result.error);
             } else if (result.skipped) {
                  console.log(`[FixCodeHandler:${chatId}] Gathering step skipped: ${result.step.name}`);
             } else {
                  console.log(`[FixCodeHandler:${chatId}] Gathering step succeeded: ${result.step.name}. Stored as '${result.step.storeAs}'.`);
             }
         });

         // Check if *any* code content was gathered. If not, we can't fix code.
         const resolutionContext = this.context.getResolutionContext();
         const hasCodeContent = Object.keys(resolutionContext).some(key =>
             (key.startsWith('fileContent:') || key === 'activeEditorContentForFix') && resolutionContext[key] !== undefined && resolutionContext[key] !== null
         );

         if (!hasCodeContent) {
              console.warn(`[FixCodeHandler:${chatId}] No code content gathered.`);
              return "I couldn't find any relevant code content to analyze for a fix. Please make sure the file is open or mentioned correctly.";
         }


        // --- Paso 2: Proponer la Solución (Generar Cambios) ---
        // Define the step to call the single fix prompt
        const proposeFixStep: ExecutionStep = {
            name: 'proposeCodeFix',
            type: 'prompt' as const,
            execute: 'fixCodePrompt', // <-- Use the single new prompt type
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
            storeAs: 'proposedFixResult' // Store the parsed result object { messageToUser, proposedChanges, ... }
        };

        console.log(`[FixCodeHandler:${chatId}] Running fix proposal step...`);
        // The parseModelResponse for fixCodePrompt is expected to return { messageToUser: string, proposedChanges: [], ... }
        const proposeResultStep: StepResult<{ messageToUser?: string, proposedChanges?: any[], error?: string }> = await this.runExecutionStep(proposeFixStep);

        // Process the fix proposal result
        let responseMessage = "I've analyzed the issue and generated a potential fix.";
        let proposedChanges: any[] | undefined;
        let fixError: string | undefined;

        if (proposeResultStep.success && proposeResultStep.result !== undefined) {
            const fixResult = proposeResultStep.result;
            proposedChanges = Array.isArray(fixResult.proposedChanges) ? fixResult.proposedChanges : undefined;
            fixError = fixResult.error;

            if (fixResult.messageToUser) {
                 responseMessage = fixResult.messageToUser; // Use model's message if provided
            } else if (fixError) {
                 responseMessage = `Sorry, I encountered an error while generating a fix proposal: ${fixError}`;
            } else {
                 responseMessage = "Successfully ran fix process, but the model didn't provide a specific message.";
            }

            // Store the proposed changes in a dedicated context key that the UI can easily access
            if (proposedChanges) {
                this.context.setValue('proposedChanges', proposedChanges);
                console.log(`[FixCodeHandler:${chatId}] Proposed changes stored in context.`);
            } else {
                 console.warn(`[FixCodeHandler:${chatId}] Fix prompt returned success but no proposedChanges array.`);
                 // Ensure 'proposedChanges' is explicitly set to undefined or null if not provided
                 this.context.setValue('proposedChanges', undefined);
            }

        } else {
            // Handle failure in running the fix proposal step itself
            console.error(`[FixCodeHandler:${chatId}] Failed to run fix proposal step:`, proposeResultStep.error);
            responseMessage = "Sorry, I encountered an error while generating a proposed fix.";
            // Ensure 'proposedChanges' is explicitly set to undefined or null on failure
            this.context.setValue('proposedChanges', undefined);
        }


        // --- Optional: Internal Validation ---
        // Only run validation if the proposal step was successful AND returned proposed changes
        if (proposeResultStep.success && proposedChanges && proposedChanges.length > 0) {
            console.log(`[FixCodeHandler:${chatId}] Running validation step for proposed fix...`);
            // Assuming 'codeValidator' prompt/tool exists and takes proposedChanges
            const validateFixStep: ExecutionStep = {
                name: 'validateProposedFix',
                type: 'prompt' as const, // Or 'tool'
                execute: 'codeValidator', // Assuming this prompt/tool exists
                params: {
                    proposedChanges: proposedChanges, // Pass the proposed changes structure
                    originalCode: this.context.getValue('activeEditorContentForFix'), // Pass original code for context
                    fullContextData: this.context.getResolutionContext(), // Pass relevant gathered context
                    objective: objective
                },
                storeAs: 'fixValidationResult' // Store the validation result { isValid, feedback }
            };

            const validationResultStep: StepResult<{ isValid?: boolean, feedback?: string, error?: string }> = await this.runExecutionStep(validateFixStep);

            let validationMessage = "";
            let validationSuccessful = false;

            if (validationResultStep.success && validationResultStep.result !== undefined) {
                 const validationResult = validationResultStep.result;
                 validationSuccessful = validationResult.isValid ?? true; // Assume valid if 'isValid' is missing or true
                 validationMessage = validationResult.feedback || validationResult.error || '';
                 console.log(`[FixCodeHandler:${chatId}] Fix validation completed. Valid: ${validationSuccessful}`);
            } else {
                console.warn(`[FixCodeHandler:${chatId}] Fix validation step failed:`, validationResultStep.error);
                validationSuccessful = false;
                validationMessage = `Warning: Automated validation of the fix failed (${validationResultStep.error?.message || 'unknown error'}).`;
            }

            // Store validation status in context
            this.context.setValue('proposedFixValidationPassed', validationSuccessful);
            this.context.setValue('proposedFixValidationMessage', validationMessage);

            // Append validation message to the response message
            if (validationMessage) {
                 responseMessage += `\n\nValidation: ${validationMessage}`;
            }

        } else if (!proposedChanges || proposedChanges.length === 0) {
             console.warn(`[FixCodeHandler:${chatId}] No proposed changes available for validation.`);
             // Ensure validation status reflects no changes were validated
             this.context.setValue('proposedFixValidationPassed', false);
             this.context.setValue('proposedFixValidationMessage', "No changes proposed to validate.");
             responseMessage += "\n\nNote: No changes were proposed.";
        } else {
             // Proposal step failed, so validation didn't run
             this.context.setValue('proposedFixValidationPassed', false);
             this.context.setValue('proposedFixValidationMessage', "Validation skipped due to failure in fix proposal step.");
        }


        // Return the final message for the user
        return responseMessage;
    }
}