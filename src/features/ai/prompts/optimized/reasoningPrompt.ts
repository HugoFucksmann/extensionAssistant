/**
 * Prompt optimizado para la fase de razonamiento
 * Diseñado para tomar decisiones sobre qué herramientas usar y cómo proceder
 */

import { z } from 'zod';
import { createStructuredPrompt } from '../optimizedPromptUtils';

// Esquema para validar la salida del modelo
export const reasoningOutputSchema = z.object({
  // Pensamiento paso a paso sobre cómo abordar el problema
  reasoning: z.string().describe('Razonamiento detallado sobre cómo resolver la tarea'),
  
  // Acción a tomar (usar una herramienta o generar respuesta)
  action: z.enum(['use_tool', 'respond']).describe('Acción a realizar'),
  
  // Herramienta a utilizar (si action es 'use_tool')
  tool: z.string().optional().describe('Nombre de la herramienta a utilizar'),
  
  // Parámetros para la herramienta (si action es 'use_tool')
  parameters: z.record(z.any()).optional().describe('Parámetros para la herramienta'),
  
  // Respuesta final (si action es 'respond')
  response: z.string().optional().describe('Respuesta final para el usuario')
});

// Tipo para la salida del razonamiento
export type ReasoningOutput = z.infer<typeof reasoningOutputSchema>;

/**
 * Genera el prompt para la fase de razonamiento
 */
export function generateReasoningPrompt(
  userQuery: string,
  analysisResult: any,
  toolsDescription: string,
  previousToolResults: Array<{name: string, result: any}> = [],
  memoryContext?: string
): string {
  const systemInstruction = 
    'Eres un asistente de programación experto que razona paso a paso para resolver problemas y decide qué herramientas utilizar.';
  
  let context = '';
  
  if (memoryContext) {
    context += `MEMORIA RELEVANTE:\n${memoryContext}\n\n`;
  }
  
  context += `ANÁLISIS PREVIO:\n${JSON.stringify(analysisResult, null, 2)}\n\n`;
  context += `HERRAMIENTAS DISPONIBLES:\n${toolsDescription}\n\n`;
  
  if (previousToolResults.length > 0) {
    context += 'RESULTADOS PREVIOS DE HERRAMIENTAS:\n';
    previousToolResults.forEach(({ name, result }) => {
      context += `## ${name}\n${JSON.stringify(result, null, 2)}\n\n`;
    });
  }
  
  const task = 
    `Basándote en la consulta del usuario: "${userQuery}", decide si debes usar una herramienta para obtener más información o si ya tienes suficiente información para responder.`;
  
  const format = 
    `Responde con un objeto JSON que contenga los siguientes campos:
    {
      "reasoning": "Tu razonamiento paso a paso",
      "action": "use_tool o respond",
      "tool": "nombre_de_la_herramienta (solo si action es use_tool)",
      "parameters": { ... parámetros para la herramienta ... } (solo si action es use_tool),
      "response": "Respuesta final para el usuario (solo si action es respond)"
    }`;
  
  const examples = 
    `Ejemplo 1:
    Usuario: "¿Cuántas líneas de código tiene el archivo main.js?"
    Respuesta:
    \`\`\`json
    {
      "reasoning": "Para responder a esta pregunta necesito obtener el contenido del archivo main.js y contar las líneas. Debo usar la herramienta getFileContents.",
      "action": "use_tool",
      "tool": "getFileContents",
      "parameters": {
        "path": "main.js"
      }
    }
    \`\`\`
    
    Ejemplo 2:
    Usuario: "¿Qué es React?"
    Respuesta:
    \`\`\`json
    {
      "reasoning": "Esta es una pregunta informativa sobre React. No necesito usar herramientas porque tengo conocimiento general sobre React.",
      "action": "respond",
      "response": "React es una biblioteca de JavaScript para construir interfaces de usuario. Fue desarrollada por Facebook y permite crear componentes reutilizables que muestran datos que cambian con el tiempo."
    }
    \`\`\``;
  
  return createStructuredPrompt(
    systemInstruction,
    context,
    task,
    format,
    examples
  );
}
