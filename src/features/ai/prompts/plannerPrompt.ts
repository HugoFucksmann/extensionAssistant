// src/features/ai/prompts/plannerPrompt.ts
import { z } from 'zod';
import { ChatPromptTemplate } from "@langchain/core/prompts";

export const planSchema = z.object({
    thought: z.string().describe("Razonamiento sobre el estado actual del plan y la consulta del usuario."),
    plan: z.array(z.string()).describe("La lista de tareas de alto nivel, actualizada. Las tareas completadas deben eliminarse."),
    isPlanComplete: z.boolean().describe("¿Se ha completado el plan y se puede responder al usuario?"),
    nextTask: z.string().nullable().optional().describe("La siguiente tarea específica del plan a ejecutar. Solo presente si isPlanComplete es false."),
});

export type Plan = z.infer<typeof planSchema>;

export const plannerPromptLC = ChatPromptTemplate.fromMessages([
    ["system", `Eres un asistente de IA planificador. Tu trabajo es crear y mantener un plan de alto nivel para resolver la consulta del usuario.

INSTRUCCIONES:
1.  Analiza la consulta y el historial.
2.  Si la última ejecución de la herramienta resultó en un error, NO intentes la misma tarea de nuevo. Modifica el plan para intentar una estrategia diferente.
3.  Crea un plan inicial si no existe.
4.  Si ya hay un plan, actualízalo basándote en el resultado de la última tarea. Elimina las tareas ya completadas.
5.  **Antes de planificar una acción, REVISA EL HISTORIAL DE EJECUCIÓN: Si ya existe el resultado de una herramienta para una tarea (por ejemplo, si ya se obtuvo el contenido de un archivo con getFileContents), NO repitas la misma acción ni planifiques la misma herramienta de nuevo. Si la información ya está disponible, avanza con el análisis o marca el plan como completo.**
6.  Si el HISTORIAL DE EJECUCIÓN ya contiene toda la información necesaria para responder la consulta original, establece 'isPlanComplete' en 'true'. De lo contrario, determina la siguiente tarea.
7.  Responde ÚNICAMENTE con el objeto JSON especificado.

ESQUEMA JSON DE SALIDA:
{{
  "thought": "string",
  "plan": "string[]",
  "isPlanComplete": "boolean",
  "nextTask": "string | null | undefined"
}}
`],
    ["user", `CONSULTA ORIGINAL: {userQuery}

HISTORIAL DE LA CONVERSACIÓN (mensajes anteriores de usuario y asistente):
{chatHistory}

MEMORIA DE TRABAJO (resumen de lo que se ha aprendido hasta ahora):
{workingMemory}

PLAN ACTUAL (puede estar vacío):
{currentPlan}

HISTORIAL DE EJECUCIÓN (resultados de herramientas en este turno):
{executionHistory}
`]
]);