import { z } from 'zod';
import { ChatPromptTemplate } from "@langchain/core/prompts";

export const planSchema = z.object({
    thought: z.string().describe("Razonamiento sobre el estado actual del plan y la consulta del usuario."),
    plan: z.array(z.string()).describe("La lista de tareas de alto nivel, actualizada. Las tareas completadas deben eliminarse."),
    isPlanComplete: z.boolean().describe("¿Se ha completado el plan y se puede responder al usuario?"),
    nextTask: z.string().optional().describe("La siguiente tarea específica del plan a ejecutar. Solo presente si isPlanComplete es false."),
});

export type Plan = z.infer<typeof planSchema>;

export const plannerPromptLC = ChatPromptTemplate.fromMessages([
    ["system", `Eres un asistente de IA planificador. Tu trabajo es crear y mantener un plan de alto nivel para resolver la consulta del usuario.

INSTRUCCIONES:
1.  Analiza la consulta y el historial.
2.  Crea un plan inicial si no existe.
3.  Si ya hay un plan, actualízalo basándote en el resultado de la última tarea. Elimina las tareas ya completadas.
4.  Decide si el plan está completo o cuál es la siguiente tarea.
5.  Responde ÚNICAMENTE con el objeto JSON especificado.

ESQUEMA JSON DE SALIDA:
{{
  "thought": "string",
  "plan": "string[]",
  "isPlanComplete": "boolean",
  "nextTask": "string | undefined"
}}
`],
    ["user", `CONSULTA ORIGINAL: {userQuery}

PLAN ACTUAL (puede estar vacío):
{currentPlan}

HISTORIAL DE EJECUCIÓN (última tarea y su resultado):
{executionHistory}
`]
]);