// src/models/prompts/intentions/prompt.fixCode.ts

import { BasePromptVariables } from '../../../orchestrator/execution/types';
import { mapContextToBaseVariables } from '../../promptSystem';

export interface FixCodePromptVariables extends BasePromptVariables {
    // Add variables for analyzed file insights and fragments
    analyzedFileInsights?: any;
    fileFragments?: any;
}

export const fixCodePrompt = `
You are an expert assistant at identifying and proposing solutions for code issues. Your task is to analyze the user's objective, the provided context (code, errors, search results, **analyzed insights**) and propose code changes to solve the problem.

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

Relevant code (if loaded directly):
{{activeEditorContent}}
{{fileContent:.*}}

Search results (if applicable):
{{searchResults:.*}}

Análisis de Archivos Relevantes (pre-procesado por agente):
{{analyzedFileInsights}}

Fragmentos de Código Relevantes (pre-procesado por agente):
{{fileFragments}}

Instructions:
- Analyze the code and context in relation to the user's objective.
- Utilize the "Análisis de Archivos Relevantes" and "Fragmentos de Código Relevantes" if available.
- Identify any potential issues or bugs.
- Propose specific code changes to fix the issues.
- Explain your reasoning for each proposed change.
- If you can't identify the problem or propose a solution, clearly state so.
- Respond in English.

Your response must be a JSON object with this structure:
{
  "messageToUser": string,
  "proposedChanges": Array<{
    "file": string,
    "changes": string, // Use diff format or clear instructions? Diff format is harder for models.
    "reason": string
  }>,
  "error"?: string
}
`;

export function buildFixCodeVariables(contextData: Record<string, any>): FixCodePromptVariables {
    const baseVariables = mapContextToBaseVariables(contextData);

    const fixCodeVariables: FixCodePromptVariables = {
        ...baseVariables,
        // Include analyzed file data from context
        analyzedFileInsights: contextData.analyzedFileInsights ? JSON.stringify(contextData.analyzedFileInsights, null, 2) : 'None available.',
        // Include file fragments from context
        fileFragments: contextData.fileFragments ? JSON.stringify(contextData.fileFragments, null, 2) : 'None available.'
    };

    return fixCodeVariables;
}