// src/models/prompts/intentions/prompt.explainCode.ts

import { BasePromptVariables } from '../../../orchestrator/execution/types';
import { mapContextToBaseVariables } from '../../promptSystem'; // Import the helper

// Define variables specific to the explainCode prompt
export interface ExplainCodePromptVariables extends BasePromptVariables {
  // BasePromptVariables already includes: userMessage, chatHistory, objective, extractedEntities, projectContext, activeEditorContent, fileContent:*, searchResults:*
  // No additional specific variables needed for this template based on current structure.
  // The template uses keys directly from BasePromptVariables.
}

export const explainCodePrompt = `
Eres un asistente experto en explicar código. Tu tarea es proporcionar una explicación clara y concisa del código relevante basado en el objetivo del usuario y el contexto proporcionado.

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
{{fileContent:.*}} // Placeholder to include all dynamically added file content (fillPromptTemplate handles this regex-like key)

Instrucciones:
- Explica el código en relación con el objetivo del usuario.
- Sé conciso pero completo.
- Usa ejemplos si es útil.
- Si no hay código relevante o no puedes entenderlo, indícalo.
- Responde en español.

Salida:
{
  "explanation": string,
  "relevantCodeSnippet"?: string, // Optional: a snippet from the context that is key to the explanation
  "error"?: string // Optional: if explanation failed
}
`;

// Builder function for ExplainCodePromptVariables
export function buildExplainCodeVariables(contextData: Record<string, any>): ExplainCodePromptVariables {
    // Get base variables using the helper
    const baseVariables = mapContextToBaseVariables(contextData);

    // For explainCode, the variables are exactly the base variables
    const explainCodeVariables: ExplainCodePromptVariables = {
        ...baseVariables,
        // No specific mapping needed beyond BasePromptVariables
    };

    // Clean up undefined values if necessary
    // Object.keys(explainCodeVariables).forEach(key => explainCodeVariables[key] === undefined && delete explainCodeVariables[key]);

    return explainCodeVariables;
}