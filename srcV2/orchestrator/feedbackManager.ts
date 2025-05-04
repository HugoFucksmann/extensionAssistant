/**
 * Gestor de Feedback para el Asistente IA
 * 
 * Responsabilidad: Proporcionar retroalimentación visual y notificaciones
 * al usuario sobre el progreso de las operaciones y los resultados.
 */

import { LoggerService } from '../utils/logger';
import { ErrorHandler } from '../utils/errorHandler';
import { EventBus } from '../core/event/eventBus';
import * as vscode from 'vscode'; // Importar VS Code API

export interface FeedbackPayload {
  type: 'info' | 'warning' | 'error' | 'progress' | 'file-selection' | 'completion' | string;
  message?: string;
  files?: string[];
  step?: string;
  progress?: number; // Progreso como porcentaje (0-100)
  duration?: number; // Duración en ms para notificaciones temporales
  source?: string;
  actions?: Array<{
    title: string;
    callback: string; // Identificador para el callback
  }>;
  detail?: any; // Detalles adicionales para debugging o registro
  userNotification: {
    show: boolean,
    message: string,
    type: string
  }
}

export class FeedbackManager {
  private progressBars: Map<string, vscode.Progress<{ message?: string; increment?: number }>> = new Map();
  private notificationTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private activeNotifications: Map<string, vscode.Disposable> = new Map();

  constructor(
    private logger: LoggerService,
    private errorHandler: ErrorHandler,
    private eventBus: EventBus,
    private context: vscode.ExtensionContext
  ) {
    // Registrar oyentes de eventos para limpiar recursos cuando sea necesario
    this.eventBus.on('orchestration:completed', () => this.clearAllProgressBars());
    this.eventBus.on('orchestration:cancelled', () => this.clearAllProgressBars());
    
    // Registrar comandos para las acciones de notificación
    context.subscriptions.push(
      vscode.commands.registerCommand('extension.ai-assistant.dismissNotification', (id: string) => {
        this.dismissNotification(id);
      })
    );
  }

  /**
   * Muestra una notificación al usuario y emite un evento para integraciones adicionales
   */
  public notify(feedback: FeedbackPayload): void {
    // 1. Registrar en el logger según el tipo
    if (feedback.type === 'error') {
      this.logger.error(feedback.message || 'Error', feedback);
    } else if (feedback.type === 'warning') {
      this.logger.warn(feedback.message || 'Warning', feedback);
    } else {
      this.logger.info(feedback.message || 'Feedback', feedback);
    }

    // 2. Presentar UI según el tipo
    this.presentFeedbackUI(feedback);
    
    // 3. Emitir evento para que otros componentes puedan reaccionar
    this.eventBus.emit('feedback:update', feedback);
  }

  /**
   * Presenta la interfaz de usuario apropiada según el tipo de feedback
   */
  private presentFeedbackUI(feedback: FeedbackPayload): void {
    const message = feedback.message || '';
    
    switch (feedback.type) {
      case 'progress':
        this.showProgress(feedback);
        break;
      
      case 'error':
        vscode.window.showErrorMessage(message, ...(feedback.actions?.map(a => a.title) || [])).then(selection => {
          if (selection && feedback.actions) {
            const action = feedback.actions.find(a => a.title === selection);
            if (action) {
              vscode.commands.executeCommand(action.callback);
            }
          }
        });
        break;
      
      case 'warning':
        vscode.window.showWarningMessage(message, ...(feedback.actions?.map(a => a.title) || [])).then(selection => {
          if (selection && feedback.actions) {
            const action = feedback.actions.find(a => a.title === selection);
            if (action) {
              vscode.commands.executeCommand(action.callback);
            }
          }
        });
        break;
      
      case 'info':
        vscode.window.showInformationMessage(message, ...(feedback.actions?.map(a => a.title) || [])).then(selection => {
          if (selection && feedback.actions) {
            const action = feedback.actions.find(a => a.title === selection);
            if (action) {
              vscode.commands.executeCommand(action.callback);
            }
          }
        });
        break;
      
      case 'file-selection':
        this.showFileSelectionFeedback(feedback);
        break;
      
      case 'completion':
        this.showCompletionFeedback(feedback);
        break;
        
      default:
        // Para tipos personalizados, mostrar notificación de información
        vscode.window.showInformationMessage(message);
    }
  }

