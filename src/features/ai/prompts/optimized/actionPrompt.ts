// src/features/ai/prompts/optimized/actionPrompt.ts
import { z } from 'zod';
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { JsonMarkdownStructuredOutputParser } from "langchain/output_parsers";

// Esquema para validar la salida del modelo
export const actionOutputSchema = z.object({
  interpretation: z.string().describe('Interpretación del resultado de la herramienta'),
  nextAction: z.enum(['use_tool', 'respond']).describe('Siguiente acción a realizar'),
  tool: z.string().nullable().describe('Nombre de la herramienta a utilizar o null si no aplica'),
  parameters: z.record(z.any()).nullable().describe('Parámetros para la herramienta o null si no aplica'),
  response: z.string().nullable().describe('Respuesta final para el usuario o null si no aplica')
});

// Tipo para la salida de la acción
export type ActionOutput = z.infer<typeof actionOutputSchema>;

// Prompt LangChain para la fase de acción
export const actionPromptLC = ChatPromptTemplate.fromMessages([
  [
    "system",
    `
Eres un asistente de IA experto en programación. Has ejecutado una herramienta y ahora debes interpretar su resultado y decidir el siguiente paso.

CONSIGNA:
1. **Interpretación**: Analiza el resultado de la herramienta.
2. **Siguiente Acción**: Decide si debes usar otra herramienta ('use_tool') o si puedes responder directamente ('respond').
3. **Herramienta o Respuesta**: Proporciona los campos necesarios según 'nextAction'. Si usas una herramienta, asegúrate de que los parámetros sean correctos.
`
  ],
  [
    "user",
    `
CONTEXTO ACTUAL:
- Consulta Original del Usuario: {userQuery}
- Acciones Previas (si las hay, como JSON): {previousActions}
- Resultado de la Última Herramienta ({lastToolName}): {lastToolResult}
- Memoria Relevante (si aplica): {memoryContext}

TAREA:
Interpreta el resultado de la herramienta ({lastToolName}) y decide el siguiente paso.

Responde **ÚNICAMENTE** con un objeto JSON **válido**


ESQUEMA ESPERADO (campos principales):
{{
  "interpretation": "string",
  "nextAction": "use_tool", // o "respond", ningún otro valor es válido
  "tool": "string (Uno de: 'getFileContents', 'searchInWorkspace', 'writeToFile')",
  "parameters": objet | null ,
  "response": "string | null "
}}

`
  ]
]);



// OutputParser basado en Zod y LangChain
export const actionOutputParser = new JsonMarkdownStructuredOutputParser(actionOutputSchema);