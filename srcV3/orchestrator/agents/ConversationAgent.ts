// src/orchestrator/agents/ConversationAgent.ts

import { IAgent } from './IAgent';
import { FlowContext } from '../context/flowContext';
import { StepExecutor } from '../execution/stepExecutor';
import { ExecutionStep } from '../execution/types';

/**
 * Agent responsible for handling general conversation intents ('conversation').
 * This agent's primary task is to generate a natural language response
 * based on the conversation history and current context.
 * It typically runs the 'conversationResponder' prompt.
 */
export class ConversationAgent implements IAgent {
    private stepExecutor: StepExecutor;

    constructor(stepExecutor: StepExecutor) {
        this.stepExecutor = stepExecutor;
    }

    async execute(flowContext: FlowContext): Promise<string | any> {
        const chatId = flowContext.getChatId();
        const objective = flowContext.getObjective() || 'General conversation';
        console.log(`[ConversationAgent:${chatId}] Executing for objective: ${objective}`);

        // Step: Run the conversation responder prompt to generate the response.
        const conversationStep: ExecutionStep = {
            name: 'conversationResponderStep',
            type: 'prompt',
            execute: 'conversationResponder', // This prompt generates the response
            params: {}, // conversationResponder prompt uses the full context via buildConversationVariables
            storeAs: 'conversationResponse' // Store the result in FlowContext
        };

        const result = await this.stepExecutor.runStep(conversationStep, flowContext);

        // Determine the final response based on the step result
        if (result.success && result.result !== undefined) { // Check for undefined as result could be null
            console.log(`[ConversationAgent:${chatId}] Conversation prompt succeeded.`);
            // The prompt result is expected to be the final response content
            return result.result;
        } else {
            console.error(`[ConversationAgent:${chatId}] Conversation prompt failed:`, result.error?.message || 'Unknown error');
            // Return an informative error message
            return `Sorry, I couldn't generate a response right now. The conversation prompt failed. ${result.error?.message || ''}`;
        }
    }
}