/**
 * Definiciones de tipos para el sistema de eventos
 */

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
  
  // Eventos de ejecución de herramientas
  TOOL_EXECUTION_STARTED = 'tool:execution:started',
  TOOL_EXECUTION_COMPLETED = 'tool:execution:completed',
  TOOL_EXECUTION_ERROR = 'tool:execution:error',
  
  // Eventos de respuesta
  RESPONSE_GENERATED = 'response:generated',
  RESPONSE_DELIVERED = 'response:delivered',
  
  // Eventos de error
  ERROR_OCCURRED = 'error:occurred',
  
  // Eventos de análisis
  ANALYSIS_STARTED = 'analysis:started',
  ANALYSIS_COMPLETED = 'analysis:completed',
  
  // Eventos de reflexión (general)
  REFLECTION_STARTED = 'reflection:started',
  REFLECTION_COMPLETED = 'reflection:completed',
  
  // Eventos de UI
  UI_UPDATED = 'ui:updated',
  UI_ACTION_PERFORMED = 'ui:action:performed',
  
  // Eventos de depuración
  DEBUG_LOG = 'debug:log',
  DEBUG_WARNING = 'debug:warning',
  DEBUG_ERROR = 'debug:error'
}

/**
 * Interfaz base para todos los eventos
 */
export interface BaseEventPayload {
  timestamp?: number;
  chatId?: string;
}

/**
 * Payload para eventos de conversación
 */
export interface ConversationEventPayload extends BaseEventPayload {
  userMessage?: string;
  response?: string;
  success?: boolean;
  duration?: number;
}

/**
 * Payload para eventos de razonamiento
 */
export interface ReasoningEventPayload extends BaseEventPayload {
  phase?: string;
  result?: any;
}

/**
 * Payload para eventos de ejecución de herramientas
 */
export interface ToolExecutionEventPayload extends BaseEventPayload {
  tool?: string;
  parameters?: Record<string, any>;
  result?: any;
  error?: string;
  duration?: number;
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
  error?: string;
  stack?: string;
  source?: string;
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
  | DebugEventPayload;

/**
 * Interfaz para un evento completo
 */
export interface WindsurfEvent {
  type: EventType;
  payload: EventPayload;
  timestamp: number;
  id: string;
}
