// src/features/ai/prompts/optimized/validationPrompt.ts

import { z } from 'zod';
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { JsonMarkdownStructuredOutputParser } from "langchain/output_parsers";

// Updated PromptProvider.ts should import this:
// import { validationPromptLC } from "../../../features/ai/prompts/optimized/validationPrompt";

// Esquema para validar la salida del modelo
export const validationOutputSchema = z.object({
    isValid: z.boolean().describe("¿El resultado de la herramienta parece correcto y útil para el siguiente paso?"),
    reasoning: z.string().describe("Breve explicación de por qué el resultado es válido o no."),
    correctionSuggestion: z.string().optional().describe("Si no es válido, una sugerencia de cómo corregir el plan o la siguiente acción."),
    updatedPlan: z.array(z.string()).optional().describe("Un nuevo plan si el original necesita ser modificado drásticamente.")
});

// Tipo para la salida de la validación
export type ValidationOutput = z.infer<typeof validationOutputSchema>;

// Versión para usar con LangChain Expression Language
export const validationPromptLC = ChatPromptTemplate.fromMessages([
    ["system", `Eres un asistente de IA experto en programación que valida resultados de herramientas.
    Tu tarea es analizar si el resultado de una herramienta es correcto y útil para continuar con el plan.

INSTRUCCIONES:
1. Devuelve solo el JSON.
2. Evalúa si el resultado es válido para el contexto actual.
3. Si no es válido, proporciona sugerencias de corrección.
4. Solo actualiza el plan si es absolutamente necesario.

ESQUEMA JSON ESPERADO:
{{
  "isValid": "boolean",
  "reasoning": "string", 
  "correctionSuggestion": "string (opcional)",
  "updatedPlan": "string[] (opcional)"
}}
`],
    ["user", `ERRORES: {errors}
CONTEXTO: {context}`]
]);

// OutputParser basado en Zod y LangChain
export const validationOutputParser = new JsonMarkdownStructuredOutputParser(validationOutputSchema);