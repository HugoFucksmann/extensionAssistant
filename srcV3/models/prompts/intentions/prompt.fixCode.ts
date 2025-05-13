// src/models/prompts/intentions/prompt.fixCode.ts

import { BasePromptVariables } from '../../../orchestrator/execution/types';
import { mapContextToBaseVariables } from '../../promptSystem'; // Import the helper

// Define variables specific to the fixCode prompt
export interface FixCodePromptVariables extends BasePromptVariables {
  // BasePromptVariables already includes: userMessage, chatHistory, objective, extractedEntities, projectContext, activeEditorContent, fileContent:*, searchResults:*
  // No additional specific variables needed for this template based on current structure.
  // The template uses keys directly from BasePromptVariables.
}

export const fixCodePrompt = `
Eres un asistente experto en identificar y proponer soluciones a problemas de código. Tu tarea es analizar el objetivo del usuario, el contexto proporcionado (código, errores, resultados de búsqueda) y proponer cambios de código para resolver el problema.

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
{{fileContent:.*}} // Placeholder to include all dynamically added file content

Resultados de búsqueda (si aplica):
{{searchResults:.*}} // Placeholder to include all dynamically added search results

Instrucciones:
- Identifica la causa raíz del problema basado en el objetivo y el contexto.
- Propón cambios de código específicos para resolver el problema.
- Los cambios deben estar en un formato que pueda ser aplicado (por ejemplo, diff, o una estructura de cambios clara).
- Proporciona un mensaje al usuario explicando el problema y la solución propuesta.
- Si no puedes identificar el problema o proponer una solución, indícalo claramente.
- Responde en español.

Salida (JSON):
{
  "messageToUser": string, // Mensaje explicativo para el usuario
  "proposedChanges": Array<{ // Estructura de cambios propuesta (ejemplo básico, adaptar según herramienta de aplicación)
    "filePath": string,
    "patch": string // Formato diff o similar
    // O alternativamente: "startLine": number, "endLine": number, "newContent": string
  }> | [],
  "diagnosis"?: string, // Optional: detailed explanation of the problem found
  "error"?: string // Optional: if fix proposal failed
}
`;

// Builder function for FixCodePromptVariables
export function buildFixCodeVariables(contextData: Record<string, any>): FixCodePromptVariables {
    // Get base variables using the helper
    const baseVariables = mapContextToBaseVariables(contextData);

    // For fixCode, the variables are exactly the base variables
    const fixCodeVariables: FixCodePromptVariables = {
        ...baseVariables,
        // No specific mapping needed beyond BasePromptVariables
    };

    // Clean up undefined values if necessary
    // Object.keys(fixCodeVariables).forEach(key => fixCodeVariables[key] === undefined && delete fixCodeVariables[key]);

    return fixCodeVariables;
}