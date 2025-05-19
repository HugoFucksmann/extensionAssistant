import { ToolResult } from '../tools/types';

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
  input: string;
  output: string | null;
  
  // Pasos intermedios durante la ejecución
  intermediateSteps: IntermediateStep[];
  
  // Metadatos y contexto
  metadata: {
    chatId?: string;
    userId?: string;
    contextData?: Record<string, any>;
    history?: ConversationHistory[];
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
 */
export type ReActNodeFunction = (state: ReActState) => Promise<ReActState>;

/**
 * Tipo para las funciones de borde del grafo
 */
export type ReActEdgeFunction = (state: ReActState) => Promise<string>;

/**
 * Función para crear un nuevo estado ReAct
 */
export function createInitialReActState(input: string, metadata: Record<string, any> = {}): ReActState {
  return {
    input,
    output: null,
    intermediateSteps: [],
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


