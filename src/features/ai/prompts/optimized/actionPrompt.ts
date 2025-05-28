/**
 * Prompt optimizado para la fase de acción
 * Diseñado para interpretar los resultados de las herramientas y decidir el siguiente paso
 */

import { z } from 'zod';
import { createStructuredPrompt } from '../optimizedPromptUtils';

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

/**
 * Genera el prompt para la fase de acción
 */
export function generateActionPrompt(
  userQuery: string,
  lastToolName: string,
  lastToolResult: any,
  previousActions: Array<{tool: string, result: any}> = [],
  memoryContext?: string
): string {
  const systemInstruction = 
    'Eres un asistente de programación experto que interpreta resultados de herramientas y decide los siguientes pasos.';
  
  let context = '';
  
  if (memoryContext) {
    context += `MEMORIA RELEVANTE:\n${memoryContext}\n\n`;
  }
  
  if (previousActions.length > 0) {
    context += 'ACCIONES PREVIAS:\n';
    previousActions.forEach(({ tool, result }) => {
      context += `## ${tool}\n${JSON.stringify(result, null, 2)}\n\n`;
    });
  }
  
  context += `RESULTADO DE LA ÚLTIMA HERRAMIENTA (${lastToolName}):\n${JSON.stringify(lastToolResult, null, 2)}\n`;
  
  const task = 
    `Basándote en la consulta del usuario: "${userQuery}" y el resultado de la herramienta ${lastToolName}, decide cuál debe ser el siguiente paso.`;
  
  const format = 
    `Responde con un objeto JSON que contenga los siguientes campos:
    {
      "interpretation": "Tu interpretación del resultado de la herramienta",
      "nextAction": "use_tool o respond",
      "tool": "nombre_de_la_herramienta (solo si nextAction es use_tool)",
      "parameters": { ... parámetros para la herramienta ... } (solo si nextAction es use_tool),
      "response": "Respuesta final para el usuario (solo si nextAction es respond)"
    }`;
  
  const examples = 
    `Ejemplo 1:
    Usuario: "¿Cuántas líneas de código tiene el archivo main.js?"
    Resultado de getFileContents: { "success": true, "content": "línea1\\nlínea2\\nlínea3" }
    Respuesta:
    \`\`\`json
    {
      "interpretation": "He obtenido el contenido del archivo main.js y contiene 3 líneas de código.",
      "nextAction": "respond",
      "response": "El archivo main.js tiene 3 líneas de código."
    }
    \`\`\`
    
    Ejemplo 2:
    Usuario: "¿Qué funciones hay en el proyecto?"
    Resultado de searchInWorkspace: { "success": true, "matches": [{"path": "src/utils.js"}, {"path": "src/components/Button.js"}] }
    Respuesta:
    \`\`\`json
    {
      "interpretation": "He encontrado archivos que podrían contener funciones, pero necesito examinar su contenido.",
      "nextAction": "use_tool",
      "tool": "getFileContents",
      "parameters": {
        "path": "src/utils.js"
      }
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
