/**
 * Prompt optimizado para la fase de respuesta final
 * Diseñado para generar respuestas claras y concisas para el usuario
 */

import { z } from 'zod';
import { createStructuredPrompt } from '../optimizedPromptUtils';

// Esquema para validar la salida del modelo
export const responseOutputSchema = z.object({
  // Respuesta final para el usuario
  response: z.string().describe('Respuesta final y completa para el usuario'),
  
  // Elementos de memoria a guardar (opcional)
  memoryItems: z.array(
    z.object({
      type: z.enum(['context', 'codebase', 'user', 'tools']).describe('Tipo de memoria'),
      content: z.string().describe('Contenido a recordar'),
      relevance: z.number().min(0).max(1).describe('Relevancia de 0 a 1')
    })
  ).optional().describe('Elementos a guardar en memoria')
});

// Tipo para la salida de la respuesta
export type ResponseOutput = z.infer<typeof responseOutputSchema>;

/**
 * Genera el prompt para la fase de respuesta
 */
export function generateResponsePrompt(
  userQuery: string,
  toolResults: Array<{tool: string, result: any}>,
  analysisResult: any,
  memoryContext?: string
): string {
  const systemInstruction = 
    'Eres un asistente de programación experto que genera respuestas claras, concisas y útiles basadas en la información recopilada.';
  
  let context = '';
  
  if (memoryContext) {
    context += `MEMORIA RELEVANTE:\n${memoryContext}\n\n`;
  }
  
  context += `ANÁLISIS INICIAL:\n${JSON.stringify(analysisResult, null, 2)}\n\n`;
  
  if (toolResults.length > 0) {
    context += 'RESULTADOS DE HERRAMIENTAS:\n';
    toolResults.forEach(({ tool, result }) => {
      context += `## ${tool}\n${JSON.stringify(result, null, 2)}\n\n`;
    });
  }
  
  const task = 
    `Basándote en la consulta del usuario: "${userQuery}" y la información recopilada, genera una respuesta clara y concisa. También identifica información importante que debería recordarse para futuras interacciones.`;
  
  const format = 
    `Responde con un objeto JSON que contenga los siguientes campos:
    {
      "response": "Tu respuesta completa para el usuario",
      "memoryItems": [
        {
          "type": "context|codebase|user|tools",
          "content": "Información a recordar",
          "relevance": 0.8 // Valor entre 0 y 1
        }
      ]
    }`;
  
  const examples = 
    `Ejemplo 1:
    Usuario: "¿Cuántas líneas de código tiene el archivo main.js?"
    Respuesta:
    \`\`\`json
    {
      "response": "El archivo main.js tiene 42 líneas de código.",
      "memoryItems": [
        {
          "type": "codebase",
          "content": "El archivo main.js tiene 42 líneas de código",
          "relevance": 0.7
        }
      ]
    }
    \`\`\`
    
    Ejemplo 2:
    Usuario: "Explícame cómo funciona la función calculateTotal"
    Respuesta:
    \`\`\`json
    {
      "response": "La función calculateTotal recibe un array de productos y devuelve la suma de sus precios. Primero filtra los productos activos, luego aplica descuentos si corresponde, y finalmente suma todos los precios.",
      "memoryItems": [
        {
          "type": "codebase",
          "content": "La función calculateTotal suma precios de productos, filtra por activos y aplica descuentos",
          "relevance": 0.9
        },
        {
          "type": "user",
          "content": "El usuario está interesado en entender la lógica de cálculo de precios",
          "relevance": 0.8
        }
      ]
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
