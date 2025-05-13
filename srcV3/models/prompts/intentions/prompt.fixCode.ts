// src/models/prompts/intentions/prompt.fixCode.ts

import { BasePromptVariables } from '../../../orchestrator/execution/types';
import { mapContextToBaseVariables } from '../../promptSystem';

export interface FixCodePromptVariables extends BasePromptVariables {}

export const fixCodePrompt = `
You are an expert assistant at identifying and proposing solutions for code issues. Your task is to analyze the user's objective, the provided context (code, errors, search results) and propose code changes to solve the problem.

User objective:
"{{objective}}"

Original user message:
"{{userMessage}}"

Recent history:
{{chatHistory}}

Key extracted entities:
{{extractedEntities}}

Project context:
{{projectContext}}

Relevant code:
{{activeEditorContent}}
{{fileContent:.*}}

Search results (if applicable):
{{searchResults:.*}}

Instructions:
- Analyze the code in relation to the user's objective
- Identify any potential issues or bugs
- Propose specific code changes to fix the issues
- Explain your reasoning for each proposed change
- If you can't identify the problem or propose a solution, clearly state so
- Respond in English

Your response must be a JSON object with this structure:
{
  "messageToUser": string,
  "proposedChanges": Array<{
    "file": string,
    "changes": string,
    "reason": string
  }>
}
`;

export function buildFixCodeVariables(contextData: Record<string, any>): FixCodePromptVariables {
    const baseVariables = mapContextToBaseVariables(contextData);

    const fixCodeVariables: FixCodePromptVariables = {
        ...baseVariables
    };

    return fixCodeVariables;
}