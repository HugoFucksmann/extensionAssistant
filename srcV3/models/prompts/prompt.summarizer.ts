// src/models/prompts/prompt.summarizer.ts

import { BasePromptVariables } from '../../orchestrator';
import { mapContextToBaseVariables } from '../promptSystem';

export interface SummarizerPromptVariables extends BasePromptVariables {
  fullChatHistory: string; // The complete history string
  currentSummary?: string; // Existing summary, if any
}

export const summarizerPrompt = `
You are an AI assistant specialized in summarizing conversation history. Your task is to read the full chat history and provide a concise summary of the key points, decisions, and relevant information discussed so far.

Current Conversation Summary (if available):
{{currentSummary}}

Full Chat History:
{{fullChatHistory}}

Instructions:
- Read the "Full Chat History".
- If a "Current Conversation Summary" is provided, build upon it, updating it with the new information from the history.
- Focus on the user's objectives, key technical details discussed, decisions made, and important outcomes.
- Keep the summary concise and easy to understand.
- The summary should capture the essence of the conversation for future reference.
- Respond with the summary text directly, no JSON needed.

Summary:
`;

export function buildSummarizerVariables(contextData: Record<string, any>): SummarizerPromptVariables {
    const baseVariables = mapContextToBaseVariables(contextData); // Provides chatHistoryString

    const summarizerVariables: SummarizerPromptVariables = {
        ...baseVariables,
        fullChatHistory: baseVariables.chatHistory, // Use the full history provided by base
        currentSummary: contextData.summary // Get existing summary from context if available
    };

    return summarizerVariables;
}