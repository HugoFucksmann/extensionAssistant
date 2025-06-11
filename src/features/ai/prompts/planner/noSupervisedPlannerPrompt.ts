// src/features/ai/prompts/planner/supervisedPlannerPrompt.ts
import { z } from 'zod';
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { JsonMarkdownStructuredOutputParser } from "langchain/output_parsers";

// 2C. SUPERVISED PLANNER - Para modo No Supervisado
export const supervisedPlannerSchema = z.object({
    nextAction: z.enum(['continue', 'finish', 'escalate']).describe("Decide si continuar, finalizar o escalar al usuario para obtener feedback."),
    reasoning: z.string().describe("Evaluación de la adherencia al plan y el uso de recursos."),
    planAdherence: z.number().min(0).max(1).describe("Puntuación de 0.0 a 1.0 que indica qué tan bien se está siguiendo el plan detallado."),
    timeEstimate: z.number().optional().describe("Estimación en minutos para el siguiente paso o el resto de la tarea."),
    resourceUsage: z.record(z.number()).optional().describe("Uso de recursos como tokens de LLM o llamadas a API.")
});

export type SupervisedPlannerOutput = z.infer<typeof supervisedPlannerSchema>;

export const supervisedPlannerPrompt = ChatPromptTemplate.fromMessages([
    ["system", `Eres un planificador supervisor. Tu tarea es evaluar la adherencia al plan detallado y el uso de recursos.
Escala al usuario solo si detectas desviaciones críticas o si el plan lo requiere explícitamente.
Responde únicamente con un objeto JSON válido que se adhiera al esquema.

ESQUEMA JSON ESPERADO:
{{
  "nextAction": "'continue', 'finish' o 'escalate'",
  "reasoning": "Evaluación de la adherencia al plan y justificación.",
  "planAdherence": 0.9,
  "timeEstimate": 5,
  "resourceUsage": {{ "tokens": 123, "api_calls": 5 }}
}}`],
    ["user", `PLAN DETALLADO: {detailedPlan}
ARQUITECTURA DE REFERENCIA: {architecture}
PROGRESO ESPERADO: {expectedProgress}
RESULTADO ACTUAL DE LA HERRAMIENTA: {toolResult}`]
]);

export const supervisedPlannerParser = new JsonMarkdownStructuredOutputParser(supervisedPlannerSchema);