// src/shared/utils/FeedbackManager.ts
import { InternalEventDispatcher } from '../../core/events/InternalEventDispatcher';
import { EventType, SystemEventPayload, ToolExecutionEventPayload } from '../../features/events/eventTypes';
import { logger } from './logger';
import { ToolOutput } from '../types';
import { generateOperationId } from './generateIds';

/**
 * Tipos de feedback que pueden ser enviados al usuario
 */
export enum FeedbackType {
  // Feedback sobre el proceso de AI
  MODEL_THINKING = 'model:thinking',
  MODEL_ANALYZING = 'model:analyzing',
  MODEL_PLANNING = 'model:planning',
  MODEL_GENERATING = 'model:generating',
  
  // Feedback sobre herramientas
  TOOL_EXECUTING = 'tool:executing',
  TOOL_COMPLETED = 'tool:completed',
  TOOL_ERROR = 'tool:error',
  
  // Feedback sobre el sistema
  SYSTEM_INFO = 'system:info',
  SYSTEM_WARNING = 'system:warning',
  SYSTEM_ERROR = 'system:error',
}

/**
 * Interfaz base para todos los payloads de feedback
 */
export interface FeedbackPayload {
  message: string;
  details?: Record<string, any>;
  timestamp?: number;
  chatId?: string;
  source?: string;
  operationId?: string;
}

/**
 * Payload específico para feedback de herramientas
 */
export interface ToolFeedbackPayload extends FeedbackPayload {
  toolName: string;
  toolDescription?: string;
  parameters?: Record<string, any>;
  result?: ToolOutput;
  error?: string;
  duration?: number;
}

/**
 * Payload específico para feedback del modelo
 */
export interface ModelFeedbackPayload extends FeedbackPayload {
  phase?: string;
  iteration?: number;
  content?: string;
  duration?: number;
}

/**
 * Gestor centralizado de feedback para la UI y logs
 */
export class FeedbackManager {
  private static instance: FeedbackManager;
  
  private constructor(private dispatcher: InternalEventDispatcher) {}
  
  /**
   * Obtiene la instancia singleton del FeedbackManager
   */
  public static getInstance(dispatcher?: InternalEventDispatcher): FeedbackManager {
    if (!FeedbackManager.instance && dispatcher) {
      FeedbackManager.instance = new FeedbackManager(dispatcher);
    }
    
    if (!FeedbackManager.instance) {
      throw new Error('FeedbackManager no ha sido inicializado. Proporciona un dispatcher.');
    }
    
    return FeedbackManager.instance;
  }
  
  /**
   * Envía feedback sobre el proceso de pensamiento del modelo
   */
  public sendModelFeedback(
    type: FeedbackType,
    payload: ModelFeedbackPayload
  ): void {
    // Asegurar que tenemos un timestamp
    const timestamp = payload.timestamp || Date.now();
    const operationId = payload.operationId || generateOperationId();
    
    // Loguear información
    logger.info(`[${type}] ${payload.message}`, {
      ...payload.details,
      chatId: payload.chatId,
      source: payload.source || 'FeedbackManager'
    });
    
    // Mapear a eventos del sistema según el tipo
    switch (type) {
      case FeedbackType.MODEL_THINKING:
      case FeedbackType.MODEL_ANALYZING:
      case FeedbackType.MODEL_PLANNING:
      case FeedbackType.MODEL_GENERATING:
        // Enviar como evento de fase del agente
        this.dispatcher.dispatch(EventType.AGENT_PHASE_STARTED, {
          chatId: payload.chatId,
          phase: this.mapFeedbackTypeToPhase(type),
          timestamp,
          source: payload.source || 'FeedbackManager',
          operationId,
          data: payload.details,
          iteration: payload.iteration
        });
        break;
        
      case FeedbackType.SYSTEM_INFO:
      case FeedbackType.SYSTEM_WARNING:
      case FeedbackType.SYSTEM_ERROR:
        // Enviar como evento del sistema
        const level = type === FeedbackType.SYSTEM_INFO 
          ? 'info' 
          : type === FeedbackType.SYSTEM_WARNING 
            ? 'warning' 
            : 'error';
            
        this.dispatcher.dispatch(EventType.SYSTEM_INFO, {
          message: payload.message,
          level,
          details: payload.details,
          timestamp,
          source: payload.source || 'FeedbackManager',
          chatId: payload.chatId,
          operationId
        } as SystemEventPayload);
        break;
    }
  }
  
  /**
   * Envía feedback sobre la ejecución de herramientas
   */
  public sendToolFeedback(
    type: FeedbackType,
    payload: ToolFeedbackPayload
  ): void {
    // Asegurar que tenemos un timestamp
    const timestamp = payload.timestamp || Date.now();
    const operationId = payload.operationId || generateOperationId();
    
    // Loguear información
    logger.info(`[${type}] ${payload.toolName}: ${payload.message}`, {
      ...payload.details,
      chatId: payload.chatId,
      source: payload.source || 'FeedbackManager'
    });
    
    // Mapear a eventos de herramientas según el tipo
    let eventType: EventType;
    
    switch (type) {
      case FeedbackType.TOOL_EXECUTING:
        eventType = EventType.TOOL_EXECUTION_STARTED;
        break;
      case FeedbackType.TOOL_COMPLETED:
        eventType = EventType.TOOL_EXECUTION_COMPLETED;
        break;
      case FeedbackType.TOOL_ERROR:
        eventType = EventType.TOOL_EXECUTION_ERROR;
        break;
      default:
        eventType = EventType.SYSTEM_INFO;
    }
    
    // Enviar evento
    this.dispatcher.dispatch(eventType, {
      toolName: payload.toolName,
      parameters: payload.parameters,
      toolParams: payload.parameters,
      result: payload.result,
      error: payload.error,
      duration: payload.duration,
      toolDescription: payload.toolDescription || payload.message,
      timestamp,
      source: payload.source || 'FeedbackManager',
      chatId: payload.chatId,
      operationId
    } as ToolExecutionEventPayload);
  }
  
  /**
   * Mapea un tipo de feedback a una fase del agente
   */
  private mapFeedbackTypeToPhase(type: FeedbackType): string {
    switch (type) {
      case FeedbackType.MODEL_THINKING:
        return 'reasoning';
      case FeedbackType.MODEL_ANALYZING:
        return 'initialAnalysis';
      case FeedbackType.MODEL_PLANNING:
        return 'planning';
      case FeedbackType.MODEL_GENERATING:
        return 'responseGeneration';
      default:
        return 'processing';
    }
  }
}
