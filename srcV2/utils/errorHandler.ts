import { ConfigurationManager } from '../core/config/ConfigurationManager';
import { EventBus } from '../core/event/eventBus';
import { ACTIONS, MESSAGE_TYPES } from '../core/config/constants';


export interface ErrorInfo {
  message: string;
  stack?: string;
  source?: string;
}

export class ErrorHandler {
  private eventBus: EventBus;
  
  constructor(
    private configManager: ConfigurationManager
  ) {
    this.eventBus = EventBus.getInstance();
  }
  
  public handleError(error: any, source?: string): ErrorInfo {
    let message: string;
    let stack: string | undefined;

    if (error instanceof Error) {
      message = error.message;
      stack = error.stack;
    } else if (typeof error === 'string') {
      message = error;
      stack = undefined;
    } else if (typeof error === 'object' && error !== null) {
      message = error.message || JSON.stringify(error);
      stack = error.stack;
    } else {
      message = String(error);
      stack = undefined;
    }

    // Log simple para debug
    console.error(`[ErrorHandler] ${source ? `[${source}] ` : ''}`, message, stack);

    return {
      message,
      stack,
      source,
    };
  }
  
  /**
   * Método centralizado para manejar errores de forma unificada
   * - Actualiza el estado de la UI
   * - Genera una respuesta de error
   * - Emite eventos relevantes
   */
  public async handleAndRespondToError(error: any, source?: string): Promise<string> {
    const errorInfo = this.handleError(error, source);
    
    // Actualizar estado de UI
    this.configManager.setError(errorInfo.message);
    this.configManager.setProcessingState(false);
    
    // Emitir evento de error
    this.eventBus.emit(MESSAGE_TYPES.ERROR, errorInfo);
    
    // Generar mensaje de error para el usuario
    const errorResponse = `Lo siento, ocurrió un error: ${errorInfo.message}`;
    
    // Emitir evento de mensaje recibido con error
    this.eventBus.emit(ACTIONS.MESSAGE_RECEIVE, { 
      content: errorResponse, 
      success: false,
      error: errorInfo
    });
    
    return errorResponse;
  }
}