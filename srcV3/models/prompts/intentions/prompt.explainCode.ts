// src/models/prompts/intentions/prompt.explainCode.ts

import { BasePromptVariables } from '../../../orchestrator/execution/types';
import { mapContextToBaseVariables } from '../../promptSystem';

export interface ExplainCodePromptVariables extends BasePromptVariables {
    // Add variables for analyzed file insights and fragments
    analyzedFileInsights?: any;
    fileFragments?: any;
}

export const explainCodePrompt = `
Eres un asistente experto en explicar código. Tu tarea es proporcionar una explicación clara y concisa del código relevante basado en el objetivo del usuario y el contexto proporcionado, incluyendo análisis pre-procesados.

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

Código relevante (si se cargó directamente en el FlowContext):
{{activeEditorContent}}
{{fileContent:.*}}

Análisis de Archivos Relevantes (pre-procesado por agente):
{{analyzedFileInsights}}

Fragmentos de Código Relevantes (pre-procesado por agente):
{{fileFragments}}


Instrucciones:
- Explica el código en relación con el objetivo del usuario.
- Utiliza la información de "Análisis de Archivos Relevantes" y "Fragmentos de Código Relevantes" si está disponible.
- Sé conciso pero completo.
- Usa ejemplos si es útil.
- Si no hay código relevante o no puedes entenderlo, indícalo.
- Responde en español.

Salida:
{
  "explanation": string,
  "relevantCodeSnippet"?: string, // Maybe reference fragments by name/path instead
  "error"?: string
}
`;

export function buildExplainCodeVariables(contextData: Record<string, any>): ExplainCodePromptVariables {
    const baseVariables = mapContextToBaseVariables(contextData);

    const explainCodeVariables: ExplainCodePromptVariables = {
        ...baseVariables,
        // Include analyzed file data from context
        analyzedFileInsights: contextData.analyzedFileInsights ? JSON.stringify(contextData.analyzedFileInsights, null, 2) : 'None available.',
        // Include file fragments from context (assuming they might be stored under a specific key)
        fileFragments: contextData.fileFragments ? JSON.stringify(contextData.fileFragments, null, 2) : 'None available.'
    };

    return explainCodeVariables;
}