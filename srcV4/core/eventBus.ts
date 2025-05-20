/**
 * EventBus centralizado para la comunicación entre componentes
 * Implementa un patrón Singleton para acceso global
 */

import EventEmitter from 'eventemitter3';
import { EventType, WindsurfEvent } from './events';

/**
 * Clase EventBus que extiende EventEmitter3
 * Proporciona métodos especializados para emitir y escuchar eventos
 */
export class EventBus extends EventEmitter {
  private static instance: EventBus;
  private eventHistory: WindsurfEvent[] = [];
  private maxHistorySize: number = 100;
  private debugMode: boolean = false;

  private constructor() {
    super();
  }

  /**
   * Obtiene la instancia única del EventBus
   */
  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Configura el tamaño máximo del historial de eventos
   */
  public setMaxHistorySize(size: number): void {
    this.maxHistorySize = size;
  }

  /**
   * Activa o desactiva el modo debug
   */
  public setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  /**
   * Emite un evento con payload tipado
   */
  public emitEvent<T>(type: EventType | string, payload: T, source?: string): void {
    const event: WindsurfEvent<T> = {
      type,
      timestamp: Date.now(),
      payload,
      source
    };

    // Añadir al historial
    this.addToHistory(event);

    // Log en modo debug
    if (this.debugMode) {
      console.log(`[EventBus] ${type}`, payload);
    }

    // Emitir el evento
    this.emit(type, event);
  }

  /**
   * Emite un evento de información del sistema
   */
  public info(message: string, details?: Record<string, any>, source?: string): void {
    this.emitEvent(EventType.SYSTEM_INFO, { message, details }, source);
  }

  /**
   * Emite un evento de advertencia del sistema
   */
  public warn(message: string, details?: Record<string, any>, source?: string): void {
    this.emitEvent(EventType.SYSTEM_WARNING, { message, details }, source);
  }

  /**
   * Emite un evento de error del sistema
   */
  public error(message: string, error?: Error, details?: Record<string, any>, source?: string): void {
    this.emitEvent(EventType.SYSTEM_ERROR, { message, error, details }, source);
  }

  /**
   * Añade un evento al historial
   */
  private addToHistory<T>(event: WindsurfEvent<T>): void {
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Obtiene el historial de eventos
   */
  public getEventHistory(): WindsurfEvent[] {
    return [...this.eventHistory];
  }

  /**
   * Obtiene eventos filtrados por tipo
   */
  public getEventsByType(type: EventType | string): WindsurfEvent[] {
    return this.eventHistory.filter(event => event.type === type);
  }

  /**
   * Limpia el historial de eventos
   */
  public clearEventHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Crea un puente con un EventEmitter existente
   * Útil para la migración desde sistemas antiguos
   */
  public bridgeWithEmitter(emitter: EventEmitter, eventMap?: Record<string, EventType>): void {
    if (!eventMap) {
      // Si no se proporciona un mapa, reenviar todos los eventos con el mismo nombre
      emitter.on('*', (type: string, ...args: any[]) => {
        this.emit(type, ...args);
      });
    } else {
      // Reenviar eventos según el mapa proporcionado
      Object.entries(eventMap).forEach(([sourceEvent, targetEvent]) => {
        emitter.on(sourceEvent, (...args: any[]) => {
          this.emit(targetEvent as string, ...args);
        });
      });
    }
  }
}

// Exportar la instancia única
export const eventBus = EventBus.getInstance();
