// src/events/EventEmitterService.ts

import EventEmitter3 from 'eventemitter3';

// Define tipos de eventos si quieres tipado fuerte, opcional inicialmente
// type ExtensionEvents =
//   | 'toolCalled' | { toolName: string; params: any }
//   | 'toolCompleted' | { toolName: string; result: any; duration: number }
//   | 'toolFailed' | { toolName: string; error: any }
//   | 'promptCalled' | { promptType: string; variables: any }
//   | 'promptCompleted' | { promptType: string; result: any; duration: number }
//   | 'promptFailed' | { promptType: string; error: any }
//   | 'validationFailed' | { schemaName: string; data: any; error: any }
//   | 'chatMessageAdded' | { chatId: string; message: any }
//   | 'chatListUpdated' | { chats: any[] }
//   | 'graphNodeStart' | { nodeId: string; state: any }
//   | 'graphNodeEnd' | { nodeId: string; result: any }
//   | 'graphError' | { nodeId: string; error: any };


/**
 * Servicio Singleton para manejar eventos en la extensión.
 * Utiliza EventEmitter3 para una comunicación desacoplada.
 */
export class EventEmitterService {
    private static instance: EventEmitterService;
    private emitter: EventEmitter3;

    private constructor() {
        this.emitter = new EventEmitter3();
        console.log('[EventEmitterService] Initialized.');
    }

    /**
     * Obtiene la instancia única del servicio.
     * @returns La instancia de EventEmitterService.
     */
    public static getInstance(): EventEmitterService {
        if (!EventEmitterService.instance) {
            EventEmitterService.instance = new EventEmitterService();
        }
        return EventEmitterService.instance;
    }

    /**
     * Suscribe un listener a un evento.
     * @param event El nombre del evento.
     * @param listener La función a ejecutar cuando se emita el evento.
     * @param context El contexto (this) para el listener (opcional).
     * @returns La instancia del emisor para encadenar llamadas.
     */
    on(event: string | symbol, listener: EventEmitter3.ListenerFn, context?: any): EventEmitter3 {
        return this.emitter.on(event, listener, context);
    }

     /**
     * Suscribe un listener que se ejecutará una sola vez.
     * @param event El nombre del evento.
     * @param listener La función a ejecutar una sola vez.
     * @param context El contexto (this) para el listener (opcional).
     * @returns La instancia del emisor para encadenar llamadas.
     */
    once(event: string | symbol, listener: EventEmitter3.ListenerFn, context?: any): EventEmitter3 {
        return this.emitter.once(event, listener, context);
    }

    /**
     * Desuscribe un listener de un evento.
     * @param event El nombre del evento.
     * @param listener La función a desuscribir.
     * @param context El contexto (this) usado para suscribir (opcional).
     * @param once Indica si el listener fue suscrito con 'once' (opcional).
     * @returns La instancia del emisor para encadenar llamadas.
     */
    off(event: string | symbol, listener: EventEmitter3.ListenerFn, context?: any, once?: boolean): EventEmitter3 {
         return this.emitter.off(event, listener, context, once);
    }

    /**
     * Removes all listeners for a specific event or all events if no event is specified.
     * @param event The name of the event (optional). If not provided, removes all listeners.
     * @returns The instance of the emitter for method chaining.
     */
    public removeAllListeners(event?: string | symbol): EventEmitter3 {
        return this.emitter.removeAllListeners(event);
    }

    /**
     * Emite un evento, ejecutando todos los listeners suscritos.
     * @param event El nombre del evento.
     * @param args Argumentos a pasar a los listeners.
     * @returns true si el evento tuvo listeners, false de lo contrario.
     */
    emit(event: string | symbol, ...args: any[]): boolean {
        // console.debug(`[EventEmitterService] Emitting event: ${String(event)}`, ...args); // Log verboso opcional
        return this.emitter.emit(event, ...args);
    }

    /**
     * Dispone el servicio (si hay listeners internos que limpiar).
     * EventEmitter3 no requiere dispose explícito para listeners externos,
     * pero es buena práctica si el servicio tuviera listeners propios.
     */
    dispose(): void {
        this.removeAllListeners();
        console.log('[EventEmitterService] Disposed.');
        // Opcional: DatabaseManager.instance = null; si se necesitara reiniciar el singleton (generalmente no es necesario)
    }
}