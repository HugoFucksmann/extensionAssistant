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
        // Get relevant information from the context
        const analysis = this.context.getAnalysisResult();
        const objective = analysis?.objective; // Get the objective from analysis
        const userMessage = this.context.getValue<string>('userMessage');
        const chatHistory = this.context.getHistoryForModel(20);
        const projectInfo = this.context.getValue<any>('projectInfo');
        const referencedFilesContent = this.context.getValue('referencedFilesContent');

        console.log(`[ConversationHandler:${this.context.getChatId()}] Handling conversation intent. Objective: ${objective}`);

        // Define the execution step to call the conversation model
        const generateResponseStep: ExecutionStep = {
            name: 'generateConversationResponse',
            type: 'prompt',
            execute: 'conversationResponder',
            params: {
                objective: objective,
                userMessage: userMessage,
                chatHistory: chatHistory,
                extractedEntities: analysis?.extractedEntities,
                projectContext: projectInfo,
                referencedFilesContent: referencedFilesContent,
            },
            storeAs: 'conversationResponse'
        };

        // Run the defined step using the helper method from BaseHandler
        const stepResult: StepResult = await this.runExecutionStep(generateResponseStep);

        // Check the result of the step execution
        if (stepResult.success && stepResult.result !== undefined) {
            console.log(`[ConversationHandler:${this.context.getChatId()}] Successfully generated conversation response.`);
            
            // Handle the response object format - extract messageToUser
            if (typeof stepResult.result === 'object' && stepResult.result !== null) {
                if ('messageToUser' in stepResult.result) {
                    return stepResult.result.messageToUser;
                }
                // If format is unexpected but we have a result, try to convert it to string
                return JSON.stringify(stepResult.result);
            }
            
            // If it's already a string, return it directly
            return String(stepResult.result);
        } else {
            // Handle failure
            console.error(`[ConversationHandler:${this.context.getChatId()}] Failed to generate conversation response:`, stepResult.error);
            return "Sorry, I couldn't generate a response for you right now.";
        }
    }
}