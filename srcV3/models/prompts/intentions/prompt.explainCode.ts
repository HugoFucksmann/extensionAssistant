// src/models/prompts/intentions/prompt.explainCode.ts
// MODIFIED: Use ChatPromptTemplate

import { ChatPromptTemplate } from "@langchain/core/prompts";
import { BasePromptVariables } from "../../../orchestrator/types";
import { mapContextToBaseVariables } from "../builders/baseVariables";


// Keep interface for variable structure
export interface ExplainCodePromptVariables extends BasePromptVariables {} // No specific vars beyond base

// Define the prompt template using LangChain
export const explainCodePrompt = ChatPromptTemplate.fromMessages([
    ["system", `Eres un asistente experto en explicar código. Tu tarea es proporcionar una explicación clara y concisa del código relevante basado en el objetivo del usuario y el contexto proporcionado. Responde en español.

    Objetivo del usuario:
    "{{objective}}"

    Mensaje original del usuario:
    "{{userMessage}}"

    Historial reciente:
    {{chatHistory}}

    Entidades clave extraídas:
    {{extractedEntities}}

    Contexto del proyecto:
    {{projectContext}}

    Código relevante:
    {{activeEditorContent}}
    {{fileContent:.*}}

    Instrucciones:
    - Explica el código en relación con el objetivo del usuario.
    - Sé conciso pero completo.
    - Usa ejemplos si es útil.
    - Si no hay código relevante o no puedes entenderlo, indícalo.

    Salida esperada (JSON):
    {
      "explanation": string,
      "relevantCodeSnippet"?: string,
      "error"?: string
    }`],
    ["human", "{{userMessage}}"] // User's actual message
]);

// Keep builder function
export function buildExplainCodeVariables(contextData: Record<string, any>): ExplainCodePromptVariables {
     return mapContextToBaseVariables(contextData); // Base variables are sufficient
}