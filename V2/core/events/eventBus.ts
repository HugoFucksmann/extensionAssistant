import * as vscode from 'vscode';
import { AppCommands } from '../config/constants';
import { Plan, PlanStep } from '../orchestrator/planningEngine';

/**
 * Tipo para los eventos del sistema
 */
export type EventType = 
  // Eventos base existentes
  | typeof AppCommands.MESSAGE_SEND
  | typeof AppCommands.MESSAGE_RECEIVE
  | typeof AppCommands.MESSAGE_PROCESSING
  | typeof AppCommands.MODEL_CHANGE
  | typeof AppCommands.MODEL_CHANGED
  | typeof AppCommands.CHAT_NEW
  | typeof AppCommands.CHAT_LOAD
  | typeof AppCommands.CHAT_LOADED
  | typeof AppCommands.CHAT_LIST_LOAD
  | typeof AppCommands.CHAT_LIST_LOADED
  | typeof AppCommands.CONFIG_CHANGED
  | typeof AppCommands.ERROR
  
  // Eventos de compatibilidad legacy
  | 'chat:loaded'
  | 'chat:list:loaded'
  | 'history:loaded'
  
  // Nuevos eventos de planificación
  | typeof AppCommands.PLAN_CREATE
  | typeof AppCommands.PLAN_EXECUTE
  | typeof AppCommands.PLAN_PAUSE
  | typeof AppCommands.PLAN_RESUME
  | typeof AppCommands.PLAN_CANCEL
  | typeof AppCommands.PLAN_STATUS_GET
  | typeof AppCommands.PLAN_CREATED
  | typeof AppCommands.PLAN_UPDATED
  | typeof AppCommands.PLAN_COMPLETED
  | typeof AppCommands.PLAN_FAILED
  
  // Nuevos eventos de pasos
  | typeof AppCommands.STEP_STARTED
  | typeof AppCommands.STEP_UPDATED
  | typeof AppCommands.STEP_COMPLETED
  | typeof AppCommands.STEP_FAILED
  | typeof AppCommands.STEP_SKIPPED
  
  // Nuevos eventos de herramientas
  | typeof AppCommands.TOOL_EXECUTE
  | typeof AppCommands.TOOL_LIST;

/**
 * Tipos específicos para payloads de eventos de planificación
 */
export interface PlanEventPayload {
  plan: Plan;
  message?: string;
  sessionId?: string;
  success?: boolean;
  reason?: string;
}

export interface StepEventPayload {
  step: PlanStep;
  planId: string;
  message?: string;
  progress?: number;
  result?: any;
  error?: Error;
}

export interface ToolExecutePayload {
  toolName: string;
  parameters: Record<string, any>;
  context?: any;
}

/**
 * Payload para los diferentes tipos de eventos
 */
export interface EventPayload {
  [key: string]: any;
}

/**
 * Tipo para los manejadores de eventos
 */
export type EventHandler = (payload: EventPayload) => Promise<void> | void;

/**
 * Bus de eventos para comunicación entre componentes
 * Elimina dependencias circulares utilizando el patrón mediador
 */
export class EventBus {
  private eventHandlers: Map<EventType, EventHandler[]> = new Map();
  private processingEvents = new Set<string>();
  private maxRecursionDepth = 3;
  private recursionCounter = new Map<EventType, number>();
  private logger: any;

  constructor(logger?: any) {
    this.logger = logger || console;
    this.logger.log('[EventBus] Inicializado');
  }

