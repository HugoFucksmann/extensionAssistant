/**
 * Prompt optimizado para la fase de análisis inicial
 * Diseñado para ser conciso y estructurado
 */

import { z } from 'zod';
import { createStructuredPrompt } from '../optimizedPromptUtils';

// Esquema para validar la salida del modelo
export const analysisOutputSchema = z.object({
  // Comprensión de la consulta del usuario
  understanding: z.string().describe('Comprensión clara de lo que pide el usuario'),
  
  // Tipo de tarea a realizar
  taskType: z.enum([
    'code_explanation', 
    'code_generation', 
    'code_modification',
    'debugging',
    'information_request',
    'tool_execution'
  ]).describe('Categoría de la tarea solicitada'),
  
  // Herramientas que podrían ser necesarias
  requiredTools: z.array(z.string()).describe('Nombres de herramientas que podrían ser útiles'),
  
  // Contexto adicional necesario
  requiredContext: z.array(z.string()).describe('Información adicional necesaria para resolver la tarea'),
  
  // Plan de acción inicial
  initialPlan: z.array(z.string()).describe('Pasos iniciales para abordar la tarea')
});

// Tipo para la salida del análisis
export type AnalysisOutput = z.infer<typeof analysisOutputSchema>;

/**
 * Genera el prompt para la fase de análisis inicial
 */
export function generateAnalysisPrompt(
  userQuery: string,
  availableTools: string[],
  codeContext?: string,
  memoryContext?: string
): string {
  const systemInstruction = 
    'Eres un asistente de programación experto que analiza consultas de usuarios para determinar el mejor enfoque.';
  
  let context = '';
  
  if (memoryContext) {
    context += `MEMORIA RELEVANTE:\n${memoryContext}\n\n`;
  }
  
  if (codeContext) {
    context += `CONTEXTO DE CÓDIGO:\n${codeContext}\n\n`;
  }
  
  context += `HERRAMIENTAS DISPONIBLES:\n${availableTools.join(', ')}\n`;
  
  const task = 
    `Analiza la siguiente consulta del usuario y determina el mejor enfoque para resolverla:\n"${userQuery}"`;
  
  const format = 
    `Responde con un objeto JSON que contenga los siguientes campos:
    {
      "understanding": "Comprensión clara de lo que pide el usuario",
      "taskType": "Una de: code_explanation, code_generation, code_modification, debugging, information_request, tool_execution",
      "requiredTools": ["herramienta1", "herramienta2"],
      "requiredContext": ["información adicional necesaria"],
      "initialPlan": ["paso1", "paso2", "paso3"]
    }`;
  
  const examples = 
    `Ejemplo 1:
    Usuario: "¿Puedes explicarme cómo funciona este código?"
    Respuesta:
    \`\`\`json
    {
      "understanding": "El usuario quiere entender el funcionamiento de un fragmento de código",
      "taskType": "code_explanation",
      "requiredTools": ["getFileContents", "searchInWorkspace"],
      "requiredContext": ["código completo", "contexto de uso"],
      "initialPlan": ["examinar el código", "identificar patrones y estructuras", "explicar la funcionalidad"]
    }
    \`\`\`
    
    Ejemplo 2:
    Usuario: "Crea un componente React para mostrar una lista de tareas"
    Respuesta:
    \`\`\`json
    {
      "understanding": "El usuario quiere generar un componente React para visualizar tareas",
      "taskType": "code_generation",
      "requiredTools": ["writeToFile", "createFileOrDirectory"],
      "requiredContext": ["estructura del proyecto", "convenciones de estilo"],
      "initialPlan": ["crear archivo de componente", "implementar estructura básica", "añadir estilos"]
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
