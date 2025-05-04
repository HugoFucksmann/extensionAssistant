import { ChatService } from './chatService';
import { OrchestratorService } from '../orchestrator/orchestratorService';
import { ConfigurationManager } from '../core/config/ConfigurationManager';
import { ErrorHandler } from '../utils/errorHandler';
import { EventBus } from '../core/event/eventBus';
import { ACTIONS } from '../core/config/constants';

/**
 * Clase especializada para procesar mensajes del usuario
 * Separa la lógica de procesamiento de mensajes del ExtensionContext
 * Simplificada para usar exclusivamente el flujo de orquestación
 */
export class MessageProcessor {
  private eventBus: EventBus;
  
  constructor(
    private configManager: ConfigurationManager,
    private chatService: ChatService,
    private errorHandler: ErrorHandler,
    private orchestratorService: OrchestratorService // Ahora es un requisito obligatorio
  ) {
    this.eventBus = EventBus.getInstance();
  }

  /**
   * Procesa un mensaje del usuario y genera una respuesta
   * @param message El mensaje del usuario
   * @returns La respuesta generada
   */
  public async process(message: string): Promise<string> {
    console.log('========== INICIO PROCESAMIENTO DE MENSAJE ==========');
    console.log(`[MessageProcessor] Procesando mensaje: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);
    
    // Actualizar estado de UI para indicar procesamiento
    this.configManager.setProcessingState(true);
    this.eventBus.emit(ACTIONS.MESSAGE_PROCESSING, { processing: true });
    
    try {
      // Añadir mensaje del usuario al chat
      await this.chatService.addUserMessage(message);
      
      // Usar exclusivamente el flujo de orquestación
      const response = await this.processWithOrchestration(message);
      
      // Añadir respuesta al chat
      await this.chatService.addAssistantResponse(response);
      
      // Emitir evento de respuesta recibida
      this.eventBus.emit(ACTIONS.MESSAGE_RECEIVE, { 
        content: response, 
        success: true 
      });
      
      console.log('========== FIN PROCESAMIENTO DE MENSAJE (EXITOSO) ==========');
      return response;
    } catch (error: any) {
      return await this.errorHandler.handleAndRespondToError(error, 'MessageProcessor');
    } finally {
      // Asegurar que siempre se actualice el estado de procesamiento
      this.configManager.setProcessingState(false);
      this.eventBus.emit(ACTIONS.MESSAGE_PROCESSING, { processing: false });
    }
  }
  
  /**
   * Procesa un mensaje usando exclusivamente el flujo de orquestación
   * @param message El mensaje del usuario
   * @returns La respuesta generada
   */
  private async processWithOrchestration(message: string): Promise<string> {
    console.log('[INFO] Usando flujo de orquestación');
    
    try {
      const result = await this.orchestratorService.orchestrateRequest(message);
      
      if (result.success) {
        let response: string;
        
        if (typeof result.finalResult === 'string') {
          response = result.finalResult;
        } else if (result.finalResult && typeof result.finalResult.response === 'string') {
          response = result.finalResult.response;
        } else {
          response = 'Operación completada exitosamente';
        }
        
        return response;
      } else {
        throw new Error(result?.error?.message || 'Error en la orquestación');
      }
    } catch (orchError: any) {
      console.error('[ERROR] Excepción en orquestación:', orchError);
      throw orchError; // Re-lanzar el error para que sea manejado por el proceso principal
    }
  }
}