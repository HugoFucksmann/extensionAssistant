// NOTA: Este archivo es parte del flujo de orquestación y no se utiliza 
// en la implementación actual del flujo directo.

export type EventHandler = (...args: any[]) => void;

export class EventBus {
  private listeners: Map<string, EventHandler[]> = new Map();

  /**
   * Registra un handler para un evento
   */
  public on(event: string, handler: EventHandler): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
  }

  /**
   * Emite un evento a todos los handlers registrados
   */
  public emit(event: string, ...args: any[]): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(fn => {
        try {
          fn(...args);
        } catch (err) {
          // Opcional: Loggear errores de handlers
          // console.error(`[EventBus] Error in handler for '${event}':`, err);
        }
      });
    }
  }

  /**
   * Elimina todos los handlers de un evento (opcional)
   */
  public off(event: string, handler?: EventHandler): void {
    if (!handler) {
      this.listeners.delete(event);
    } else {
      const handlers = this.listeners.get(event);
      if (handlers) {
        this.listeners.set(event, handlers.filter(fn => fn !== handler));
      }
    }
  }

  // Singleton pattern opcional
  private static instance: EventBus;
  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }
}

// Se mantiene como referencia para la futura implementación del orquestador.