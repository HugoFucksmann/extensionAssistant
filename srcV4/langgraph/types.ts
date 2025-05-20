import { ToolResult } from '../tools/types';
import { ReActNodeType } from '../core/config';

/**
 * Paso intermedio en la ejecución del grafo ReAct
 */
export interface IntermediateStep {
  action: {
    tool: string;
    toolInput: Record<string, any>;
  };
  observation: string | Record<string, any>;
  timestamp?: number;
}

/**
 * Historial de conversación para el estado ReAct
 */
export interface ConversationHistory {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp?: number;
  metadata?: Record<string, any>;
}

/**
 * Estado del grafo ReAct para LangGraph
 */
export interface ReActState {
  // Entrada y salida del grafo
  userMessage: string;
  finalResponse?: string;
  
  // Contexto y datos del usuario
  context?: Record<string, any>;
  
  // Análisis inicial del mensaje
  initialAnalysis?: {
    intent: string;
    objectives: string[];
    requiredTools: string[];
    relevantContext: string;
  };
  
  // Razonamiento y planificación
  reasoning?: {
    plan: string;
    steps: Array<{
      description: string;
      toolName?: string;
      parameters?: Record<string, any>;
    }>;
    currentStep: number;
    toolsToUse: string[];
  };
  
  // Acción actual
  action?: {
    toolName: string;
    toolInput: Record<string, any>;
    toolOutput?: any;
    isComplete: boolean;
    error?: string;
  };
  
  // Reflexión sobre la acción
  reflection?: {
    success: boolean;
    insights: string[];
    nextSteps: string[];
    needsCorrection: boolean;
  };
  
  // Corrección del plan
  correction?: {
    originalPlan: string;
    revisedPlan: string;
    reason: string;
  };
  
  // Pasos intermedios durante la ejecución
  intermediateSteps: IntermediateStep[];
  
  // Historial de acciones y decisiones
  history: {
    reasoning: string[];
    actions: Array<{
      toolName: string;
      input: Record<string, any>;
      output: any;
      timestamp: number;
    }>;
    reflections: string[];
    corrections: string[];
  };
  
  // Nodo actual en el grafo
  currentNode: ReActNodeType;
  
  // Metadatos y contexto
  metadata: {
    chatId?: string;
    userId?: string;
    contextData?: Record<string, any>;
    startTime?: number;
    endTime?: number;
    modelName?: string;
    [key: string]: any;
  };
}

/**
 * Resultado de la ejecución del grafo ReAct
 */
export interface ReActGraphResult {
  // Estado final del grafo
  input: string;
  output: string | null;
  intermediateSteps: IntermediateStep[];
  metadata: Record<string, any>;
  
  // Información sobre la ejecución
  executionInfo?: {
    startTime: number;
    endTime: number;
    duration: number;
    nodeVisits: string[];
    iterations: number;
  };
}

/**
 * Tipo para las funciones de nodo del grafo
 * Compatible con RunnableLambda de LangGraph
 */
export type ReActNodeFunction = (state: ReActState) => Promise<ReActState>;

/**
 * Tipo para las funciones de borde del grafo
 */
export type ReActEdgeFunction = (state: ReActState) => Promise<string>;

/**
 * Función para crear un nuevo estado ReAct
 */
export function createInitialReActState(userMessage: string, metadata: Record<string, any> = {}): ReActState {
  return {
    userMessage,
    intermediateSteps: [],
    history: {
      reasoning: [],
      actions: [],
      reflections: [],
      corrections: []
    },
    currentNode: ReActNodeType.INITIAL_ANALYSIS,
    metadata: {
      ...metadata,
      startTime: Date.now(),
    }
  };
}

/**
 * Función para agregar un paso intermedio al estado
 */
export function addIntermediateStep(
  state: ReActState,
  tool: string,
  toolInput: Record<string, any>,
  observation: string | Record<string, any>
): ReActState {
  const step: IntermediateStep = {
    action: {
      tool,
      toolInput
    },
    observation,
    timestamp: Date.now()
  };
  
  return {
    ...state,
    intermediateSteps: [...state.intermediateSteps, step]
  };
}


