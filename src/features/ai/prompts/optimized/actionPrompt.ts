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

INSTRUCCIONES:
1. **Interpretación**: Analiza el resultado de la herramienta ejecutada.
2. **Siguiente Acción**: Decide si debes usar otra herramienta ('use_tool') o si puedes responder directamente ('respond').
3. **tool y parameters**: Si eliges 'use_tool', proporciona el nombre exacto de la herramienta y sus parámetros.
4. **response**: Si eliges 'respond', proporciona la respuesta para el usuario.
5. Devuelve únicamente un objeto JSON válido. No uses markdown ni agregues explicaciones fuera del objeto.

ESQUEMA JSON ESPERADO:
{{
  "interpretation": "string",
  "nextAction": "use_tool", // o "respond", ningún otro valor es válido
  "tool": "string | null (Uno de: 'getFileContents', 'searchInWorkspace', 'writeToFile')",
  "parameters": object | null,
  "response": "string | null"
}}
`
  ],
  [
    "user",
    `
Consulta Original del Usuario: {userQuery}
Acciones Previas (si las hay): {previousActions}
Resultado de la Última Herramienta ({lastToolName}): {lastToolResult}
Memoria Relevante (si aplica): {memoryContext}
`
  ]
]);




// OutputParser basado en Zod y LangChain
export const actionOutputParser = new JsonMarkdownStructuredOutputParser(actionOutputSchema);