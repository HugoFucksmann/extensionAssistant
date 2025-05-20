/**
 * Bus de eventos centralizado para la arquitectura Windsurf
 * Implementa el patrón singleton para asegurar una única instancia
 */

import { EventManager } from './eventManager';
import { EventType, EventPayload, WindsurfEvent, BaseEventPayload } from './eventTypes';

/**
 * Bus de eventos centralizado para la arquitectura Windsurf
 * Implementa el patrón singleton para asegurar una única instancia
 */
export class EventBus {
  private static instance: EventBus;
  private eventManager: EventManager;
  
  /**
   * Constructor privado para implementar el patrón singleton
   */
  private constructor() {
    this.eventManager = new EventManager({
      maxHistorySize: 500,
      enableDebugEvents: true,
      enableEventFiltering: true,
      enableEventReplay: true
    });
    
    console.log('[EventBus] Initialized with advanced event handling capabilities');
  }
  
  /**
   * Obtiene la instancia única del bus de eventos
   */
  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }
  
  /**
   * Emite un evento con el tipo y payload especificados
   * @param type Tipo de evento
   * @param payload Datos asociados al evento
   * @returns El evento creado
   */
  emit(type: EventType, payload: EventPayload = {}): WindsurfEvent {
    // Añadir timestamp si no está presente
    if (!payload.timestamp) {
      payload.timestamp = Date.now();
    }
    
    // Emitir el evento a través del gestor de eventos
    return this.eventManager.emit(type, payload);
  }
  
  /**
   * Registra un listener para un tipo de evento específico
   * @param type Tipo de evento o array de tipos
   * @param listener Función callback para manejar el evento
   * @param filter Filtro opcional para los eventos
   * @returns ID único del listener para poder eliminarlo después
   */
  on(type: EventType | EventType[] | '*', listener: (event: WindsurfEvent) => void, filter?: any): string {
    return this.eventManager.on(type, listener, filter);
  }
  
  /**
   * Registra un listener para un solo evento
   * @param type Tipo de evento o array de tipos
   * @param listener Función callback para manejar el evento
   * @param filter Filtro opcional para los eventos
   * @returns ID único del listener
   */
  once(type: EventType | EventType[] | '*', listener: (event: WindsurfEvent) => void, filter?: any): string {
    return this.eventManager.once(type, listener, filter);
  }
  
  /**
   * Elimina un listener por su ID
   * @param listenerId ID del listener a eliminar
   */
  off(listenerId: string): void {
    this.eventManager.off(listenerId);
  }
  
  /**
   * Elimina todos los listeners para un tipo de evento específico
   * @param type Tipo de evento
   */
  removeAllListeners(type?: EventType | EventType[]): void {
    this.eventManager.removeAllListeners(type);
  }
  
  /**
   * Obtiene el historial de eventos, opcionalmente filtrado
   * @param filter Filtro para los eventos
   * @returns Array de eventos filtrados
   */
  getEventHistory(filter?: any): WindsurfEvent[] {
    return this.eventManager.getEventHistory(filter);
  }
  
  /**
   * Limpia el historial de eventos
   */
  clearEventHistory(): void {
    this.eventManager.clearEventHistory();
  }
  
  /**
   * Reproduce una secuencia de eventos desde el historial
   * @param filter Filtro para seleccionar los eventos a reproducir
   * @param speed Velocidad de reproducción (1 = tiempo real, 2 = doble velocidad, etc.)
   * @returns Promesa que se resuelve cuando finaliza la reproducción
   */
  async replayEvents(filter?: any, speed: number = 1): Promise<void> {
    return this.eventManager.replayEvents(filter, speed);
  }
  
  /**
   * Crea un evento de depuración de nivel log
   * @param message Mensaje de depuración
   * @param data Datos adicionales
   */
  debug(message: string, data?: any): void {
    this.emit(EventType.DEBUG_LOG, {
      message,
      data,
      level: 'log'
    });
  }
  
  /**
   * Crea un evento de depuración de nivel warning
   * @param message Mensaje de advertencia
   * @param data Datos adicionales
   */
  warn(message: string, data?: any): void {
    this.emit(EventType.DEBUG_WARNING, {
      message,
      data,
      level: 'warning'
    });
  }
  
  /**
   * Crea un evento de depuración de nivel error
   * @param message Mensaje de error
   * @param error Error original
   * @param data Datos adicionales
   */
  error(message: string, error?: Error, data?: any): void {
    this.emit(EventType.DEBUG_ERROR, {
      message,
      error: error?.message,
      stack: error?.stack,
      data,
      level: 'error'
    });
  }
}

// Exportar una instancia por defecto para facilitar su uso
export const eventBus = EventBus.getInstance();
