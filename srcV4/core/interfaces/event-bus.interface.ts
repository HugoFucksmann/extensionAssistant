/**
 * Interfaz para el sistema de eventos de la arquitectura Windsurf
 * Define el contrato que debe implementar cualquier bus de eventos
 */

import { EventType, EventPayload, WindsurfEvent } from '../../events/eventTypes';

export interface IEventBus {
  /**
   * Emite un evento con el tipo y payload especificados
   * @param type Tipo de evento
   * @param payload Datos asociados al evento
   * @returns El evento creado
   */
  emit(type: EventType, payload?: EventPayload): WindsurfEvent;

  /**
   * Habilita o deshabilita el modo de depuración
   * @param enabled Indica si el modo de depuración debe estar activado
   */
  setDebugMode(enabled: boolean): void;
  
  /**
   * Registra un mensaje de depuración
   * @param args Argumentos a registrar
   */
  debug(...args: any[]): void;

  /**
   * Registra un listener para un tipo de evento específico
   * @param type Tipo de evento o array de tipos
   * @param listener Función callback para manejar el evento
   * @param filter Filtro opcional para los eventos
   * @returns ID único del listener para poder eliminarlo después
   */
  on(type: EventType | EventType[] | '*', listener: (event: WindsurfEvent) => void, filter?: any): string;

  /**
   * Registra un listener para un solo evento
   * @param type Tipo de evento o array de tipos
   * @param listener Función callback para manejar el evento
   * @param filter Filtro opcional para los eventos
   * @returns ID único del listener
   */
  once(type: EventType | EventType[] | '*', listener: (event: WindsurfEvent) => void, filter?: any): string;

  /**
   * Elimina un listener por su ID
   * @param listenerId ID del listener a eliminar
   */
  off(listenerId: string): void;

  /**
   * Elimina todos los listeners para un tipo de evento específico
   * @param type Tipo de evento
   */
  removeAllListeners(type?: EventType | EventType[]): void;

  /**
   * Obtiene el historial de eventos, opcionalmente filtrado
   * @param filter Filtro para los eventos
   * @returns Array de eventos filtrados
   */
  getEventHistory(filter?: any): WindsurfEvent[];

  /**
   * Limpia el historial de eventos
   */
  clearEventHistory(): void;

  /**
   * Registra un mensaje de depuración
   * @param message Mensaje de depuración
   * @param data Datos adicionales
   */
  debug(message: string, data?: any): void;

  /**
   * Crea un evento de depuración de nivel warning
   * @param message Mensaje de advertencia
   * @param data Datos adicionales
   */
  warn(message: string, data?: any): void;
}
