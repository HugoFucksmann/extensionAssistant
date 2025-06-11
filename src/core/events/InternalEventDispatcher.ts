// src/core/events/InternalEventDispatcher.ts
import { EventType, EventPayload, WindsurfEvent, EventFilter, SystemEventPayload } from '../../features/events/eventTypes'; // Reutiliza tus tipos de eventos existentes
import { generateUniqueId } from '../../shared/utils/generateIds';
import EventEmitter from 'eventemitter3';

import { Disposable } from '../interfaces/Disposable';

export class InternalEventDispatcher implements Disposable {
  private emitter: EventEmitter;
  private eventHistory: WindsurfEvent[] = [];
  private maxHistorySize: number = 200;

  constructor() {
    this.emitter = new EventEmitter();
  }

  /**
   * Despacha un evento tipado.
   * @param type El tipo de evento desde EventType enum.
   * @param payload El payload del evento, conforme a la interfaz correspondiente.
   * @param forcedId Un ID opcional para forzar, útil para correlacionar eventos.
   * @returns El objeto WindsurfEvent completo que fue emitido.
   */
  public dispatch<T extends EventType>(
    type: T,
    // CAMBIO CLAVE: Usar un tipo genérico para que TypeScript valide el payload contra el tipo de evento.
    // Omitimos 'timestamp' porque el dispatcher lo gestionará de forma centralizada.
    payload: Omit<Extract<EventPayload, { __eventType?: T } | (EventPayload & { chatId?: string })>, 'timestamp'>,
    forcedId?: string
  ): WindsurfEvent {
    const event: WindsurfEvent = {
      type,
      // CAMBIO CLAVE: Aseguramos que el timestamp se establezca aquí, evitando duplicados o ausencias.
      // El payload se une con un timestamp gestionado centralmente.
      payload: {
        ...payload,
        timestamp: Date.now(),
      } as EventPayload, // Hacemos un cast aquí después de añadir el timestamp
      timestamp: Date.now(),
      id: forcedId || generateUniqueId(),
    };

    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    this.emitter.emit(type, event);

    return event;
  }

  /**
   * Se suscribe a uno o más tipos de eventos, o a todos con '*'.
   * @param type El tipo de evento, un array de tipos, o '*' para todos.
   * @param listener La función callback que se ejecutará cuando el evento ocurra.
   * @returns Un objeto con una función `unsubscribe` para remover el listener.
   */
  public subscribe(
    type: EventType | EventType[] | '*',
    listener: (event: WindsurfEvent) => void
  ): { unsubscribe: () => void } {
    const typesToSubscribe = Array.isArray(type) ? type : [type];

    typesToSubscribe.forEach(t => {
      this.emitter.on(t, listener);
    });

    return {
      unsubscribe: () => {
        typesToSubscribe.forEach(t => {
          this.emitter.off(t, listener);
        });
      },
    };
  }

  public once(
    type: EventType,
    listener: (event: WindsurfEvent) => void
  ): { unsubscribe: () => void } {
    this.emitter.once(type, listener);
    return {
      unsubscribe: () => {
        this.emitter.off(type, listener);
      }
    }
  }

  public getEventHistory(filter?: EventFilter): WindsurfEvent[] {
    if (!filter) {
      return [...this.eventHistory];
    }
    return this.eventHistory.filter(event => this.passesFilter(event, filter));
  }

  private passesFilter(event: WindsurfEvent, filter: EventFilter): boolean {
    if (filter.types && !filter.types.includes(event.type)) return false;
    if (filter.chatId && event.payload.chatId !== filter.chatId) return false;
    return true;
  }

  public dispose(): void {
    this.emitter.removeAllListeners();
    this.eventHistory = [];
    console.log('[InternalEventDispatcher] Disposed and all listeners removed.');
  }

  // CAMBIO CLAVE: Hacer los métodos de ayuda más seguros y consistentes.
  public systemInfo(message: string, details?: Record<string, any>, source?: string, chatId?: string): void {
    const payload: Omit<SystemEventPayload, 'timestamp'> = { message, details, source, chatId, level: 'info' };
    this.dispatch(EventType.SYSTEM_INFO, payload);
  }

  public systemWarning(message: string, details?: Record<string, any>, source?: string, chatId?: string): void {
    const payload: Omit<SystemEventPayload, 'timestamp'> = { message, details, source, chatId, level: 'warning' };
    this.dispatch(EventType.SYSTEM_WARNING, payload);
  }

  public systemError(message: string, error?: Error, details?: Record<string, any>, source?: string, chatId?: string): void {
    const payload: Omit<SystemEventPayload, 'timestamp'> = {
      message,
      error: error?.message,
      details,
      source,
      chatId,
      errorObject: error,
      level: 'error'
    };
    this.dispatch(EventType.SYSTEM_ERROR, payload);
  }
}