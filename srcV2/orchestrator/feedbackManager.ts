// src/services/feedbackManager.ts

/**
 * Gestor de Retroalimentación
 * * Responsabilidad: Centralizar el manejo de errores, advertencias, mensajes informativos
 * y la retroalimentación general del sistema hacia el usuario o hacia otros componentes.
 * Decide cómo manejar un problema (registrar, notificar, intentar recuperación).
 */

import { Logger } from '../utils/logger';
import { ErrorHandler, ErrorInfo } from '../utils/errorHandler'; // Asume que ErrorHandler devuelve ErrorInfo
import { EventBus } from '../core/event/eventBus';
// Podría interactuar con una UI o sistema de notificaciones
// import { NotificationService } from '../ui/notificationService'; 

/**
 * Interfaz que define el resultado del manejo de retroalimentación/error
 */
export interface FeedbackResult {
  errorHandled: boolean; // Indica si el manager pudo procesar el feedback/error
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string; // Mensaje procesado o generado
  source: string; // Componente o módulo que originó el feedback
  recoveryAction?: { // Acción sugerida para recuperarse del error (si aplica)
    type: string; // Tipo de acción (ej. 'retry', 'suggestAlternative', 'requestUserInput')
    params: any; // Parámetros para la acción
  };
  userNotification?: { // Cómo notificar al usuario (si aplica)
    show: boolean;
    message: string;
    type: 'info' | 'warning' | 'error';
  };
}

/**
 * Clase para gestionar la retroalimentación y los errores
 */
export class FeedbackManager {
  private logger: Logger;
  private errorHandler: ErrorHandler; // Para análisis detallado del error
  private eventBus: EventBus;
  // private notificationService: NotificationService; // Si hay un servicio de UI

  constructor(
    logger: Logger,
    errorHandler: ErrorHandler,
    eventBus: EventBus
    // notificationService: NotificationService
  ) {
    this.logger = logger;
    this.errorHandler = errorHandler;
    this.eventBus = eventBus;
    // this.notificationService = notificationService;

    // Escuchar eventos de error globales si ErrorHandler los emite
    this.eventBus.on('error:occurred', this.handleErrorEvent.bind(this));
  }

  /**
   * Procesa un evento de error o un feedback recibido.
   * @param error El objeto de error o información de feedback.
   * @param source El nombre del componente que origina el feedback.
   * @param severity (Opcional) Severidad predefinida, si no se puede inferir del error.
   * @returns Un objeto FeedbackResult describiendo cómo se manejó.
   */
  public processFeedback(error: any, source: string, severity?: 'info' | 'warning' | 'error' | 'critical'): FeedbackResult {
    this.logger.debug('FeedbackManager: Processing feedback', { source, error });

    let errorInfo: ErrorInfo;
    let processedSeverity: 'info' | 'warning' | 'error' | 'critical';

    if (error instanceof Error || (typeof error === 'object' && error?.message)) {
        // Es probablemente un error estándar
        errorInfo = this.errorHandler.handleError(error); // Usa ErrorHandler para estandarizar
        processedSeverity = severity || this.determineSeverity(errorInfo); // Determina severidad si no se dio
    } else {
        // Es probablemente un mensaje informativo o advertencia sin ser Error
        errorInfo = { 
            message: String(error), 
            stack: undefined, 
            type: 'FeedbackMessage', 
            isRecoverable: true // Asumir recuperable para mensajes simples
        };
        processedSeverity = severity || 'info'; // Por defecto info si no es un error
    }

    const feedbackResult: FeedbackResult = {
      errorHandled: true, // Se procesó aquí
      severity: processedSeverity,
      message: errorInfo.message,
      source: source,
      // Lógica para determinar acciones de recuperación y notificaciones
      recoveryAction: this.determineRecoveryAction(errorInfo, processedSeverity, source),
      userNotification: this.determineUserNotification(errorInfo, processedSeverity, source),
    };

    // Loguear según severidad
    switch (processedSeverity) {
        case 'info': this.logger.info(`Feedback [${source}]`, { message: errorInfo.message }); break;
        case 'warning': this.logger.warn(`Feedback [${source}]`, { message: errorInfo.message }); break;
        case 'error': this.logger.error(`Feedback [${source}]`, { message: errorInfo.message, stack: errorInfo.stack }); break;
        case 'critical': this.logger.fatal(`Feedback [${source}]`, { message: errorInfo.message, stack: errorInfo.stack }); break;
    }
    
    // Emitir evento para que otros sistemas reaccionen si es necesario
    this.eventBus.emit('feedback:processed', feedbackResult);

    // Mostrar notificación si aplica
    if (feedbackResult.userNotification?.show) {
        this.showNotification(feedbackResult.userNotification);
    }

    return feedbackResult;
  }

  /** Handler para eventos de error globales */
  private handleErrorEvent(payload: { error: any, source: string }): void {
    this.processFeedback(payload.error, payload.source || 'Unknown');
  }

  /** Determina la severidad basada en la información del error */
  private determineSeverity(errorInfo: ErrorInfo): 'info' | 'warning' | 'error' | 'critical' {
      // Lógica simple, puede ser más compleja
      if (errorInfo.type?.toLowerCase().includes('validation')) return 'warning';
      if (errorInfo.type?.toLowerCase().includes('notfound')) return 'warning';
      if (!errorInfo.isRecoverable) return 'critical';
      // Añadir más reglas...
      return 'error'; // Por defecto si es un error
  }

  /** Determina si hay una acción de recuperación sugerida */
  private determineRecoveryAction(errorInfo: ErrorInfo, severity: string, source: string): FeedbackResult['recoveryAction'] | undefined {
      // Lógica basada en tipo de error, severidad, fuente
      if (severity === 'error' && errorInfo.isRecoverable) {
          // Ejemplo: si falla una llamada a API, sugerir reintento
          if (errorInfo.type === 'ApiError') { 
              return { type: 'retry', params: { delay: 1000 } };
          }
          // Ejemplo: si falló la planificación, sugerir pedir más info al usuario
           if (source === 'PlanningEngine') {
               return { type: 'requestUserInput', params: { question: "Could you provide more details or clarify the request?" } };
           }
      }
       // Añadir más reglas...
      return undefined;
  }

  /** Determina si y cómo notificar al usuario */
  private determineUserNotification(errorInfo: ErrorInfo, severity: string, source: string): FeedbackResult['userNotification'] | undefined {
      // No notificar por info, a menos que sea explícito
      if (severity === 'info') return { show: false, message: '', type: 'info' };

      // Notificar siempre por errores críticos
      if (severity === 'critical') {
          return { show: true, message: `Critical Error [${source}]: ${errorInfo.message}`, type: 'error' };
      }
      
      // Notificar por errores y warnings (quizás configurable)
      if (severity === 'error' || severity === 'warning') {
           return { 
               show: true, 
               message: `${severity.toUpperCase()} [${source}]: ${errorInfo.message}`, 
               type: severity === 'error' ? 'error' : 'warning' 
           };
      }

      return undefined;
  }

  /** Muestra la notificación al usuario (interactúa con UI) */
  private showNotification(notification: NonNullable<FeedbackResult['userNotification']>): void {
       this.logger.debug('FeedbackManager: Showing notification', { notification });
       // Aquí iría la llamada al servicio de UI/Notificaciones
       // this.notificationService.show(notification.message, notification.type);
       console.log(`[UI NOTIFICATION] Type: ${notification.type}, Message: ${notification.message}`); // Placeholder
  }
}