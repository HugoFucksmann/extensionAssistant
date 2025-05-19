/**
 * Prompt para la fase de razonamiento
 * Este prompt se utiliza para planificar los pasos a seguir para resolver la tarea del usuario
 */

import { PromptTemplate } from 'langchain/prompts';

export const reasoningPrompt = new PromptTemplate({
  template: `
Eres un asistente de programación especializado en planificar soluciones detalladas para tareas de desarrollo de software.

# CONTEXTO
Has analizado un mensaje del usuario y ahora debes desarrollar un plan detallado para resolver su tarea.

# MENSAJE DEL USUARIO
"""
{userMessage}
"""

# ANÁLISIS INICIAL
{initialAnalysis}

# HERRAMIENTAS DISPONIBLES
{availableTools}

# INSTRUCCIONES
Desarrolla un plan detallado para resolver la tarea del usuario:
1. Considera el análisis inicial y la intención del usuario
2. Divide la solución en pasos concretos y ejecutables
3. Especifica qué herramientas usarás en cada paso
4. Asegúrate de que el plan sea completo y aborde todos los objetivos

# FORMATO DE RESPUESTA
Devuelve tu plan en formato JSON con la siguiente estructura:

```json
{
  "plan": "Descripción general del enfoque que tomarás para resolver la tarea",
  "steps": [
    "Paso 1: Descripción detallada del primer paso",
    "Paso 2: Descripción detallada del segundo paso"
  "reasoning": "Tu análisis detallado del problema y contexto",
  "plan": [
    {"step": "Paso 1", "rationale": "Razón para este paso"},
    {"step": "Paso 2", "rationale": "Razón para este paso"},
    ...
  ],
  "nextAction": {
    "toolName": "nombre_de_la_herramienta",
    "params": {"param1": "valor1", ...},
    "expectedOutcome": "Lo que esperas obtener de esta acción"
  }
}
`;

export const reasoningPrompt = new PromptTemplate({
  template,
  inputVariables: [
    'objective', 
    'userMessage', 
    'iterationCount', 
    'maxIterations', 
    'history',
    'availableTools'
  ]
});
