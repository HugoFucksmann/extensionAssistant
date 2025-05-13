import { BasePromptVariables } from '../../orchestrator';
import { mapContextToBaseVariables } from '../promptSystem';

export interface InputAnalyzerPromptVariables extends BasePromptVariables {
  userPrompt: string;
  referencedFiles: string[];
}

export const inputAnalyzerPrompt = `
You are an assistant specialized in request analysis. Your task is to analyze the user's prompt and provided metadata to determine the user's intent and gather relevant information.

CONTEXT:
- User prompt: "{{userPrompt}}"
- Referenced files: {{referencedFiles}}
- Project context: {{projectContext}}
- Recent history: {{chatHistory}}

ADDITIONAL INSTRUCTIONS:
- Keys within "extractedEntities" must be arrays of strings.
- Each string should be a single word (no spaces).
- Intent must be one of: "conversation", "explainCode", "fixCode", "unknown".
- Confidence should be a number between 0 and 1.

Your response must be a JSON object with this structure:
{
  "intent": "conversation" | "explainCode" | "fixCode" | "unknown",
  "objective": string,
  "extractedEntities": {
    "filesMentioned": string[],
    "functionsMentioned": string[],
    "errorsMentioned": string[],
    "customKeywords": string[]
  },
  "confidence": number,
  "error"?: string
}
`;

export function buildInputAnalyzerVariables(contextData: Record<string, any>): InputAnalyzerPromptVariables {
    const baseVariables = mapContextToBaseVariables(contextData);

    const analyzerVariables: InputAnalyzerPromptVariables = {
        ...baseVariables,
        userPrompt: baseVariables.userMessage,
        referencedFiles: contextData.referencedFiles || []
    };

    return analyzerVariables;
}