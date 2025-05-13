// src/orchestrator/handlers/conversationHandler.ts

import { BaseHandler } from './baseHandler';
import { ExecutionStep, StepResult } from '../execution/types';

/**
 * Handler specifically for 'conversation' intent.
 * Focuses on generating a natural language response based on chat history and user input.
 */
export class ConversationHandler extends BaseHandler {
    /**
     * Handles the 'conversation' intent.
     * Orchestrates steps to generate a response from the conversation model.
     * @returns A promise resolving to the generated assistant message.
     */
    async handle(): Promise<string> {
        // Get relevant information from the context (optional here, as the prompt builder will do it)
        // const analysis = this.context.getAnalysisResult();
        // const objective = analysis?.objective || "Respond to the user's message appropriately"; // Default objective if none found
        // const userMessage = this.context.getValue<string>('userMessage');
        // const chatHistory = this.context.getHistoryForModel(20);
        // const projectInfo = this.context.getValue<any>('projectInfo');
        // const referencedFilesContent = this.context.getValue('referencedFilesContent'); // This key is not standard

        console.log(`[ConversationHandler:${this.context.getChatId()}] Handling conversation intent.`); // Objective will be pulled by builder

        // Define the execution step to call the conversation model
        // The 'params' object here is *not* used for passing context variables to the prompt template.
        // The PromptExecutor passes the full context, and the prompt's builder function extracts variables.
        // 'params' could be used for model configuration if needed (e.g., temperature, model override).
        const generateResponseStep: ExecutionStep = {
            name: 'generateConversationResponse',
            type: 'prompt',
            execute: 'conversationResponder',
            params: {
                // No need to list context variables here anymore.
                // The buildConversationVariables function in prompt.conversation.ts will get them from the full context.
                // Example non-contextual param: temperature: 0.7
            },
            storeAs: 'conversationResponse' // Store the parsed result object
        };

        // Run the defined step using the helper method from BaseHandler
        // The StepExecutor will pass the full resolution context to the PromptExecutor,
        // which passes it to executeModelInteraction, which passes it to buildConversationVariables.
        const stepResult: StepResult = await this.runExecutionStep(generateResponseStep);

        // Check the result of the step execution
        if (stepResult.success && stepResult.result !== undefined) {
            console.log(`[ConversationHandler:${this.context.getChatId()}] Successfully generated conversation response.`);

            // Handle the response object format - extract messageToUser
            // The parseModelResponse for conversationResponder is expected to return the string directly now (based on modelUtils.ts)
            // If it returns an object, handle it as a fallback
            if (typeof stepResult.result === 'string') {
                 return stepResult.result; // Return the string message directly
            } else if (typeof stepResult.result === 'object' && stepResult.result !== null && 'messageToUser' in stepResult.result) {
                console.warn(`[ConversationHandler:${this.context.getChatId()}] Conversation prompt returned object, extracting messageToUser.`);
                return stepResult.result.messageToUser;
            }

            // Fallback if result is unexpected
            console.warn(`[ConversationHandler:${this.context.getChatId()}] Conversation prompt returned unexpected result type:`, typeof stepResult.result, stepResult.result);
            return "Successfully ran conversation process, but the model didn't provide a valid message.";

        } else {
            // Handle failure
            console.error(`[ConversationHandler:${this.context.getChatId()}] Failed to generate conversation response:`, stepResult.error);
            return "Sorry, I couldn't generate a response for you right now.";
        }
    }
}