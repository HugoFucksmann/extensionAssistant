// src/features/ai/lcel/outputNormalizers.ts
import { AnalysisOutput } from "../prompts/optimized/analysisPrompt";
import { ReasoningOutput } from "../prompts/optimized/reasoningPrompt";
import { ActionOutput } from "../prompts/optimized/actionPrompt";
import { ResponseOutput } from "../prompts/optimized/responsePrompt";
import { normalizeFinalResponse } from "../util/responseCleaner";

/**
 * Funciones de normalización comunes para las salidas de las cadenas LCEL
 * Estas funciones extraen la lógica duplicada de los outputNormalizers en chainConfigs.ts
 */

/**
 * Normaliza los valores comunes para las salidas de razonamiento y acción
 */
export function normalizeCommonOutputFields(parsedOutput: any) {
  const nextAction = ['use_tool', 'respond'].includes(parsedOutput.nextAction) 
    ? parsedOutput.nextAction 
    : 'respond';
  
  const response = typeof parsedOutput.response === 'string' 
    ? parsedOutput.response 
    : (nextAction === 'respond' ? "No specific response." : undefined);
  
  const tool = typeof parsedOutput.tool === 'string' 
    ? parsedOutput.tool 
    : undefined;
  
  const parameters = typeof parsedOutput.parameters === 'object' 
    ? parsedOutput.parameters 
    : undefined;

  return { nextAction, response, tool, parameters };
}

/**
 * Normaliza la salida de análisis
 */
export function normalizeAnalysisOutput(parsedOutput: any, rawInput?: any): AnalysisOutput {
  const defaultResponse: AnalysisOutput = {
    understanding: 'Analizando tu solicitud...',
    taskType: 'information_request',
    requiredTools: [],
    requiredContext: [],
    initialPlan: ['Procesar la solicitud del usuario']
  };

  if (!parsedOutput || typeof parsedOutput !== 'object') {
    console.warn('[AnalysisOutputNormalizer] Parsed output is not a valid object, returning default. Output:', parsedOutput);
    return defaultResponse;
  }

  // Estandarizar: solo usar nextAction (ya debería estar hecho por extractStructuredResponse si se usó)
  if (parsedOutput.action && !parsedOutput.nextAction) {
    parsedOutput.nextAction = parsedOutput.action;
    delete parsedOutput.action;
  }

  const validTaskTypes = [
    'code_explanation', 'code_generation', 'code_modification',
    'debugging', 'information_request', 'tool_execution'
  ];
  
  // Validación y normalización de campos
  const understanding = typeof parsedOutput.understanding === 'string' ? parsedOutput.understanding : defaultResponse.understanding;
  const taskType = validTaskTypes.includes(parsedOutput.taskType) ? parsedOutput.taskType : defaultResponse.taskType;
  const requiredTools = Array.isArray(parsedOutput.requiredTools) ? parsedOutput.requiredTools : defaultResponse.requiredTools;
  const requiredContext = Array.isArray(parsedOutput.requiredContext) ? parsedOutput.requiredContext : defaultResponse.requiredContext;
  const initialPlan = Array.isArray(parsedOutput.initialPlan) ? parsedOutput.initialPlan : defaultResponse.initialPlan;

  return {
    understanding,
    taskType,
    requiredTools,
    requiredContext,
    initialPlan
  };
}

/**
 * Normaliza la salida de razonamiento
 */
export function normalizeReasoningOutput(parsedOutput: any): ReasoningOutput {
  const { nextAction, response, tool, parameters } = normalizeCommonOutputFields(parsedOutput);

  if (nextAction === 'use_tool' && !tool) {
    console.warn('[ReasoningOutputNormalizer] nextAction is use_tool but no tool specified. Defaulting to respond.');
    return { 
      nextAction: 'respond', 
      response: "I intended to use another tool, but couldn't decide which one.",
      tool: null,
      parameters: null,
      reasoning: "Error: Herramienta no especificada"
    };
  }
  
  return { 
    nextAction, 
    response: response || null, 
    tool: tool || null, 
    parameters: parameters || null,
    reasoning: parsedOutput.reasoning || "No se proporcionó razonamiento"
  };
}

/**
 * Normaliza la salida de acción
 */
export function normalizeActionOutput(parsedOutput: any): ActionOutput {
  const { nextAction, response, tool, parameters } = normalizeCommonOutputFields(parsedOutput);

  if (nextAction === 'use_tool' && !tool) {
    console.warn('[ActionOutputNormalizer] nextAction is use_tool but no tool specified. Defaulting to respond.');
    return { 
      nextAction: 'respond', 
      response: "I intended to use another tool, but couldn't decide which one.",
      tool: null,
      parameters: null,
      interpretation: "Error: Herramienta no especificada"
    };
  }
  
  return { 
    nextAction, 
    response: response || null, 
    tool: tool || null, 
    parameters: parameters || null,
    interpretation: parsedOutput.interpretation || "No se proporcionó interpretación"
  };
}

/**
 * Normaliza la salida de respuesta
 */
export function normalizeResponseOutput(parsedOutput: string | any, rawInput?: any): ResponseOutput {
  if (typeof parsedOutput === 'string') {
    return normalizeFinalResponse(parsedOutput);
  }
  
  if (typeof parsedOutput === 'object' && parsedOutput !== null && typeof parsedOutput.response === 'string') {
    return { response: parsedOutput.response };
  }
  
  return normalizeFinalResponse(String(parsedOutput));
}
