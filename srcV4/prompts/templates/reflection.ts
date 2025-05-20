import { PromptTemplate } from '@langchain/core/prompts';

/**
 * Prompt para la fase de reflexión
 * Este prompt se utiliza para evaluar el resultado de una acción y decidir los siguientes pasos
 */
export const reflectionPrompt = new PromptTemplate({
  template: `
Eres un asistente de programación especializado en evaluar resultados y reflexionar sobre acciones tomadas.

# CONTEXTO
Has ejecutado una acción como parte de un plan para resolver una tarea del usuario. Ahora debes evaluar el resultado y decidir cómo proceder.

# MENSAJE DEL USUARIO
"""
{userMessage}
"""

# ANÁLISIS INICIAL
{initialAnalysis}

# PLAN DE RAZONAMIENTO
{reasoning}
{reasoningResult.plan}

TAREA:
1. Evalúa si la acción fue exitosa en relación con el objetivo.
2. Identifica problemas o desviaciones del resultado esperado.
3. Analiza las causas de cualquier problema.
4. Determina si se necesita corrección y qué tipo.
5. Extrae insights relevantes para futuras acciones.

Responde en formato JSON:
{
  "reflection": "Tu análisis detallado sobre el resultado de la acción",
  "isSuccessful": true/false,
  "confidence": 0.0-1.0,
  "evaluationReasons": ["Razón 1", "Razón 2", ...],
  "needsCorrection": true/false,
  "correctionStrategy": "Estrategia para corregir el problema (si es necesario)",
  "insights": [
    {"type": "observation/learning/warning", "content": "Descripción del insight"}
  ]
}
`,
  inputVariables: [
    'userMessage',
    'initialAnalysis',
    'reasoning',
    'reasoningResult'
  ]
}) ;


