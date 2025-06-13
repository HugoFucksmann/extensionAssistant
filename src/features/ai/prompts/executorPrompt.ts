import { z } from 'zod';
import { ChatPromptTemplate } from "@langchain/core/prompts";

export const executorSchema = z.object({
    thought: z.string().describe("Razonamiento sobre por qué se elige esta herramienta y estos parámetros para la tarea dada."),
    tool: z.string().describe("El nombre exacto de la herramienta a utilizar."),
    parameters: z.record(z.any()).describe("Los parámetros necesarios para la herramienta, siguiendo su esquema."),
});

export type ExecutorOutput = z.infer<typeof executorSchema>;

export const executorPromptLC = ChatPromptTemplate.fromMessages([
    ["system", `Eres un asistente de IA ejecutor. Tu única tarea es traducir una tarea de alto nivel en una llamada a una herramienta específica.

INSTRUCCIONES:
1.  Analiza la tarea que se te ha asignado.
2.  Selecciona la herramienta más adecuada de la lista de herramientas disponibles.
3.  Define los parámetros correctos para esa herramienta.
4.  Responde ÚNICAMENTE con el objeto JSON especificado.

HERRAMIENTAS DISPONIBLES (nombre y descripción con esquema de parámetros Zod):
{availableTools}

ESQUEMA JSON DE SALIDA:
{{
  "thought": "string",
  "tool": "string",
  "parameters": "object"
}}
`],
    ["user", `TAREA A EJECUTAR: "{task}"

CONTEXTO GENERAL (Consulta original del usuario):
{userQuery}
`]
]);