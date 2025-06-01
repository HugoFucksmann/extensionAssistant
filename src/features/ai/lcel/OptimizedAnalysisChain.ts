import { analysisOutputSchema, analysisPromptLC } from "../prompts/optimized/analysisPrompt";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { createAutoCorrectStep } from "../../../shared/utils/aiResponseParser";





export async function runOptimizedAnalysisChain({
  userQuery,
  availableTools,
  codeContext,
  memoryContext,
  model
}: {
  userQuery: string;
  availableTools: string[];
  codeContext?: string;
  memoryContext?: string;
  model: BaseChatModel;
}) {
  const defaultResponse = {
    understanding: 'Analizando tu solicitud...',
    taskType: 'information_request' as const,
    requiredTools: [] as string[],
    requiredContext: [] as string[],
    initialPlan: ['Procesar la solicitud del usuario']
  };

  try {
    // Construir el contexto
    let context = '';
    if (memoryContext) {
      context += `MEMORIA RELEVANTE:\n${memoryContext}\n\n`;
    }
    if (codeContext) {
      context += `CONTEXTO DE CÓDIGO:\n${codeContext}\n\n`;
    }
    context += `HERRAMIENTAS DISPONIBLES:\n${availableTools.join(', ')}\n`;

    // Usar el prompt optimizado de analysisPromptLC
    const prompt = analysisPromptLC;
    
    // Crear el paso de parseo con autocorrección
    const parseStep = createAutoCorrectStep(analysisOutputSchema, model, {
      maxAttempts: 2,
      verbose: process.env.NODE_ENV === 'development'
    });
    
    // Encadenar: prompt -> modelo -> parseo con autocorrección
    const chain = prompt.pipe(model).pipe(parseStep);
    
    try {
      // Ejecutar la cadena con las variables necesarias
      const { invokeModelWithLogging } = await import('./ModelInvokeLogger');
      
      // La cadena ahora devuelve directamente el objeto parseado y validado
      return await invokeModelWithLogging(chain, {
        userQuery,
        availableTools: availableTools.join(', '),
        codeContext: codeContext || '',
        memoryContext: memoryContext || ''
      }, { 
        caller: 'runOptimizedAnalysisChain',
        // Asegurarse de que el logger sepa que esperamos un objeto, no un string
        responseFormatter: (r: unknown) => JSON.stringify(r, null, 2)
      });
      
    } catch (error) {
      console.error('Error al procesar la respuesta del modelo:', error);
      if (error instanceof Error) {
        console.error('Detalles del error:', error.message);
      }
      return defaultResponse;
    }
  } catch (error) {
    console.error('Error en runOptimizedAnalysisChain:', error);
    return defaultResponse;
  }
}
