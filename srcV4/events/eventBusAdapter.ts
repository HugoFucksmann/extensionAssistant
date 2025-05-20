/**
 * Adaptador para el EventBus que implementa la interfaz IEventBus
 * Permite utilizar el EventBus existente a través de la interfaz definida
 */

import { IEventBus } from '../core/interfaces/event-bus.interface';
import { EventType, EventPayload, WindsurfEvent } from './eventTypes';
import { EventBus as OriginalEventBus } from './eventBus';

/**
 * Adaptador para el EventBus que implementa la interfaz IEventBus
 */
export class EventBusAdapter implements IEventBus {
  private eventBus: OriginalEventBus;
  
  /**
   * Constructor del adaptador
   * @param eventBus Instancia del EventBus original
   */
  constructor(eventBus: OriginalEventBus) {
    this.eventBus = eventBus;
  }
  
  /**
   * Obtiene una instancia del adaptador para el EventBus singleton
   * @returns Instancia del adaptador
   */
  public static getInstance(): IEventBus {
    return new EventBusAdapter(OriginalEventBus.getInstance());
  }
  
  /**
   * Emite un evento con el tipo y payload especificados
   * @param type Tipo de evento
   * @param payload Datos asociados al evento
   * @returns El evento creado
   */
  public emit(type: EventType, payload: EventPayload = {}): WindsurfEvent {
    return this.eventBus.emit(type, payload);
  }
  
  /**
   * Registra un listener para un tipo de evento específico
   * @param type Tipo de evento o array de tipos
   * @param listener Función callback para manejar el evento
   * @param filter Filtro opcional para los eventos
   * @returns ID único del listener para poder eliminarlo después
   */
  public on(type: EventType | EventType[] | '*', listener: (event: WindsurfEvent) => void, filter?: any): string {
    return this.eventBus.on(type, listener, filter);
  }
  
  /**
   * Registra un listener para un solo evento
   * @param type Tipo de evento o array de tipos
   * @param listener Función callback para manejar el evento
   * @param filter Filtro opcional para los eventos
   * @returns ID único del listener
   */
  public once(type: EventType | EventType[] | '*', listener: (event: WindsurfEvent) => void, filter?: any): string {
    return this.eventBus.once(type, listener, filter);
  }
  
  /**
   * Elimina un listener por su ID
   * @param listenerId ID del listener a eliminar
   */
  public off(listenerId: string): void {
    this.eventBus.off(listenerId);
  }
  
  /**
   * Elimina todos los listeners para un tipo de evento específico
   * @param type Tipo de evento
   */
  public removeAllListeners(type?: EventType | EventType[]): void {
    this.eventBus.removeAllListeners(type);
  }
  
  /**
   * Obtiene el historial de eventos, opcionalmente filtrado
   * @param filter Filtro para los eventos
   * @returns Array de eventos filtrados
   */
  public getEventHistory(filter?: any): WindsurfEvent[] {
    return this.eventBus.getEventHistory(filter);
  }
  
  /**
   * Limpia el historial de eventos
   */
  public clearEventHistory(): void {
    this.eventBus.clearEventHistory();
  }
  
  /**
   * Registra un mensaje de depuración
   * @param message Mensaje de depuración
   * @param data Datos adicionales
   */
  public debug(message: string, data?: any): void {
    this.eventBus.debug(message, data);
  }
  
  /**
   * Crea un evento de depuración de nivel warning
   * @param message Mensaje de advertencia
   * @param data Datos adicionales
   */
  public warn(message: string, data?: any): void {
    this.eventBus.warn(message, data);
  }
}
