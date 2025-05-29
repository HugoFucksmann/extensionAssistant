import { analysisOutputSchema, analysisPromptLC } from "../prompts/optimized/analysisPrompt";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { JsonOutputParser } from "@langchain/core/output_parsers";

// Función para extraer JSON de una cadena que podría contener markdown
function extractJsonFromString(str: string): any {
  try {
    // Intentar extraer JSON de bloques de código markdown
    const jsonMatch = str.match(/```(?:json)?\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
      return JSON.parse(jsonMatch[1]);
    }
    // Si no hay bloque de código, intentar parsear directamente
    return JSON.parse(str);
  } catch (e) {
    console.error('Error al extraer/parsear JSON:', e);
    return null;
  }
}

// Función para normalizar la respuesta del modelo
function normalizeModelResponse(response: any) {
  // Si la respuesta no es un objeto, devolver null
  if (!response || typeof response !== 'object') {
    console.log('La respuesta no es un objeto:', response);
    return null;
  }

  // Extraer y validar taskType
  const validTaskTypes = [
    'code_explanation', 'code_generation', 'code_modification',
    'debugging', 'information_request', 'tool_execution'
  ];
  
  const taskType = validTaskTypes.includes(response.taskType) 
    ? response.taskType 
    : 'information_request';

  // Crear objeto normalizado con valores por defecto
  const normalized = {
    understanding: String(response.understanding || 'Analizando tu solicitud...'),
    taskType,
    requiredTools: Array.isArray(response.requiredTools) ? response.requiredTools : [],
    requiredContext: Array.isArray(response.requiredContext) ? response.requiredContext : [],
    initialPlan: Array.isArray(response.initialPlan) 
      ? response.initialPlan 
      : ['Procesando tu solicitud...']
  };

  console.log('Respuesta normalizada:', JSON.stringify(normalized, null, 2));
  return normalized;
}

/**
 * Construye y ejecuta la cadena LCEL para la fase de análisis optimizado.
 * Recibe los parámetros necesarios y retorna el objeto parseado según analysisOutputSchema.
 */
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
    
    // Crear el parser
    const parser = new JsonOutputParser();
    
    // Encadenar: prompt -> modelo -> parser
    const chain = prompt.pipe(model).pipe(parser);
    
    // Ejecutar la cadena con las variables necesarias
    const rawResult = await chain.invoke({
      userQuery,
      availableTools: availableTools.join(', '),
      codeContext: codeContext || '',
      memoryContext: memoryContext || ''
    });

    console.log('Respuesta cruda del modelo:', JSON.stringify(rawResult, null, 2));

    // Intentar extraer y normalizar la respuesta
    let parsedResult = typeof rawResult === 'string' ? extractJsonFromString(rawResult) : rawResult;
    const normalizedResult = parsedResult ? normalizeModelResponse(parsedResult) : null;

    // Validar manualmente el resultado contra el esquema
    if (!normalizedResult) {
      console.error('No se pudo extraer una respuesta válida del modelo');
      console.error('Respuesta recibida:', rawResult);
      return defaultResponse;
    }

    const validation = analysisOutputSchema.safeParse(normalizedResult);
    if (!validation.success) {
      console.error('Error de validación del esquema:', validation.error);
      console.error('Respuesta recibida:', rawResult);
      return defaultResponse;
    }

    return validation.data;
  } catch (error) {
    console.error('Error en runOptimizedAnalysisChain:', error);
    return defaultResponse;
  }
}
