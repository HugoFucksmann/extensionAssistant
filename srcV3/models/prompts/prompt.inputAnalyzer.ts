// src/models/prompts/prompt.inputAnalyzer.ts
// MODIFIED: Use ChatPromptTemplate

import { ChatPromptTemplate } from "@langchain/core/prompts"; // Import ChatPromptTemplate
import { BasePromptVariables } from '../../orchestrator'; // Keep types
import { mapContextToBaseVariables } from "./builders/baseVariables";


// Keep interface for variable structure
export interface InputAnalyzerPromptVariables extends BasePromptVariables {
  userPrompt: string; // Redundant with userMessage but explicit for this prompt
  referencedFiles: string[];
}

// Define the prompt template using LangChain
export const inputAnalyzerPrompt = ChatPromptTemplate.fromMessages([
    ["system", `You are an assistant specialized in request analysis. Your task is to analyze the user's prompt and provided metadata to determine the user's intent and gather relevant information. Respond in English.

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
    }`],
    ["human", "{{userPrompt}}"] // User's actual message is the human part
]);

// Keep builder function for now, will be used by PromptService
export function buildInputAnalyzerVariables(contextData: Record<string, any>): InputAnalyzerPromptVariables {
     const baseVariables = mapContextToBaseVariables(contextData); // Use helper for base variables

     const analyzerVariables: InputAnalyzerPromptVariables = {
         ...baseVariables,
         userPrompt: baseVariables.userMessage, // Map userMessage to userPrompt for this template
         referencedFiles: contextData.referencedFiles || [],
     };

     return analyzerVariables;
}