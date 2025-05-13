// src/models/prompts/intentions/prompt.explainCode.ts

import { BasePromptVariables } from '../../../orchestrator/execution/types';
import { mapContextToBaseVariables } from '../../promptSystem';

export interface ExplainCodePromptVariables extends BasePromptVariables {}

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
{{fileContent:.*}}

Instrucciones:
- Explica el código en relación con el objetivo del usuario.
- Sé conciso pero completo.
- Usa ejemplos si es útil.
- Si no hay código relevante o no puedes entenderlo, indícalo.
- Responde en español.

Salida:
{
  "explanation": string,
  "relevantCodeSnippet"?: string,
  "error"?: string
}
`;

export function buildExplainCodeVariables(contextData: Record<string, any>): ExplainCodePromptVariables {
    const baseVariables = mapContextToBaseVariables(contextData);

    const explainCodeVariables: ExplainCodePromptVariables = {
        ...baseVariables
    };

    return explainCodeVariables;
}