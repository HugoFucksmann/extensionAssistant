// src/models/prompts/prompt.codeAnalyzer.ts

import { BasePromptVariables } from '../../orchestrator';
import { mapContextToBaseVariables } from '../promptSystem';

export interface CodeAnalyzerPromptVariables extends BasePromptVariables {
    fileContent: string;
    filePath: string;
    languageId?: string;
}

export const codeAnalyzerPrompt = `
You are an AI assistant specialized in analyzing code structure and content. Your task is to read the provided code file and extract key information about its structure, main components, and purpose.

File Path: {{filePath}}
Language: {{languageId}}

Code Content:
\`\`\`{{languageId}}
{{fileContent}}
\`\`\`

Instructions:
- Analyze the provided code content.
- Identify the main purpose of the file.
- List key components like classes, functions, interfaces, main logic blocks, etc.
- Describe the relationships between different parts of the code within this file.
- Note any significant patterns, complex areas, or potential areas of interest.
- Respond in English.

Your response must be a JSON object with this structure:
{
  "purpose": string,
  "components": Array<{ name: string, type: string, description: string }>,
  "relationships": string,
  "notes": string,
  "error"?: string
}
`;

export function buildCodeAnalyzerVariables(contextData: Record<string, any>): CodeAnalyzerPromptVariables {
    const baseVariables = mapContextToBaseVariables(contextData);

    const analyzerVariables: CodeAnalyzerPromptVariables = {
        ...baseVariables,
        fileContent: contextData.fileContent || '', // Expect file content to be passed in contextData
        filePath: contextData.filePath || 'unknown', // Expect file path
        languageId: contextData.languageId // Expect language ID
    };

    return analyzerVariables;
}