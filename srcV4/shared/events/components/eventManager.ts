// events/components/eventManager.ts

/**
 * Sistema avanzado de gestión de eventos para la arquitectura Windsurf
 */

import EventEmitter from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import { EventType, EventPayload, WindsurfEvent } from '../types/eventTypes'; // RUTA AJUSTADA

/**
 * Opciones para la configuración del EventManager
 */
interface EventManagerOptions {
  maxHistorySize?: number;
  enableDebugEvents?: boolean;
  enableEventFiltering?: boolean;
  enableEventReplay?: boolean;
}

/**
 * Filtro para eventos
 */
export interface EventFilter {
  types?: EventType[];
  chatId?: string;
  timeRange?: {
    start?: number;
    end?: number;
  };
  custom?: (event: WindsurfEvent) => boolean;
}

/**
 * Gestor avanzado de eventos para la arquitectura Windsurf
 */
export class EventManager {
  private emitter: EventEmitter;
  private eventHistory: WindsurfEvent[] = [];
  private options: EventManagerOptions;
  private eventListeners: Map<string, Set<Function>> = new Map();
  
  /**
   * Constructor del gestor de eventos
   * @param options Opciones de configuración
   */
  constructor(options: EventManagerOptions = {}) {
    this.emitter = new EventEmitter();
    this.options = {
      maxHistorySize: 1000,
      enableDebugEvents: true,
      enableEventFiltering: true,
      enableEventReplay: true,
      ...options
    };
  }
  
  /**
   * Emite un evento con el tipo y payload especificados
   * @param type Tipo de evento
   * @param payload Datos asociados al evento
   * @returns El evento creado
   */
  emit(type: EventType, payload: EventPayload = {}): WindsurfEvent {
    // Crear el evento completo
    const event: WindsurfEvent = {
      type,
      payload: {
        ...payload,
        timestamp: payload.timestamp || Date.now()
      },
      timestamp: Date.now(),
      id: uuidv4()
    };
    
    // Almacenar el evento en el historial
    this.storeEvent(event);
    
    // Emitir el evento
    this.emitter.emit(type, event);
    
    // Emitir también como evento genérico para capturar todos los eventos
    this.emitter.emit('*', event);
    
    return event;
  }
  
  /**
   * Registra un listener para un tipo de evento específico
   * @param type Tipo de evento o array de tipos
   * @param listener Función callback para manejar el evento
   * @param filter Filtro opcional para los eventos
   * @returns ID único del listener para poder eliminarlo después
   */
  on(type: EventType | EventType[] | '*', listener: (event: WindsurfEvent) => void, filter?: EventFilter): string {
    const listenerId = uuidv4();
    
    // Crear una función wrapper que aplique el filtro si es necesario
    const wrappedListener = (event: WindsurfEvent) => {
      if (!filter || this.passesFilter(event, filter)) {
        listener(event);
      }
    };
    
    // Registrar el listener para cada tipo de evento
    if (Array.isArray(type)) {
      type.forEach(t => {
        this.emitter.on(t, wrappedListener);
        this.registerListener(t, wrappedListener, listenerId);
      });
    } else {
      this.emitter.on(type, wrappedListener);
      this.registerListener(type, wrappedListener, listenerId);
    }
    
    return listenerId;
  }
  
  /**
   * Registra un listener para un solo evento
   * @param type Tipo de evento o array de tipos
   * @param listener Función callback para manejar el evento
   * @param filter Filtro opcional para los eventos
   * @returns ID único del listener
   */
  once(type: EventType | EventType[] | '*', listener: (event: WindsurfEvent) => void, filter?: EventFilter): string {
    const listenerId = uuidv4();
    
    // Crear una función wrapper que aplique el filtro si es necesario
    const onceWrappedListener = (event: WindsurfEvent) => {
      if (!filter || this.passesFilter(event, filter)) {
        listener(event);
        this.off(listenerId);
      }
    };
    
    // Registrar el listener para cada tipo de evento
    if (Array.isArray(type)) {
      type.forEach(t => {
        this.emitter.once(t, onceWrappedListener);
        this.registerListener(t, onceWrappedListener, listenerId);
      });
    } else {
      this.emitter.once(type, onceWrappedListener);
      this.registerListener(type, onceWrappedListener, listenerId);
    }
    
    return listenerId;
  }
  
  /**
   * Elimina un listener por su ID
   * @param listenerId ID del listener a eliminar
   */
  off(listenerId: string): void {
    // Buscar y eliminar el listener de todos los tipos de eventos
    this.eventListeners.forEach((listeners, type) => {
      const listenersToRemove = Array.from(listeners).filter(l => (l as any).listenerId === listenerId);
      
      listenersToRemove.forEach(listener => {
        this.emitter.removeListener(type, listener as (...args: any[]) => void);
        listeners.delete(listener);
      });
      
      // Si no quedan listeners para este tipo, eliminar la entrada
      if (listeners.size === 0) {
        this.eventListeners.delete(type);
      }
    });
  }
  
