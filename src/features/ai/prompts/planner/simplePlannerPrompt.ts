// src/features/ai/prompts/planner/simplePlannerPrompt.ts
import { z } from 'zod';
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { JsonMarkdownStructuredOutputParser } from "langchain/output_parsers";

// 2A. SIMPLE PLANNER - Para modo Simple/Cascade
export const simplePlannerSchema = z.object({
    nextAction: z.enum(['continue', 'finish']).describe("Decide si continuar con otro paso o finalizar la tarea."),
    reasoning: z.string().describe("Una breve explicación de la decisión tomada.")
});

export type SimplePlannerOutput = z.infer<typeof simplePlannerSchema>;

export const simplePlannerPrompt = ChatPromptTemplate.fromMessages([
    ["system", `Tu ÚNICO ROL es ser un PLANIFICADOR SIMPLE.
Tu tarea es evaluar el resultado de la última herramienta y decidir si la tarea ha concluido o si se necesita otro paso. NO analices la consulta original. Solo decide el siguiente paso.



ESQUEMA JSON DE SALIDA:
{{
  "nextAction": "continue" o "finish",
  "reasoning": "Explicación breve de la decisión."
}}
`],
    ["user", `ANÁLISIS PREVIO:
{analysisResult}

HERRAMIENTA EJECUTADA: {lastTool}
RESULTADO DE LA HERRAMIENTA: {toolResult}
ERROR (si lo hubo): {error}

Basado en este resultado y el análisis previo, ¿debemos continuar o finalizar?`]
]);

export const simplePlannerParser = new JsonMarkdownStructuredOutputParser(simplePlannerSchema);