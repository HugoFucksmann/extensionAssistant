// shared/events/types/eventTypes.ts

/**
 * Definiciones de tipos para el sistema de eventos de la arquitectura Windsurf
 * Este es el archivo canónico para todos los tipos de eventos y sus payloads.
 */

import { ReActNodeType } from '../../../core/config'; // RUTA AJUSTADA: Asumiendo core/config es la fuente de ReActNodeType

/**
 * Tipos de eventos soportados por el sistema
 */
export enum EventType {
  // Eventos del ciclo de vida de la conversación
  CONVERSATION_STARTED = 'conversation:started',
  CONVERSATION_ENDED = 'conversation:ended',
  
  // Eventos del ciclo ReAct
  REASONING_STARTED = 'react:reasoning:started',
  REASONING_COMPLETED = 'react:reasoning:completed',
  ACTION_STARTED = 'react:action:started',
  ACTION_COMPLETED = 'react:action:completed',
  REACT_REFLECTION_STARTED = 'react:reflection:started',
  REACT_REFLECTION_COMPLETED = 'react:reflection:completed',
  CORRECTION_STARTED = 'react:correction:started',
  CORRECTION_COMPLETED = 'react:correction:completed',

  // Eventos de nodos del grafo ReAct (antes en el otro EventType)
  NODE_START = 'node:start',
  NODE_COMPLETE = 'node:complete',
  NODE_ERROR = 'node:error',
  
  // Eventos de ejecución de herramientas
  TOOL_EXECUTION_STARTED = 'tool:execution:started', // Combinado de ambos
  TOOL_EXECUTION_COMPLETED = 'tool:execution:completed', // Combinado de ambos
  TOOL_EXECUTION_ERROR = 'tool:execution:error', // Combinado de ambos
  
  // Eventos de respuesta
  RESPONSE_GENERATED = 'response:generated',
  RESPONSE_DELIVERED = 'response:delivered',

  // Eventos de procesamiento de mensajes (antes en el otro EventType)
  MESSAGE_PROCESSING_START = 'message:processing:start',
  MESSAGE_PROCESSING_COMPLETE = 'message:processing:complete',
  MESSAGE_PROCESSING_ERROR = 'message:processing:error',
  
  // Eventos de error general
  ERROR_OCCURRED = 'error:occurred',
  
  // Eventos de análisis
  ANALYSIS_STARTED = 'analysis:started',
  ANALYSIS_COMPLETED = 'analysis:completed',
  
  // Eventos de reflexión (general, puede ser diferente a REACT_REFLECTION)
  REFLECTION_STARTED = 'reflection:started',
  REFLECTION_COMPLETED = 'reflection:completed',
  
  // Eventos de UI
  UI_UPDATED = 'ui:updated',
  UI_ACTION_PERFORMED = 'ui:action:performed',
  
  // Eventos de depuración
  DEBUG_LOG = 'debug:log',
  DEBUG_WARNING = 'debug:warning',
  DEBUG_ERROR = 'debug:error',

  // Eventos de sistema (antes en el otro EventType)
  SYSTEM_INFO = 'system:info',
  SYSTEM_WARNING = 'system:warning',
  SYSTEM_ERROR = 'system:error'
}

/**
 * Interfaz base para todos los payloads de eventos
 */
export interface BaseEventPayload {
  timestamp?: number;
  chatId?: string;
  // Añadir un identificador de usuario si es relevante para el contexto global de eventos
  userId?: string;
  // Para eventos de retransmisión
  isReplay?: boolean;
}

/**
 * Payload para eventos de conversación
 */
export interface ConversationEventPayload extends BaseEventPayload {
  userMessage?: string;
  response?: string;
  success?: boolean;
  duration?: number;
  // Puede incluir el estado final de la conversación si es relevante al finalizar
  finalState?: any; 
}

/**
 * Payload para eventos de razonamiento
 */
export interface ReasoningEventPayload extends BaseEventPayload {
  phase?: string; // Ej: 'initialAnalysis', 'reasoning'
  result?: any;
  thought?: string; // El pensamiento del agente
}

/**
 * Payload para eventos de ejecución de herramientas (Combinado)
 */
export interface ToolExecutionEventPayload extends BaseEventPayload {
  toolName?: string; // Cambiado de 'tool' a 'toolName' para consistencia
  parameters?: Record<string, any>;
  result?: any;
  error?: string;
  duration?: number;
  // Antes se usaba 'tool' como parte del payload
  tool?: string; // Mantener para compatibilidad si el payload original lo usaba
}

/**
 * Payload para eventos de respuesta
 */
export interface ResponseEventPayload extends BaseEventPayload {
  response?: string;
  success?: boolean;
  duration?: number;
  metadata?: Record<string, any>;
}

/**
 * Payload para eventos de error
 */
export interface ErrorEventPayload extends BaseEventPayload {
  error?: string; // Mensaje de error
  stack?: string; // Stack trace del error
  source?: string; // Componente o módulo donde ocurrió el error
  details?: Record<string, any>; // Detalles adicionales del error
}

/**
 * Payload para eventos de UI
 */
export interface UIEventPayload extends BaseEventPayload {
  action?: string;
  element?: string;
  data?: any;
}

/**
 * Payload para eventos de depuración
 */
export interface DebugEventPayload extends BaseEventPayload {
  message?: string;
  data?: any;
  level?: 'log' | 'warning' | 'error';
}

// NUEVOS PAYLOADS (de la antigua `events.ts`)

/**
 * Payload para eventos de nodo del grafo ReAct
 */
export interface NodeEventPayload extends BaseEventPayload {
  nodeType: ReActNodeType; // Cambiado de 'type' a 'nodeType' para evitar conflicto con EventType
  stateSnapshot?: any; // Captura del estado del grafo en ese nodo
  duration?: number;
  error?: Error;
}

/**
 * Payload para eventos de procesamiento de mensajes (Combinado y Renombrado)
 * Anteriormente `MessageProcessingPayload`
 */
export interface MessageProcessingEventPayload extends BaseEventPayload {
  messageId: string; // Puede ser el chatId o un ID único del mensaje
  content: string; // El contenido del mensaje procesado
  stateSnapshot?: any; // Estado de la conversación en ese momento
  duration?: number;
  error?: Error;
}

/**
 * Payload para eventos de sistema (Combinado y Renombrado)
 * Anteriormente `SystemEventPayload`
 */
export interface SystemEventPayload extends BaseEventPayload {
  message: string;
  details?: Record<string, any>;
  error?: Error; // Puede ser un objeto Error
}


/**
 * Tipo unión para todos los payloads de eventos
 */
export type EventPayload = 
  | BaseEventPayload
  | ConversationEventPayload
  | ReasoningEventPayload
  | ToolExecutionEventPayload
  | ResponseEventPayload
  | ErrorEventPayload
  | UIEventPayload
  | DebugEventPayload
  | NodeEventPayload
  | MessageProcessingEventPayload
  | SystemEventPayload;

/**
 * Interfaz para un evento completo
 */
export interface WindsurfEvent {
  type: EventType;
  payload: EventPayload;
  timestamp: number;
  id: string; // ID único del evento
  source?: string; // Origen del evento (e.g., 'ConversationManager', 'ToolRegistry')
}