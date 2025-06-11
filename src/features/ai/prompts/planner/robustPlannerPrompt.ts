// src/features/ai/prompts/planner/robustPlannerPrompt.ts
import { z } from 'zod';
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { JsonMarkdownStructuredOutputParser } from "langchain/output_parsers";

// 2B. ROBUST PLANNER - Para modo Planificador
export const robustPlannerSchema = z.object({
    nextAction: z.enum(['continue', 'finish', 'replanning']).describe("Decide si continuar, finalizar o si es necesario replanificar."),
    reasoning: z.string().describe("Análisis detallado del progreso y la justificación de la siguiente acción."),
    progress: z.number().min(0).max(1).describe("Estimación del progreso total de la tarea (0.0 a 1.0)."),
    alternatives: z.array(z.string()).optional().describe("Posibles acciones alternativas si el plan actual encuentra problemas."),
    checkpoint: z.record(z.any()).optional().describe("Datos relevantes para guardar en un punto de control si es un paso crítico.")
});

export type RobustPlannerOutput = z.infer<typeof robustPlannerSchema>;

export const robustPlannerPrompt = ChatPromptTemplate.fromMessages([
    ["system", `Eres un planificador robusto. Evalúa el progreso detalladamente, considera el plan original y decide el siguiente paso.
Puedes sugerir alternativas o la necesidad de replanificar si hay desviaciones.
Responde únicamente con un objeto JSON válido que se adhiera al esquema.

ESQUEMA JSON ESPERADO:
{{
  "nextAction": "'continue', 'finish' o 'replanning'",
  "reasoning": "Análisis detallado del estado actual vs. el plan.",
  "progress": 0.75,
  "alternatives": ["Usar otra herramienta", "Pedir más información al usuario"],
  "checkpoint": {{ "key_info": "value" }}
}}`],
    ["user", `PLAN ORIGINAL: {originalPlan}
HERRAMIENTA EJECUTADA: {lastTool}
RESULTADO DE LA HERRAMIENTA: {toolResult}
PROGRESO ACUMULADO HASTA AHORA: {overallProgress}`]
]);

export const robustPlannerParser = new JsonMarkdownStructuredOutputParser(robustPlannerSchema);