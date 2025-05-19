/**
 * Prompt para la fase de corrección del ciclo ReAct
 * Corrige el plan cuando la reflexión determina que es necesario
 */

import { PromptTemplate } from 'langchain/prompts';

export const correctionPrompt = new PromptTemplate({
  template: `
Eres un asistente de programación especializado en corregir planes y estrategias cuando se encuentran problemas.

# CONTEXTO
Una acción ha fallado o no ha producido el resultado esperado. Necesitas analizar el problema y corregir el plan.

# MENSAJE DEL USUARIO
"""
{userMessage}
"""

# ANÁLISIS INICIAL
{initialAnalysis}

# PLAN ORIGINAL
{reasoning}

# ACCIÓN EJECUTADA QUE FALLÓ
{action}

# RESULTADO DE LA ACCIÓN
{actionResult}

# REFLEXIÓN SOBRE EL FALLO
{reflection}

# INSTRUCCIONES
Corrige el plan para abordar el problema detectado:
1. Identifica la causa raíz del fallo
2. Propón una solución específica
3. Actualiza el plan original con los cambios necesarios
4. Define la siguiente acción a ejecutar

# FORMATO DE RESPUESTA
Devuelve tu corrección en formato JSON con la siguiente estructura:

```json
{
  "rootCause": "Análisis detallado de la causa raíz del problema",
  "solution": "Descripción clara de la solución propuesta",
  "updatedPlan": [
    "Paso 1: Descripción del paso (nuevo o modificado)",
    "Paso 2: Descripción del paso (nuevo o modificado)"
  ],
  "nextAction": {
    "toolName": "nombre_de_la_herramienta",
    "params": {
      "param1": "valor1",
      "param2": "valor2"
    },
    "expectedOutcome": "Lo que esperas obtener de esta acción"
  }
}
```

Asegúrate de que tu solución aborde directamente la causa raíz del problema y que la siguiente acción sea específica y ejecutable.
`,
  inputVariables: [
    'userMessage',
    'initialAnalysis',
    'reasoning',
    'action',
    'actionResult',
    'reflection'
  ]
});
