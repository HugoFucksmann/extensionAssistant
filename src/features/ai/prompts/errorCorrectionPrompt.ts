// src/features/ai/prompts/errorCorrectionPrompt.ts
import { z } from 'zod';
import { ChatPromptTemplate } from "@langchain/core/prompts";

// 1. Definimos el esquema de salida con Zod para una respuesta estructurada y fiable.
export const errorCorrectionSchema = z.object({
    thought: z.string().describe("Un análisis detallado del error, considerando la tarea que falló y el objetivo general. Explica por qué se elige una acción correctiva específica."),
    decision: z.enum(['retry', 'modify_plan', 'continue']).describe("La acción a tomar: 'retry' para reintentar la misma tarea (quizás con parámetros diferentes si el plan se ajusta), 'modify_plan' para descartar el plan actual y proponer uno nuevo, o 'continue' si el error no es crítico y se puede seguir con la siguiente tarea del plan existente."),
    newPlan: z.array(z.string()).optional().describe("Una lista de nuevas tareas de alto nivel. Solo es obligatorio si la decisión es 'modify_plan'.")
}).refine(data => {
    // Si la decisión es modificar el plan, el nuevo plan debe existir y no estar vacío.
    if (data.decision === 'modify_plan') {
        return Array.isArray(data.newPlan) && data.newPlan.length > 0;
    }
    return true;
}, {
    message: "El campo 'newPlan' es obligatorio y no puede estar vacío cuando la decisión es 'modify_plan'.",
    path: ['newPlan'],
});

export type ErrorCorrectionDecision = z.infer<typeof errorCorrectionSchema>;

// 2. Creamos el prompt que guiará al LLM.
export const errorCorrectionPromptLC = ChatPromptTemplate.fromMessages([
    ["system", `Eres un asistente de IA experto en depuración y auto-corrección. Tu tarea es analizar un error que ha ocurrido durante la ejecución de un plan y decidir la mejor estrategia para recuperarse.

INSTRUCCIONES:
1.  Analiza la 'Consulta Original del Usuario' para entender el objetivo final.
2.  Revisa el 'Plan Actual' y la 'Tarea Específica que Falló'.
3.  Examina los 'Detalles del Error' para diagnosticar la causa raíz (p. ej., archivo no encontrado, parámetros inválidos, error de API, etc.).
4.  Basado en tu análisis, elige una de las siguientes decisiones:
    -   **retry**: Si el error parece transitorio o podría solucionarse con un pequeño ajuste que el planificador pueda hacer en el siguiente paso (p. ej., corregir un nombre de archivo).
    -   **modify_plan**: Si el enfoque actual es fundamentalmente incorrecto y se necesita una nueva estrategia. DEBES proporcionar un 'newPlan' completamente nuevo.
    -   **continue**: Si el error es menor y no impide continuar con la siguiente tarea del plan actual.
5.  Proporciona un razonamiento claro en el campo 'thought'.
6.  Responde ÚNICAMENTE con el objeto JSON especificado.

ESQUEMA JSON DE SALIDA:
{{
  "thought": "string",
  "decision": "'retry' | 'modify_plan' | 'continue'",
  "newPlan": "string[] | undefined"
}}
`],
    ["user", `
CONSULTA ORIGINAL DEL USUARIO:
{userQuery}

PLAN ACTUAL:
{currentPlan}

TAREA ESPECÍFICA QUE FALLÓ:
{failedTask}

DETALLES DEL ERROR:
{errorDetails}

HISTORIAL DE EJECUCIÓN DE HERRAMIENTAS (en este turno):
{executionHistory}
`]
]);