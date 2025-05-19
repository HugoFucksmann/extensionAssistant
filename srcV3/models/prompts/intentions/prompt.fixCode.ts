// src/models/prompts/intentions/prompt.fixCode.ts
// MODIFIED: Use ChatPromptTemplate

import { ChatPromptTemplate } from "@langchain/core/prompts";
import { BasePromptVariables } from "../../../orchestrator/types";
import { mapContextToBaseVariables } from "../builders/baseVariables";


// Keep interface for variable structure
export interface FixCodePromptVariables extends BasePromptVariables {} // No specific vars beyond base

// Define the prompt template using LangChain
export const fixCodePrompt = ChatPromptTemplate.fromMessages([
    ["system", `You are an expert assistant at identifying and proposing solutions for code issues. Your task is to analyze the user's objective, the provided context (code, errors, search results) and propose code changes to solve the problem. Respond in English.

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

    Your response must be a JSON object with this structure:
    {
      "messageToUser": string,
      "proposedChanges": Array<{
        "file": string,
        "changes": string, // This should probably be diff format or explicit edits later
        "reason": string
      }>
    }`],
     ["human", "{{userMessage}}"] // User's actual message
]);

// Keep builder function
export function buildFixCodeVariables(contextData: Record<string, any>): FixCodePromptVariables {
     return mapContextToBaseVariables(contextData); // Base variables are sufficient
}