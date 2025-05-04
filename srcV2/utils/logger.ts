/**
 * Niveles de log soportados por el sistema
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 100 // Para desactivar completamente el logging
}

/**
 * Interfaz para el servicio de logging
 */
export interface LoggerService {
  /**
   * Registra un mensaje de nivel DEBUG
   */
  debug(message: string, context?: object): void;
  
  /**
   * Registra un mensaje de nivel INFO
   */
  info(message: string, context?: object): void;
  
  /**
   * Registra un mensaje de nivel WARN
   */
  warn(message: string, context?: object): void;
  
  /**
   * Registra un mensaje de nivel ERROR
   */
  error(message: string, context?: object): void;
  
  /**
   * Establece el nivel mínimo de log a mostrar
   */
  setLevel(level: LogLevel): void;
  
  /**
   * Obtiene el nivel actual de log
   */
  getLevel(): LogLevel;
}

/**
 * Implementación de logger que utiliza la consola
 */
export class ConsoleLogger implements LoggerService {
  private level: LogLevel = LogLevel.INFO;
  private static instance: ConsoleLogger | null = null;
  
  private constructor() {
    // Constructor privado para implementar Singleton
  }
  
  /**
   * Obtiene la instancia única del logger
   */
  public static getInstance(): ConsoleLogger {
    if (!ConsoleLogger.instance) {
      ConsoleLogger.instance = new ConsoleLogger();
    }
    return ConsoleLogger.instance;
  }
  
  public debug(message: string, context?: object): void {
    if (this.level <= LogLevel.DEBUG) {
      this.log('DEBUG', message, context);
    }
  }
  
  public info(message: string, context?: object): void {
    if (this.level <= LogLevel.INFO) {
      this.log('INFO', message, context);
    }
  }

  public warn(message: string, context?: object): void {
    if (this.level <= LogLevel.WARN) {
      this.log('WARN', message, context);
    }
  }

  public error(message: string, context?: object): void {
    if (this.level <= LogLevel.ERROR) {
      this.log('ERROR', message, context);
    }
  }
  
  public setLevel(level: LogLevel): void {
    this.level = level;
  }
  
  public getLevel(): LogLevel {
    return this.level;
  }
  
  private log(level: string, message: string, context?: object): void {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level}] ${message}`;
    
    switch (level) {
      case 'DEBUG':
      case 'INFO':
        if (context) {
          console.info(formattedMessage, this.formatContext(context));
        } else {
          console.info(formattedMessage);
        }
        break;
      case 'WARN':
        if (context) {
          console.warn(formattedMessage, this.formatContext(context));
        } else {
          console.warn(formattedMessage);
        }
        break;
      case 'ERROR':
        if (context) {
          console.error(formattedMessage, this.formatContext(context));
        } else {
          console.error(formattedMessage);
        }
        break;
    }
  }
  
  private formatContext(context: object): string {
    try {
      return JSON.stringify(context, this.circularReplacer(), 2);
    } catch (e) {
      return '[Error al formatear contexto]';
    }
  }
  
  /**
   * Reemplazador para JSON.stringify que maneja referencias circulares
   */
  private circularReplacer() {
    const seen = new WeakSet();
    return (key: string, value: any) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Referencia Circular]';
        }
        seen.add(value);
      }
      return value;
    };
  }
}

// Instancia global reutilizable
export const logger = ConsoleLogger.getInstance();
