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
  public async emit(eventType: EventType, payload: EventPayload = {}): Promise<void> {
    console.log(`[EventBus] Emitiendo evento: ${eventType}`, payload);
    
    const handlers = this.eventHandlers.get(eventType) || [];
    
    try {
      // Ejecutar todos los manejadores para este evento
      for (const handler of handlers) {
        await Promise.resolve(handler(payload));
      }
    } catch (error) {
      console.error(`[EventBus] Error al procesar evento ${eventType}:`, error);
      // Re-emitir como evento de error si no es ya un evento de error
      if (eventType !== 'error') {
        this.emit('error', { 
          source: eventType,
          originalPayload: payload,
          error
        });
      }
    }
  }
}