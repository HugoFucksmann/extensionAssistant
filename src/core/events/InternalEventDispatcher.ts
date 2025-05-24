// src/core/events/InternalEventDispatcher.ts
import { EventType, EventPayload, WindsurfEvent, EventFilter } from '../../features/events/eventTypes'; // Reutiliza tus tipos de eventos existentes
import { v4 as uuidv4 } from 'uuid';
import EventEmitter from 'eventemitter3'; // Usamos una librería robusta y conocida

export class InternalEventDispatcher {
  private emitter: EventEmitter;
  private eventHistory: WindsurfEvent[] = []; // Opcional: si quieres mantener un historial
  private maxHistorySize: number = 200; // Opcional

  constructor() {
    this.emitter = new EventEmitter();
    console.log('[InternalEventDispatcher] Initialized.');
  }

  /**
   * Despacha un evento tipado.
   * @param type El tipo de evento desde EventType enum.
   * @param payload El payload del evento, conforme a la interfaz correspondiente.
   * @returns El objeto WindsurfEvent completo que fue emitido.
   */
  public dispatch(type: EventType, payload: EventPayload): WindsurfEvent {
    const event: WindsurfEvent = {
      type,
      payload: {
        ...payload, // Asegura que el payload base se incluya
        timestamp: payload.timestamp || Date.now(), // Sobrescribe o añade timestamp al payload
      },
      timestamp: Date.now(), // Timestamp del evento en sí
      id: uuidv4(),
    };

    // Opcional: Guardar en historial
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Emitir para listeners específicos del tipo Y para listeners wildcard '*'
    this.emitter.emit(type, event);
    this.emitter.emit('*', event);

    // console.debug(`[InternalEventDispatcher] Dispatched event: ${type}`, payload); // Usar debug para no saturar consola
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

  /**
   * Se suscribe a un evento una sola vez.
   */
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


  /**
   * Obtiene el historial de eventos, opcionalmente filtrado.
   * @param filter Opcional: Un filtro para los eventos.
   * @returns Un array de WindsurfEvent.
   */
  public getEventHistory(filter?: EventFilter): WindsurfEvent[] {
    if (!filter) {
      return [...this.eventHistory];
    }
    return this.eventHistory.filter(event => this.passesFilter(event, filter));
  }

  private passesFilter(event: WindsurfEvent, filter: EventFilter): boolean {
    // Lógica de filtrado (puedes copiarla de tu EventBus actual si es compleja)
    if (filter.types && !filter.types.includes(event.type)) return false;
    if (filter.chatId && event.payload.chatId !== filter.chatId) return false;
    // ... más condiciones de filtro
    return true;
  }

  /**
   * Limpia todos los listeners y el historial.
   * Útil durante la desactivación de la extensión o para tests.
   */
  public dispose(): void {
    this.emitter.removeAllListeners();
    this.eventHistory = [];
    console.log('[InternalEventDispatcher] Disposed and all listeners removed.');
  }

  // Métodos de conveniencia para eventos comunes del sistema (opcional)
  public systemInfo(message: string, details?: Record<string, any>, source?: string): void {
    this.dispatch(EventType.SYSTEM_INFO, { message, details, source, level: 'info' });
  }

  public systemWarning(message: string, details?: Record<string, any>, source?: string): void {
    this.dispatch(EventType.SYSTEM_WARNING, { message, details, source, level: 'warning' });
  }

  public systemError(message: string, error?: Error, details?: Record<string, any>, source?: string): void {
    this.dispatch(EventType.SYSTEM_ERROR, {
      message,
      error: error?.message,
      stack: error?.stack,
      details,
      source,
      level: 'error'
    });
  }
}