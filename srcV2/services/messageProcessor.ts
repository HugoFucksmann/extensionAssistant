import { BaseAPI } from '../models/baseAPI';
import { ChatService } from './chatService';
import { UIStateContext } from '../core/context/uiStateContext';
import { OrchestratorService } from '../orchestrator/orchestratorService';
import { ConfigManager } from '../core/config/configManager';

/**
 * Clase especializada para procesar mensajes del usuario
 * Separa la lógica de procesamiento de mensajes del ExtensionContext
 */
export class MessageProcessor {
  constructor(
    private uiStateContext: UIStateContext,
    private baseAPI: BaseAPI,
    private chatService: ChatService,
    private configManager: ConfigManager,
    private orchestratorService?: OrchestratorService
  ) {}

  /**
   * Procesa un mensaje del usuario y genera una respuesta
   * @param message El mensaje del usuario
   * @returns La respuesta generada
   */
  public async process(message: string): Promise<string> {
    console.log('========== INICIO PROCESAMIENTO DE MENSAJE ==========');
    console.log(`[MessageProcessor] Procesando mensaje: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);
    
    // Actualizar estado de UI para indicar procesamiento
    this.uiStateContext.setState('isProcessing', true);
    
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
      
      console.log('========== FIN PROCESAMIENTO DE MENSAJE (EXITOSO) ==========');
      return response;
    } catch (error: any) {
      console.error('[ERROR] Error general al procesar mensaje:', error);
      
      // Añadir mensaje de error como respuesta del asistente
      const errorResponse = `Lo siento, ocurrió un error: ${error.message || 'Error desconocido'}`;
      await this.chatService.addAssistantResponse(errorResponse);
      
      // Actualizar estado de UI con el error
      this.uiStateContext.setState('error', error.message || 'Error al procesar mensaje');
      
      console.log('========== FIN PROCESAMIENTO DE MENSAJE (CON ERROR) ==========');
      throw error;
    } finally {
      // Asegurar que siempre se actualice el estado de procesamiento
      this.uiStateContext.setState('isProcessing', false);
    }
  }
  
  /**
   * Determina si se debe usar la orquestación para procesar el mensaje
   */
  private shouldUseOrchestration(): boolean {
    return this.configManager.getUseOrchestration() && !!this.orchestratorService;
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
        console.error('[ERROR] La orquestación falló');
        console.error('[DEBUG] Detalles del error:', result?.error);
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
