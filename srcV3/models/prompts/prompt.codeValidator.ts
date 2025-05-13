import { BasePromptVariables } from '../../orchestrator';
import { mapContextToBaseVariables } from '../promptSystem';


// Define variables specific to the codeValidator prompt
export interface CodeValidatorPromptVariables extends BasePromptVariables {
    // BasePromptVariables already includes: userMessage, chatHistory, objective, extractedEntities, projectContext, activeEditorContent, fileContent:*, searchResults:*
    // This prompt needs the proposed changes and potentially the original code/context for validation.
    proposedChanges: any[]; // The structure of proposed changes from the fix prompt
    originalCode?: string; // The original code content that was intended to be fixed
    // Any other context needed for validation (e.g., relevant file contents) is already in BasePromptVariables dynamic keys
}

export const codeValidatorPrompt = `
Eres un asistente experto en validar propuestas de cambios de código. Tu tarea es revisar una propuesta de solución para un problema de código, evaluar si es probable que funcione y proporcionar feedback.

Objetivo original del usuario:
"{{objective}}"

Propuesta de cambios a validar:
{{proposedChanges}}

Código original relevante (si aplica):
{{originalCode}}

Contexto adicional:
{{activeEditorContent}}
{{fileContent:.*}}
{{searchResults:.*}}

Instrucciones:
- Analiza la "propuesta de cambios" en el contexto del "objetivo original del usuario" y el "código original relevante" y "contexto adicional".
- Evalúa si la propuesta de cambios es lógicamente correcta y es probable que resuelva el problema.
- Considera posibles efectos secundarios o errores introducidos por la propuesta.
- Proporciona feedback claro sobre la validación.
- Indica si la propuesta parece válida o no.
- Responde en español.

Salida (JSON):
{
  "isValid": boolean, // true if the proposal seems valid, false otherwise
  "feedback": string, // Explanation of the validation result (why it's valid/invalid)
  "error"?: string // Optional: if validation process failed internally
}
`;

// Builder function for CodeValidatorPromptVariables
export function buildCodeValidatorVariables(contextData: Record<string, any>): CodeValidatorPromptVariables {
    // Get base variables using the helper
    const baseVariables = mapContextToBaseVariables(contextData);

    // Map base variables and specific context data to CodeValidatorPromptVariables structure
    const validatorVariables: CodeValidatorPromptVariables = {
        ...baseVariables, // Include all base variables
        proposedChanges: contextData.proposedChanges || [], // Assuming proposedChanges is stored in context
        originalCode: contextData.activeEditorContent, // Use the standard activeEditorContent key
    };

    // Clean up undefined values if necessary
    // Object.keys(validatorVariables).forEach(key => validatorVariables[key] === undefined && delete validatorVariables[key]);

    return validatorVariables;
}