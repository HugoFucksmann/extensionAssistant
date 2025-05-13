import { BasePromptVariables } from '../../orchestrator';
import { mapContextToBaseVariables } from '../promptSystem';

export interface CodeValidatorPromptVariables extends BasePromptVariables {
    proposedChanges: any[];
    originalCode?: string;
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