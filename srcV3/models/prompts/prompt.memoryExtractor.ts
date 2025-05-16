// src/models/prompts/prompt.memoryExtractor.ts

import { BasePromptVariables } from '../../orchestrator';
import { mapContextToBaseVariables } from '../promptSystem';

export interface MemoryExtractorPromptVariables extends BasePromptVariables {
    conversationSummary: string;
    analyzedFileInsights?: any;
    planningHistory?: any;
    // Add other relevant context data fields here
}

export const memoryExtractorPrompt = `
You are an AI assistant specialized in identifying key information to store in long-term memory. Your task is to analyze the provided context, including the conversation summary, file insights, and planning history, and extract important decisions, conventions, key entities, or useful code snippets that should be remembered for future interactions related to this project.

Conversation Summary:
{{conversationSummary}}

Analyzed File Insights:
{{analyzedFileInsights}}

Planning History for this turn:
{{planningHistory}}

User Objective: "{{objective}}"
User Message: "{{userMessage}}"

Instructions:
- Read the provided context carefully.
- Identify information that represents:
    - Key decisions made or agreed upon.
    - Project-specific conventions or patterns.
    - Important entities (specific function names, class names, error codes, config values).
    - Useful code snippets or solutions that might be referenced again.
    - Successful tool usages or planning strategies that worked well.
- Do NOT include trivial conversation points or information that is easily retrieved (like basic file content).
- For code snippets, reference the file path and provide the snippet.
- For decisions or conventions, summarize them concisely.
- For entities, list them with brief context.
- Respond in English.

Your response must be a JSON object representing an array of memory items to potentially store. Each item should have the following structure:
Array<
  {
    "type": "decision" | "convention" | "key_entity" | "code_snippet" | "tool_insight" | string,
    "keyName": string, // A concise, unique identifier (e.g., "auth-decision", "naming-convention-js", "function-handleRequest", "error-0x1A")
    "content": any, // The actual data (string for decision/convention, object for key_entity/code_snippet/tool_insight)
    "reason": string // Why this is important to remember
  }
>

Example:
[
  {
    "type": "decision",
    "keyName": "auth-flow",
    "content": "Decided to use OAuth2 with PKCE flow for mobile client.",
    "reason": "Important architectural decision for authentication."
  },
  {
    "type": "key_entity",
    "keyName": "function-handleRequest",
    "content": { "name": "handleRequest", "file": "src/server/api.ts", "description": "Main entry point for API requests." },
    "reason": "Core function identified in analysis."
  },
  {
    "type": "code_snippet",
    "keyName": "snippet-date-formatting",
    "content": { "file": "src/utils/date.ts", "snippet": "function formatISODate(date) { ... }", "description": "Helper function for date formatting." },
    "reason": "Useful utility function found during file analysis."
  }
]

Now, extract memory items from the context:
`;

export function buildMemoryExtractorVariables(contextData: Record<string, any>): MemoryExtractorPromptVariables {
    const baseVariables = mapContextToBaseVariables(contextData);

    const memoryExtractorVariables: MemoryExtractorPromptVariables = {
        ...baseVariables,
        conversationSummary: contextData.summary || 'No summary available.',
        analyzedFileInsights: contextData.analyzedFileInsights ? JSON.stringify(contextData.analyzedFileInsights, null, 2) : 'None available.',
        planningHistory: contextData.planningHistory ? JSON.stringify(contextData.planningHistory, null, 2) : 'None available.'
        // Add other relevant context data fields as needed
    };

    return memoryExtractorVariables;
}