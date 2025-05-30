// src/features/ai/prompts/optimized/actionPrompt.ts
import { z } from 'zod';
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { JsonMarkdownStructuredOutputParser } from "langchain/output_parsers";

// Esquema para validar la salida del modelo
export const actionOutputSchema = z.object({
  // Interpretación del resultado de la herramienta
  interpretation: z.string().describe('Interpretación del resultado de la herramienta'),
  
  // Siguiente acción a tomar (simplificado a solo use_tool y respond)
  nextAction: z.enum(['use_tool', 'respond']).describe('Siguiente acción a realizar'),
  
  // Herramienta a utilizar (si nextAction es 'use_tool')
  tool: z.string().optional().describe('Nombre de la herramienta a utilizar'),
  
  // Parámetros para la herramienta (si nextAction es 'use_tool')
  parameters: z.record(z.any()).optional().describe('Parámetros para la herramienta'),
  
  // Respuesta final (si nextAction es 'respond')
  response: z.string().optional().describe('Respuesta final para el usuario')
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
  "nextAction": "string (Uno de: 'use_tool', 'respond')",
  "tool": "string (Uno de: 'getFileContents', 'searchInWorkspace', 'writeToFile')",
  "parameters": objet | null ,
  "response": "string | null "
}}

`
  ]
]);



// OutputParser basado en Zod y LangChain
export const actionOutputParser = new JsonMarkdownStructuredOutputParser(actionOutputSchema);