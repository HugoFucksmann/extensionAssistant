// src/features/ai/prompts/optimized/analysisPrompt.ts

import { z } from 'zod';
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { JsonMarkdownStructuredOutputParser } from "langchain/output_parsers";

// Esquema para validar la salida del modelo
export const analysisOutputSchema = z.object({
  understanding: z.string().describe('Comprensión clara de lo que pide el usuario'),
  taskType: z.enum([
    'code_explanation', 'code_generation', 'code_modification',
    'debugging', 'information_request', 'tool_execution'
  ]).describe('Categoría de la tarea solicitada'),
  requiredTools: z.array(z.string()).describe('Nombres de herramientas que podrían ser útiles de la lista de herramientas disponibles. Si no se necesita ninguna herramienta, devuelve un array vacío.'),
  requiredContext: z.array(z.string()).describe('Información adicional que el usuario podría necesitar proporcionar o que el sistema podría necesitar obtener para resolver la tarea (ej: "nombre del archivo", "confirmación para borrar"). Si no se necesita contexto adicional, devuelve un array vacío.'),
  initialPlan: z.array(z.string()).describe('Pasos iniciales concisos (1-3 pasos) para abordar la tarea. Sé breve.')
});

// Tipo para la salida del análisis
export type AnalysisOutput = z.infer<typeof analysisOutputSchema>;


// Versión para usar con LangChain Expression Language
export const analysisPromptLC = ChatPromptTemplate.fromMessages([
  ["system", `Eres un asistente de IA experto en programación. Tu tarea es analizar la consulta del usuario y el contexto proporcionado.

Responde ÚNICAMENTE con un objeto JSON válido que se adhiera estrictamente al esquema definido.
No incluyas texto explicativo, markdown ni nada fuera del objeto JSON.

INSTRUCCIONES:
1.  Devuelve solo el JSON.
2.  taskType: Usa uno de los valores exactos listados.
3.  requiredTools: Usa herramientas de 'HERRAMIENTAS DISPONIBLES'. Si no se necesitan, usa [].
4.  initialPlan: Sé breve y conciso (1-3 pasos).

HERRAMIENTAS DISPONIBLES:
{availableTools}

ESQUEMA JSON ESPERADO:
{{
  "understanding": "string",
  "taskType": "string (Uno de: 'code_explanation', 'code_generation', 'code_modification', 'debugging', 'information_request', 'tool_execution')",
  "requiredTools": "string[]",
  "requiredContext": "string[]",
  "initialPlan": "string[]"
}}
`],
  ["user", `CONSULTA: "{userQuery}"

CONTEXTO DE CÓDIGO:
{codeContext}

MEMORIA RELEVANTE:
{memoryContext}
`]
]);


// OutputParser basado en Zod y LangChain
export const analysisOutputParser = new JsonMarkdownStructuredOutputParser(analysisOutputSchema);