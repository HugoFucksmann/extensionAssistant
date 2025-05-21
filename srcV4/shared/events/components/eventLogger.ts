// events/components/eventLogger.ts

/**
 * Sistema de logging para eventos de la arquitectura Windsurf
 */

import { EventBus } from '../core/eventBus'; // RUTA AJUSTADA
import { EventType, WindsurfEvent } from '../types/eventTypes'; // RUTA AJUSTADA

/**
 * Opciones de configuración para el EventLogger
 */
interface EventLoggerOptions {
  logToConsole?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  enableFileLogging?: boolean;
  logFilePath?: string;
  includeTimestamp?: boolean;
  includeEventId?: boolean;
  filterTypes?: EventType[];
}

/**
 * Sistema de logging para eventos
 */
export class EventLogger {
  private eventBus: EventBus;
  private options: EventLoggerOptions;
  private listenerIds: string[] = [];
  
  /**
   * Constructor del logger de eventos
   * @param options Opciones de configuración
   */
  constructor(options: EventLoggerOptions = {}) {
    this.eventBus = EventBus.getInstance();
    this.options = {
      logToConsole: true,
      logLevel: 'info',
      enableFileLogging: false,
      includeTimestamp: true,
      includeEventId: false,
      ...options
    };
    
    // Inicializar el logger
    this.initialize();
  }
  
  /**
   * Inicializa el logger y configura los listeners de eventos
   */
  private initialize(): void {
    // Registrar listener para todos los eventos
    const listenerId = this.eventBus.on('*', (event: WindsurfEvent) => {
      this.handleEvent(event);
    }, {
      types: this.options.filterTypes
    });
    
    this.listenerIds.push(listenerId);
    
    console.log('[EventLogger] Initialized with configuration:', this.options);
  }
  
  /**
   * Maneja un evento y lo registra según la configuración
   * @param event Evento a manejar
   */
  private handleEvent(event: WindsurfEvent): void {
    // Verificar si debemos procesar este tipo de evento según el nivel de log
    if (!this.shouldLogEvent(event)) {
      return;
    }
    
    // Formatear el mensaje de log
    const logMessage = this.formatLogMessage(event);
    
    // Registrar en la consola si está habilitado
    if (this.options.logToConsole) {
      this.logToConsole(event, logMessage);
    }
    
    // Registrar en archivo si está habilitado
    if (this.options.enableFileLogging && this.options.logFilePath) {
      this.logToFile(logMessage);
    }
  }
  
  /**
   * Determina si un evento debe ser registrado según el nivel de log
   * @param event Evento a comprobar
   * @returns true si el evento debe ser registrado
   */
  private shouldLogEvent(event: WindsurfEvent): boolean {
    // Si hay filtro de tipos y el evento no está incluido, no registrar
    if (this.options.filterTypes && !this.options.filterTypes.includes(event.type)) {
      return false;
    }
    
    // Filtrar según el nivel de log
    switch (this.options.logLevel) {
      case 'error':
        return event.type === EventType.ERROR_OCCURRED || 
               event.type === EventType.DEBUG_ERROR;
      
      case 'warn':
        return event.type === EventType.ERROR_OCCURRED || 
               event.type === EventType.DEBUG_ERROR ||
               event.type === EventType.DEBUG_WARNING;
      
      case 'info':
        // Excluir eventos de depuración de nivel log
        return event.type !== EventType.DEBUG_LOG;
      
      case 'debug':
      default:
        // Registrar todos los eventos
        return true;
    }
  }
  
  /**
   * Formatea un mensaje de log para un evento
   * @param event Evento a formatear
   * @returns Mensaje formateado
   */
  private formatLogMessage(event: WindsurfEvent): string {
    const parts: string[] = [];
    
    // Añadir timestamp si está habilitado
    if (this.options.includeTimestamp) {
      const timestamp = new Date(event.timestamp).toISOString();
      parts.push(`[${timestamp}]`);
    }
    
    // Añadir tipo de evento
    parts.push(`[${event.type}]`);
    
    // Añadir ID de chat si está presente
    if (event.payload.chatId) {
      parts.push(`[Chat: ${event.payload.chatId}]`);
    }
    
    // Añadir ID del evento si está habilitado
    if (this.options.includeEventId) {
      parts.push(`[ID: ${event.id}]`);
    }
    
    // Añadir mensaje si está presente
    if ('message' in event.payload && event.payload.message) {
      parts.push(event.payload.message);
    }
    
    // Formatear el resto del payload
    const payloadStr = JSON.stringify(event.payload, (key, value) => {
      // Excluir campos ya incluidos en el mensaje
      if (key === 'timestamp' || key === 'chatId' || key === 'message') {
        return undefined;
      }
      return value;
    }, 2);
    
    if (payloadStr !== '{}') {
      parts.push(payloadStr);
    }
    
    return parts.join(' ');
  }
  
  /**
   * Registra un mensaje en la consola
   * @param event Evento original
   * @param message Mensaje formateado
   */
  private logToConsole(event: WindsurfEvent, message: string): void {
    // Usar diferentes métodos de console según el tipo de evento
    if (event.type === EventType.ERROR_OCCURRED || event.type === EventType.DEBUG_ERROR) {
      console.error(message);
    } else if (event.type === EventType.DEBUG_WARNING) {
      console.warn(message);
    } else if (event.type === EventType.DEBUG_LOG) {
      console.debug(message);
    } else {
      console.log(message);
    }
  }
  
  /**
   * Registra un mensaje en un archivo
   * @param message Mensaje a registrar
   */
  private logToFile(message: string): void {
    // En un entorno Node.js, aquí se escribiría en un archivo
    // En un entorno de navegador, esto podría no ser posible
    // Por ahora, simplemente lo registramos como no implementado
    console.warn('[EventLogger] File logging not implemented in this environment');
  }
  
  /**
   * Detiene el logger y elimina los listeners
   */
  dispose(): void {
    // Eliminar todos los listeners registrados
    this.listenerIds.forEach(id => {
      this.eventBus.off(id);
    });
    
    this.listenerIds = [];
    console.log('[EventLogger] Disposed');
  }
}

// Exportar una instancia por defecto con configuración estándar
export const eventLogger = new EventLogger();