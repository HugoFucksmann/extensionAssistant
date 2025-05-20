/**
 * Estado centralizado para la arquitectura Windsurf
 * Actúa como fuente única de verdad para toda la aplicación
 */

import { IntermediateStep } from '../../langgraph/types';
import { ReActNodeType } from '../config';

/**
 * Mensaje en la conversación
 */
export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp?: number;
  metadata?: Record<string, any>;
}

/**
 * Herramienta ejecutada durante la conversación
 */
export interface ToolExecution {
  toolName: string;
  input: Record<string, any>;
  output: any;
  timestamp: number;
  success: boolean;
  error?: string;
}

/**
 * Estado centralizado del agente
 */
export interface AgentState {
  // Identificadores
  chatId: string;
  userId?: string;
  
  // Conversación
  messages: Message[];
  currentMessage?: string;
  
  // Estado del flujo ReAct
  currentStep: string;
  currentNode?: ReActNodeType;
  
  // Contexto y datos
  context: Record<string, any>;
  memorySummary?: string;
  
  // Compatibilidad con ReActState
  userMessage?: string;
  finalResponse?: string;
  intermediateSteps?: IntermediateStep[];
  
  // Historial de ejecución
  toolExecutions?: ToolExecution[];
  reasoning?: string[];
  reflections?: string[];
  
  // Metadatos
  startTime?: number;
  lastUpdateTime?: number;
  modelName?: string;
  metadata?: Record<string, any>;
}

/**
 * Crea un estado inicial para el agente
 * @param chatId ID de la conversación
 * @param userMessage Mensaje del usuario
 * @param contextData Datos adicionales de contexto
 * @returns Estado inicial
 */
export function createInitialAgentState(
  chatId: string,
  userMessage: string,
  contextData: Record<string, any> = {}
): AgentState {
  const timestamp = Date.now();
  
  return {
    chatId,
    messages: [
      {
        role: 'user',
        content: userMessage,
        timestamp
      }
    ],
    currentStep: 'initialAnalysis',
    currentNode: ReActNodeType.ANALYSIS,
    context: contextData,
    userMessage,
    intermediateSteps: [],
    startTime: timestamp,
    lastUpdateTime: timestamp,
    metadata: {
      contextData
    }
  };
}

/**
 * Actualiza el estado del agente de forma inmutable
 * @param state Estado actual
 * @param updates Actualizaciones a aplicar
 * @returns Nuevo estado
 */
export function updateAgentState(
  state: AgentState,
  updates: Partial<AgentState>
): AgentState {
  return {
    ...state,
    ...updates,
    lastUpdateTime: Date.now(),
    metadata: {
      ...state.metadata,
      ...(updates.metadata || {})
    }
  };
}

/**
 * Añade un mensaje al estado del agente
 * @param state Estado actual
 * @param role Rol del mensaje
 * @param content Contenido del mensaje
 * @param metadata Metadatos adicionales
 * @returns Nuevo estado
 */
export function addMessage(
  state: AgentState,
  role: Message['role'],
  content: string,
  metadata: Record<string, any> = {}
): AgentState {
  const timestamp = Date.now();
  
  return updateAgentState(state, {
    messages: [
      ...state.messages,
      {
        role,
        content,
        timestamp,
        metadata
      }
    ],
    currentMessage: content
  });
}

/**
 * Añade una ejecución de herramienta al estado del agente
 * @param state Estado actual
 * @param toolName Nombre de la herramienta
 * @param input Entrada de la herramienta
 * @param output Salida de la herramienta
 * @param success Indica si la ejecución fue exitosa
 * @param error Error en caso de fallo
 * @returns Nuevo estado
 */
export function addToolExecution(
  state: AgentState,
  toolName: string,
  input: Record<string, any>,
  output: any,
  success: boolean = true,
  error?: string
): AgentState {
  const timestamp = Date.now();
  const toolExecutions = state.toolExecutions || [];
  
  return updateAgentState(state, {
    toolExecutions: [
      ...toolExecutions,
      {
        toolName,
        input,
        output,
        timestamp,
        success,
        error
      }
    ]
  });
}