  /**
   * Elimina todos los listeners para un tipo de evento específico
   * @param type Tipo de evento
   */
  removeAllListeners(type?: EventType | EventType[]): void {
    if (type) {
      if (Array.isArray(type)) {
        type.forEach(t => {
          this.emitter.removeAllListeners(t);
          this.eventListeners.delete(t);
        });
      } else {
        this.emitter.removeAllListeners(type);
        this.eventListeners.delete(type);
      }
    } else {
      this.emitter.removeAllListeners();
      this.eventListeners.clear();
    }
  }
  
  /**
   * Obtiene el historial de eventos, opcionalmente filtrado
   * @param filter Filtro para los eventos
   * @returns Array de eventos filtrados
   */
  getEventHistory(filter?: EventFilter): WindsurfEvent[] {
    if (!filter) {
      return [...this.eventHistory];
    }
    
    return this.eventHistory.filter(event => this.passesFilter(event, filter));
  }
  
  /**
   * Limpia el historial de eventos
   */
  clearEventHistory(): void {
    this.eventHistory = [];
  }
  
  /**
   * Reproduce una secuencia de eventos desde el historial
   * @param filter Filtro para seleccionar los eventos a reproducir
   * @param speed Velocidad de reproducción (1 = tiempo real, 2 = doble velocidad, etc.)
   * @returns Promesa que se resuelve cuando finaliza la reproducción
   */
  async replayEvents(filter?: EventFilter, speed: number = 1): Promise<void> {
    if (!this.options.enableEventReplay) {
      throw new Error('Event replay is disabled in the configuration');
    }
    
    // Obtener los eventos a reproducir
    const events = this.getEventHistory(filter).sort((a, b) => a.timestamp - b.timestamp);
    
    if (events.length === 0) {
      return;
    }
    
    // Emitir evento de inicio de reproducción
    this.emit(EventType.DEBUG_LOG, {
      message: `Starting event replay of ${events.length} events`,
      data: { filter, speed }
    });
    
    // Reproducir los eventos manteniendo los intervalos de tiempo originales
    const startTime = events[0].timestamp;
    const replayStartTime = Date.now();
    
    for (const event of events) {
      // Calcular el tiempo que debe pasar antes de emitir este evento
      const originalDelay = event.timestamp - startTime;
      const replayDelay = originalDelay / speed;
      
      // Esperar el tiempo correspondiente
      const elapsedReplayTime = Date.now() - replayStartTime;
      const waitTime = Math.max(0, replayDelay - elapsedReplayTime);
      
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      // Emitir el evento como una reproducción
      const replayEvent = {
        ...event,
        payload: {
          ...event.payload,
          isReplay: true
        }
      };
      
      this.emitter.emit(event.type, replayEvent);
      this.emitter.emit('*', replayEvent);
    }
    
    // Emitir evento de fin de reproducción
    this.emit(EventType.DEBUG_LOG, {
      message: `Finished event replay of ${events.length} events`,
      data: { filter, speed }
    });
  }
  
  /**
   * Registra un listener en el mapa interno
   * @param type Tipo de evento
   * @param listener Función listener
   * @param listenerId ID único del listener
   */
  private registerListener(type: EventType | '*', listener: Function, listenerId: string): void {
    // Asignar el ID al listener para poder encontrarlo después
    (listener as any).listenerId = listenerId;
    
    // Registrar en el mapa
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    
    this.eventListeners.get(type)!.add(listener);
  }
  
  /**
   * Almacena un evento en el historial
   * @param event Evento a almacenar
   */
  private storeEvent(event: WindsurfEvent): void {
    // No almacenar eventos de depuración si están desactivados
    if (!this.options.enableDebugEvents && 
        (event.type === EventType.DEBUG_LOG || 
         event.type === EventType.DEBUG_WARNING || 
         event.type === EventType.DEBUG_ERROR)) {
      return;
    }
    
    // Añadir el evento al historial
    this.eventHistory.push(event);
    
    // Limitar el tamaño del historial
    if (this.eventHistory.length > this.options.maxHistorySize!) {
      this.eventHistory.shift();
    }
  }
  
  /**
   * Comprueba si un evento pasa un filtro
   * @param event Evento a comprobar
   * @param filter Filtro a aplicar
   * @returns true si el evento pasa el filtro
   */
  private passesFilter(event: WindsurfEvent, filter: EventFilter): boolean {
    // Si el filtro está desactivado, permitir todos los eventos
    if (!this.options.enableEventFiltering) {
      return true;
    }
    
    // Filtrar por tipo de evento
    if (filter.types && filter.types.length > 0 && !filter.types.includes(event.type)) {
      return false;
    }
    
    // Filtrar por ID de chat
    if (filter.chatId && event.payload.chatId !== filter.chatId) {
      return false;
    }
    
    // Filtrar por rango de tiempo
    if (filter.timeRange) {
      if (filter.timeRange.start !== undefined && event.timestamp < filter.timeRange.start) {
        return false;
      }
      if (filter.timeRange.end !== undefined && event.timestamp > filter.timeRange.end) {
        return false;
      }
    }
    
    // Filtro personalizado
    if (filter.custom && !filter.custom(event)) {
      return false;
    }
    
    return true;
  }
}