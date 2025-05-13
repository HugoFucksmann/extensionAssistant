import { BasePromptVariables } from '../../orchestrator';
import { mapContextToBaseVariables } from '../promptSystem';

export interface CodeValidatorPromptVariables extends BasePromptVariables {
    proposedChanges: any[];
    originalCode?: string;
}

export const codeValidatorPrompt = `
You are an expert assistant at validating code changes. Your task is to analyze the proposed changes in the context of the original code and user objective, and provide validation feedback.

Original user objective:
"{{objective}}"

Original user message:
"{{userMessage}}"

Original code:
{{activeEditorContent}}
{{fileContent:.*}}

Proposed changes:
{{proposedChanges}}

Additional context:
{{searchResults:.*}}

Instructions:
- Analyze the "proposed changes" in the context of the "original user objective" and "original relevant code" and "additional context".
- Evaluate whether the proposed changes are logically correct and likely to solve the problem.
- Consider potential side effects or errors introduced by the proposal.
- Provide clear feedback about the validation.
- Indicate whether the proposal appears valid or not.
- Respond in English.

Your response must be a JSON object with this structure:
{
  "isValid": boolean,
  "feedback": string,
  "error"?: string
}
`;

export function buildCodeValidatorVariables(contextData: Record<string, any>): CodeValidatorPromptVariables {
    const baseVariables = mapContextToBaseVariables(contextData);

    const validatorVariables: CodeValidatorPromptVariables = {
        ...baseVariables,
        proposedChanges: contextData.proposedChanges || [],
        originalCode: contextData.activeEditorContent
    };

    return validatorVariables;
}