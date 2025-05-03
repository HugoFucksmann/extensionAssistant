
import { ChatService } from './chatService';
import { OrchestratorService } from '../orchestrator/orchestratorService';
import { ConfigurationManager } from '../core/config/ConfigurationManager';
import { ErrorHandler } from '../utils/errorHandler';
import { EventBus } from '../core/event/eventBus';
import { ACTIONS, MESSAGE_TYPES } from '../core/config/constants';
import { BaseAPI } from '../models/baseAPI';


/**
 * Clase especializada para procesar mensajes del usuario
 * Separa la lógica de procesamiento de mensajes del ExtensionContext
 */
export class MessageProcessor {
  private eventBus: EventBus;
  
  constructor(
    private configManager: ConfigurationManager,
    private baseAPI: BaseAPI,
    private chatService: ChatService,
    private errorHandler: ErrorHandler,
    private orchestratorService?: OrchestratorService
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
      
      let response: string;
      
      // Determinar si usar orquestación o flujo directo
      if (this.shouldUseOrchestration()) {
        response = await this.processWithOrchestration(message);
      } else {
        response = await this.processDirectly(message);
      }
      
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
   * Determina si se debe usar la orquestación para procesar el mensaje
   */
  private shouldUseOrchestration(): boolean {
    return this.configManager.getUseOrchestration() && 
           !!this.orchestratorService &&
           (this.orchestratorService as any).isReady?.() !== false;
  }
  
  /**
   * Procesa un mensaje usando el flujo de orquestación
   * @param message El mensaje del usuario
   * @returns La respuesta generada
   */
  private async processWithOrchestration(message: string): Promise<string> {
    console.log('[INFO] Usando flujo de orquestación');
    
    try {
      const result = await this.orchestratorService!.orchestrateRequest(message);
      
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
      
      // Fallback al flujo directo si la orquestación falla
      console.log('[INFO] Fallback al flujo directo');
      return await this.processDirectly(message);
    }
  }
  
  /**
   * Procesa un mensaje usando el flujo directo
   * @param message El mensaje del usuario
   * @returns La respuesta generada
   */
  private async processDirectly(message: string): Promise<string> {
    console.log('[INFO] Usando flujo directo');
    return await this.baseAPI.generateResponse(message);
  }
}