// src/models/prompts/prompt.codeValidator.ts
// MODIFIED: Use ChatPromptTemplate

import { ChatPromptTemplate } from "@langchain/core/prompts";
import { BasePromptVariables } from '../../orchestrator';
import { mapContextToBaseVariables } from "./builders/baseVariables";

// Keep interface for variable structure
export interface CodeValidatorPromptVariables extends BasePromptVariables {
    proposedChanges: any; // This will likely be a JSON object/array from a previous step
    originalCode?: string; // Content of the active editor or referenced file
    // Add context variables from fileContent:.*, searchResults:.* if needed
}

// Define the prompt template using LangChain
export const codeValidatorPrompt = ChatPromptTemplate.fromMessages([
     ["system", `You are an expert assistant at validating code changes. Your task is to analyze the proposed changes in the context of the original code and user objective, and provide validation feedback. Respond in English.

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

    Your response must be a JSON object with this structure:
    {
      "isValid": boolean,
      "feedback": string,
      "error"?: string
    }`],
    ["human", "Validate the proposed code changes based on the objective and context."] // Simple human part
]);

// Keep builder function
export function buildCodeValidatorVariables(contextData: Record<string, any>): CodeValidatorPromptVariables {
     const baseVariables = mapContextToBaseVariables(contextData);

     const validatorVariables: CodeValidatorPromptVariables = {
         ...baseVariables,
         proposedChanges: contextData.proposedChanges || {}, // Assuming proposedChanges is stored in flow state
         originalCode: contextData.activeEditorContent, // Assuming activeEditorContent is stored
         // Dynamic variables like fileContent:.* and searchResults:.* are handled by mapContextToBaseVariables
     };

     return validatorVariables;
}