  /**
   * Registra un manejador para un tipo de evento específico
   * @param eventType Tipo de evento a escuchar
   * @param handler Función a ejecutar cuando ocurre el evento
   * @returns Función para cancelar la suscripción
   */
  public on(eventType: EventType, handler: EventHandler): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }

    const handlers = this.eventHandlers.get(eventType)!;
    handlers.push(handler);
    
    this.logger.log(`[EventBus] Registrado manejador para ${eventType}, total: ${handlers.length}`);

    // Devolver función para eliminar el manejador
    return () => {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
        this.logger.log(`[EventBus] Eliminado manejador para ${eventType}, quedan: ${handlers.length}`);
      }
    };
  }

  /**
   * Registra un manejador para múltiples tipos de eventos
   * @param eventTypes Tipos de eventos a escuchar
   * @param handler Función a ejecutar cuando ocurre cualquiera de los eventos
   * @returns Array de funciones para cancelar las suscripciones
   */
  public onMultiple(eventTypes: EventType[], handler: EventHandler): (() => void)[] {
    return eventTypes.map(eventType => this.on(eventType, handler));
  }

  /**
   * Emite un evento con su payload a todos los manejadores registrados
   * @param eventType Tipo de evento a emitir
   * @param payload Datos asociados al evento
   */
  public async emit(eventType: EventType, payload: EventPayload = {}): Promise<void> {
    // Generar un ID único para este evento específico
    const eventId = `${eventType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Verificar si ya estamos procesando este tipo de evento para evitar bucles
    if (this.processingEvents.has(eventType)) {
      this.logger.warn(`[EventBus] Posible bucle detectado para evento: ${eventType}. Ignorando emisión duplicada.`);
      return;
    }
    
    // Verificar la profundidad de recursión para este tipo de evento
    const currentDepth = this.recursionCounter.get(eventType) || 0;
    if (currentDepth >= this.maxRecursionDepth) {
      this.logger.error(`[EventBus] Máxima profundidad de recursión alcanzada para evento: ${eventType}. Deteniendo la cadena de eventos.`);
      return;
    }
    
    // Incrementar contador de recursión
    this.recursionCounter.set(eventType, currentDepth + 1);
    
    // Marcar este tipo de evento como en procesamiento
    this.processingEvents.add(eventType);
    
    this.logger.log(`[EventBus] Emitiendo evento: ${eventType} (ID: ${eventId})`, payload);
    
    const handlers = this.eventHandlers.get(eventType) || [];
    
    try {
      // Ejecutar todos los manejadores para este evento
      for (const handler of handlers) {
        try {
          await Promise.resolve(handler(payload));
        } catch (handlerError) {
          this.logger.error(`[EventBus] Error en manejador individual para ${eventType}:`, handlerError);
          // No propagar el error para que otros manejadores puedan ejecutarse
        }
      }
    } catch (error) {
      this.logger.error(`[EventBus] Error al procesar evento ${eventType}:`, error);
      // Re-emitir como evento de error si no es ya un evento de error, con protección contra bucles
      if (eventType !== AppCommands.ERROR && !this.processingEvents.has(AppCommands.ERROR)) {
        await this.emit(AppCommands.ERROR, { 
          source: eventType,
          originalPayload: payload,
          error
        });
      }
    } finally {
      // Limpiar: marcar el evento como ya no en procesamiento
      this.processingEvents.delete(eventType);
      
      // Decrementar contador de recursión
      const newDepth = (this.recursionCounter.get(eventType) || 1) - 1;
      if (newDepth <= 0) {
        this.recursionCounter.delete(eventType);
      } else {
        this.recursionCounter.set(eventType, newDepth);
      }
    }
  }

  /**
   * Elimina todos los manejadores registrados para un tipo de evento
   * @param eventType Tipo de evento para el que eliminar manejadores
   */
  public clearHandlers(eventType: EventType): void {
    if (this.eventHandlers.has(eventType)) {
      const count = this.eventHandlers.get(eventType)!.length;
      this.eventHandlers.set(eventType, []);
      this.logger.log(`[EventBus] Eliminados ${count} manejadores para ${eventType}`);
    }
  }

  /**
   * Elimina todos los manejadores de eventos
   */
  public clearAllHandlers(): void {
    const total = Array.from(this.eventHandlers.values()).reduce((sum, handlers) => sum + handlers.length, 0);
    this.eventHandlers.clear();
    this.logger.log(`[EventBus] Eliminados todos los manejadores (${total} en total)`);
  }
}