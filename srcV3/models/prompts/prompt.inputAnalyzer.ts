
import { BasePromptVariables } from '../../orchestrator';
import { mapContextToBaseVariables } from '../promptSystem'; // Import the helper

// Define variables specific to the inputAnalyzer prompt
export interface InputAnalyzerPromptVariables extends BasePromptVariables {
  // BasePromptVariables already includes: userMessage, chatHistory, objective, extractedEntities, projectContext, fileContent:*, searchResults:*
  // This prompt template uses 'userPrompt' instead of 'userMessage'. We'll map it in the builder.
  userPrompt: string; // Alias for userMessage
  referencedFiles: string[]; // Files mentioned by the user (from initial input) - This key is specific to the initial context
}

export const inputAnalyzerPrompt = `
Eres un asistente especializado en análisis de solicitudes. Tu tarea es analizar el prompt del usuario y los metadatos proporcionados para determinar cual es la intencion del usuario y recopilar informacion.

CONTEXTO:
- Prompt del usuario: "{{userPrompt}}"
- Archivos referenciados: {{referencedFiles}}
- Contexto actual del proyecto: {{projectContext}}
- Historial reciente: {{chatHistory}}

INSTRUCCIONES ADICIONALES:
- Las claves dentro de "extractedEntities" deben ser arrays de strings.
- Cada string debe ser una única palabra (sin espacios).
- La intención debe ser una de: "conversation", "explainCode", "fixCode", "unknown".
- La confianza debe ser un número entre 0 y 1.

Tu respuesta debe ser un objeto JSON con la siguiente estructura:
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
  // Optional: add error field if analysis fails internally
  "error"?: string
}
`;

// Builder function for InputAnalyzerPromptVariables
export function buildInputAnalyzerVariables(contextData: Record<string, any>): InputAnalyzerPromptVariables {
    // Get base variables using the helper
    const baseVariables = mapContextToBaseVariables(contextData);

    // Map base variables and context data to InputAnalyzerPromptVariables structure
    const analyzerVariables: InputAnalyzerPromptVariables = {
        ...baseVariables, // Include all base variables
        userPrompt: baseVariables.userMessage, // Map userMessage to userPrompt
        referencedFiles: contextData.referencedFiles || [], // This comes directly from the initial context, not mapped by the base helper
    };

    // Clean up undefined values if necessary
    // Object.keys(analyzerVariables).forEach(key => analyzerVariables[key] === undefined && delete analyzerVariables[key]);

    return analyzerVariables;
}