  /**
   * Muestra una barra de progreso para operaciones largas
   */
  private showProgress(feedback: FeedbackPayload): void {
    const stepId = feedback.step || 'default';
    
    // Si ya hay una barra de progreso para este paso, actualizarla
    if (this.progressBars.has(stepId)) {
      return;
    }
    
    // Crear una nueva barra de progreso
    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: `AI Assistant: ${feedback.step || 'Procesando...'}`,
      cancellable: true
    }, (progress, token) => {
      // Guardar referencia a la barra de progreso
      this.progressBars.set(stepId, progress);
      
      // Mostrar mensaje inicial
      progress.report({ message: feedback.message });
      
      // Si hay un progreso específico, mostrarlo
      if (typeof feedback.progress === 'number') {
        progress.report({ increment: feedback.progress });
      }
      
      // Permitir cancelación
      token.onCancellationRequested(() => {
        this.eventBus.emit('operation:cancelled', { step: stepId });
        this.progressBars.delete(stepId);
      });
      
      // Devolver una promesa que se resuelve cuando la operación está completa
      return new Promise<void>(resolve => {
        const cleanup = () => {
          this.progressBars.delete(stepId);
          resolve();
        };
        
        // Escuchar el evento de finalización para este paso
        const handler = () => cleanup();
        this.eventBus.on(`step:completed:${stepId}`, handler);
        
        // Timeout de seguridad (30 segundos)
        setTimeout(cleanup, 30000);
      });
    });
  }

  /**
   * Muestra feedback para selección de archivos
   */
  private showFileSelectionFeedback(feedback: FeedbackPayload): void {
    if (!feedback.files || feedback.files.length === 0) {
      return;
    }
    
    const filesStr = feedback.files.length > 3 
      ? `${feedback.files.slice(0, 3).join(', ')} y ${feedback.files.length - 3} más`
      : feedback.files.join(', ');
      
    const message = feedback.message || `Archivos seleccionados: ${filesStr}`;
    
    const notification = vscode.window.showInformationMessage(
      message, 
      { modal: false }, 
      'Ver archivos'
    ).then(selection => {
      if (selection === 'Ver archivos') {
        // Mostrar los archivos en el explorador o abrirlos
        feedback.files!.forEach(file => {
          vscode.workspace.openTextDocument(file).then(doc => {
            vscode.window.showTextDocument(doc, { preview: false });
          });
        });
      }
    });
    
    // Guardar para limpieza posterior si es necesario
    const id = `file-selection-${Date.now()}`;
    this.activeNotifications.set(id, { dispose: () => {} });
    
    // Auto-limpiar después de un tiempo
    if (feedback.duration) {
      const timeout = setTimeout(() => this.dismissNotification(id), feedback.duration);
      this.notificationTimeouts.set(id, timeout);
    }
  }

  /**
   * Muestra feedback de finalización
   */
  private showCompletionFeedback(feedback: FeedbackPayload): void {
    // Limpiar todas las barras de progreso
    this.clearAllProgressBars();
    
    // Mostrar mensaje de finalización
    vscode.window.showInformationMessage(
      feedback.message || 'Operación completada', 
      ...(feedback.actions?.map(a => a.title) || [])
    ).then(selection => {
      if (selection && feedback.actions) {
        const action = feedback.actions.find(a => a.title === selection);
        if (action) {
          vscode.commands.executeCommand(action.callback);
        }
      }
    });
  }

  /**
   * Actualiza el progreso de un paso específico
   */
  public updateProgress(stepId: string, increment: number, message?: string): void {
    const progress = this.progressBars.get(stepId);
    if (progress) {
      progress.report({ increment, message });
    }
  }

  /**
   * Notifica el progreso de un paso específico
   */
  public notifyProgress(stepId: string, message: string, increment?: number): void {
    const progress = this.progressBars.get(stepId);
    if (progress) {
      progress.report({ message, increment });
    } else {
      this.logger.warn(`Attempted to report progress for unknown step: ${stepId}`);
    }
  }

  /**
   * Notifica sobre procesamiento de archivos
   * Este método es requerido por WorkflowManager
   */
  public notifyFileProcessing(files: string[], message?: string): void {
    this.notify({
      type: 'file-selection',
      files,
      message: message || `Procesando ${files.length} archivo(s)`,
      userNotification: {
        show: true,
        message: message || `Procesando ${files.length} archivo(s)`,
        type: 'info'
      }
    });
  }

  /**
   * Notifica la finalización de un workflow
   * Este método es requerido por WorkflowManager
   */
  public notifyCompletion(message?: string): void {
    this.notify({
      type: 'completion',
      message: message || 'Operación completada con éxito',
      userNotification: {
        show: true,
        message: message || 'Operación completada con éxito',
        type: 'info'
      }
    });
  }

  /**
   * Elimina una notificación específica
   */
  private dismissNotification(id: string): void {
    // Limpiar timeout si existe
    if (this.notificationTimeouts.has(id)) {
      clearTimeout(this.notificationTimeouts.get(id)!);
      this.notificationTimeouts.delete(id);
    }
    
    // Eliminar notificación
    if (this.activeNotifications.has(id)) {
      this.activeNotifications.get(id)!.dispose();
      this.activeNotifications.delete(id);
    }
  }

  /**
   * Limpia todas las barras de progreso
   */
  private clearAllProgressBars(): void {
    // Emitir eventos de finalización para todas las barras de progreso
    this.progressBars.forEach((_, stepId) => {
      this.eventBus.emit(`step:completed:${stepId}`, {});
    });
    
    // Limpiar la colección
    this.progressBars.clear();
  }

  /**
   * Limpia todos los recursos al desactivar la extensión
   */
  public dispose(): void {
    // Limpiar timeouts
    this.notificationTimeouts.forEach(timeout => clearTimeout(timeout));
    this.notificationTimeouts.clear();
    
    // Limpiar notificaciones activas
    this.activeNotifications.forEach(notification => notification.dispose());
    this.activeNotifications.clear();
    
    // Limpiar barras de progreso
    this.clearAllProgressBars();
  }
}