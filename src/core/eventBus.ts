import * as vscode from 'vscode';

/**
 * Tipo para los eventos del sistema
 */
export type EventType = 
  | 'message:send'         // Usuario envía un mensaje
  | 'message:receive'      // Respuesta del asistente recibida
  | 'message:processing'   // Indicador de procesamiento de mensaje
  | 'model:change'         // Cambio de modelo
  | 'model:changed'        // Modelo cambiado
  | 'chat:new'             // Crear nuevo chat
  | 'chat:load'            // Cargar chat existente
  | 'chat:loaded'          // Chat cargado
  | 'chat:list:loaded'     // Lista de chats cargada
  | 'history:loaded'       // Historia de chats cargada
  | 'config:changed'       // Cambio en la configuración
  | 'error';               // Error en cualquier componente

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

    // Devolver función para eliminar el manejador
    return () => {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    };
  }

  /**
   * Emite un evento con su payload a todos los manejadores registrados
   * @param eventType Tipo de evento a emitir
   * @param payload Datos asociados al evento
   */
  private processingEvents = new Set<string>();
  private maxRecursionDepth = 3;
  private recursionCounter = new Map<EventType, number>();

  public async emit(eventType: EventType, payload: EventPayload = {}): Promise<void> {
    // Generar un ID único para este evento específico
    const eventId = `${eventType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Verificar si ya estamos procesando este tipo de evento para evitar bucles
    if (this.processingEvents.has(eventType)) {
      console.warn(`[EventBus] Posible bucle detectado para evento: ${eventType}. Ignorando emisión duplicada.`);
      return;
    }
    
    // Verificar la profundidad de recursión para este tipo de evento
    const currentDepth = this.recursionCounter.get(eventType) || 0;
    if (currentDepth >= this.maxRecursionDepth) {
      console.error(`[EventBus] Máxima profundidad de recursión alcanzada para evento: ${eventType}. Deteniendo la cadena de eventos.`);
      return;
    }
    
    // Incrementar contador de recursión
    this.recursionCounter.set(eventType, currentDepth + 1);
    
    // Marcar este tipo de evento como en procesamiento
    this.processingEvents.add(eventType);
    
    console.log(`[EventBus] Emitiendo evento: ${eventType} (ID: ${eventId})`, payload);
    
    const handlers = this.eventHandlers.get(eventType) || [];
    
    try {
      // Ejecutar todos los manejadores para este evento
      for (const handler of handlers) {
        try {
          await Promise.resolve(handler(payload));
        } catch (handlerError) {
          console.error(`[EventBus] Error en manejador individual para ${eventType}:`, handlerError);
          // No propagar el error para que otros manejadores puedan ejecutarse
        }
      }
    } catch (error) {
      console.error(`[EventBus] Error al procesar evento ${eventType}:`, error);
      // Re-emitir como evento de error si no es ya un evento de error, con protección contra bucles
      if (eventType !== 'error' && !this.processingEvents.has('error')) {
        await this.emit('error', { 
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
}