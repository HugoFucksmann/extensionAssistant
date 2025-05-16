// src/models/prompts/prompt.codeFragmenter.ts

import { BasePromptVariables } from '../../orchestrator';
import { mapContextToBaseVariables } from '../promptSystem';

export interface CodeFragmenterPromptVariables extends BasePromptVariables {
    fileContent: string;
    filePath: string;
    languageId?: string;
    query?: string; // The specific thing to fragment (e.g., function name, concept)
    objective?: string; // The user's overall objective
}

export const codeFragmenterPrompt = `
You are an AI assistant specialized in extracting relevant code fragments. Your task is to read the provided code file and extract the most relevant code snippets based on the user's objective or a specific query.

File Path: {{filePath}}
Language: {{languageId}}

User Objective: "{{objective}}"
Specific Query/Entity: "{{query}}"

Code Content:
\`\`\`{{languageId}}
{{fileContent}}
\`\`\`

Instructions:
- Analyze the "Code Content" in relation to the "User Objective" and "Specific Query/Entity".
- Identify the smallest possible code snippets (functions, classes, blocks) that are directly relevant.
- Provide the extracted snippets, clearly indicating which part of the file they come from (e.g., function name, line numbers).
- If no relevant fragments are found, state so.
- Respond in English.

Your response must be a JSON object with this structure:
{
  "messageToUser": string, // A brief message about the findings
  "fragments": Array<{
    "filePath": string,
    "name"?: string, // Name of the fragment (e.g., function name)
    "snippet": string, // The actual code snippet
    "reason": string // Why this fragment is relevant
  }>,
  "error"?: string
}
`;

export function buildCodeFragmenterVariables(contextData: Record<string, any>): CodeFragmenterPromptVariables {
    const baseVariables = mapContextToBaseVariables(contextData);

    const fragmenterVariables: CodeFragmenterPromptVariables = {
        ...baseVariables,
        fileContent: contextData.fileContent || '', // Expect file content
        filePath: contextData.filePath || 'unknown', // Expect file path
        languageId: contextData.languageId, // Expect language ID
        query: contextData.query || contextData.objective, // Use specific query or overall objective
        objective: contextData.objective // Pass objective explicitly
    };

    return fragmenterVariables;
}