/**
 * Sistema centralizado de eventos para la arquitectura Windsurf
 * Define los tipos de eventos y sus payloads
 */

import { ReActNodeType } from './config';
import { ReActState } from '../langgraph/types';
import { WindsurfState } from '../features/memory/types';


/**
 * Tipos de eventos en el sistema
 */
export enum EventType {
  // Eventos del ciclo ReAct
  NODE_START = 'node:start',
  NODE_COMPLETE = 'node:complete',
  NODE_ERROR = 'node:error',
  
  // Eventos de herramientas
  TOOL_EXECUTION_START = 'tool:execution:start',
  TOOL_EXECUTION_COMPLETE = 'tool:execution:complete',
  TOOL_EXECUTION_ERROR = 'tool:execution:error',
  
  // Eventos de procesamiento de mensajes
  MESSAGE_PROCESSING_START = 'message:processing:start',
  MESSAGE_PROCESSING_COMPLETE = 'message:processing:complete',
  MESSAGE_PROCESSING_ERROR = 'message:processing:error',
  
  // Eventos de sistema
  SYSTEM_INFO = 'system:info',
  SYSTEM_WARNING = 'system:warning',
  SYSTEM_ERROR = 'system:error'
}

/**
 * Interfaz base para todos los eventos
 */
export interface WindsurfEvent<T = any> {
  type: EventType | string;
  timestamp: number;
  payload: T;
  source?: string;
}

/**
 * Payload para eventos de nodo
 */
export interface NodeEventPayload {
  type: ReActNodeType;
  state: ReActState;
  duration?: number;
  error?: Error;
}

/**
 * Payload para eventos de ejecución de herramientas
 */
export interface ToolExecutionPayload {
  toolName: string;
  params: Record<string, any>;
  result?: any;
  error?: Error;
  duration?: number;
}

/**
 * Payload para eventos de procesamiento de mensajes
 */
export interface MessageProcessingPayload {
  messageId: string;
  content: string;
  state?: WindsurfState;
  duration?: number;
  error?: Error;
}

/**
 * Payload para eventos de sistema
 */
export interface SystemEventPayload {
  message: string;
  details?: Record<string, any>;
  error?: Error;
}
