// src/features/ai/prompts/planner/executorPrompt.ts
import { z } from 'zod';
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { JsonMarkdownStructuredOutputParser } from "langchain/output_parsers";

// 1. EXECUTOR NODE - Común para todos los modos
export const executorSchema = z.object({
    tool: z.string().describe("El nombre de la herramienta a ejecutar."),
    parameters: z.record(z.any()).describe("Los parámetros necesarios para la herramienta.")
});

export type ExecutorOutput = z.infer<typeof executorSchema>;

export const executorPrompt = ChatPromptTemplate.fromMessages([
    ["system", `Tu tarea es seleccionar la herramienta más adecuada y sus parámetros para avanzar en la resolución de la consulta del usuario.
Responde únicamente con un objeto JSON válido que se adhiera al esquema.

HERRAMIENTAS DISPONIBLES:
{availableTools}

ESQUEMA JSON ESPERADO:
{{
  "tool": "nombre_de_la_herramienta",
  "parameters": {{ "param1": "valor1", "param2": "valor2" }}
}}`],
    ["user", `CONSULTA DEL USUARIO: "{userQuery}"
HISTORIAL DE RESULTADOS ANTERIORES (puede estar vacío):
{previousResults}`]
]);

export const executorParser = new JsonMarkdownStructuredOutputParser(executorSchema);