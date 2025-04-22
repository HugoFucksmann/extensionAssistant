import * as vscode from 'vscode';
import { MemoryAgent } from './memory/memoryAgent';
import { ModelAgent } from './model/modelAgent';

/**
 * Interfaz para el componente que maneja la comunicación con la UI
 */
export interface UIProvider {
  sendMessageToWebview(message: any): void;
}

/**
 * OrchestratorAgent es responsable de coordinar todos los agentes en la extensión.
 * Maneja los mensajes de la UI y delega tareas a los agentes especializados apropiados.
 */
/**
 * OrchestratorAgent es responsable de coordinar el flujo de procesamiento de mensajes
 * entre los diferentes agentes especializados.
 */
export class OrchestratorAgent {
  constructor(
    private memoryAgent: MemoryAgent,
    private modelAgent: ModelAgent,
    private uiProvider: UIProvider
  ) {
    console.log('OrchestratorAgent inicializado');
  }



  /**
   * Procesa un mensaje del usuario
   * @param message El texto del mensaje del usuario
   */
  public async processUserMessage(message: string): Promise<void> {
    console.log(`OrchestratorAgent procesando mensaje: ${message}`);
    
    // Mostrar una notificación en VS Code
    vscode.window.showInformationMessage(`Procesando: ${message}`);
    
    try {
      // 1. Obtener respuesta del modelo
      const assistantResponse = await this.modelAgent.generateResponse(message);
      
      // 2. Guardar el par mensaje-respuesta en la memoria
      await this.memoryAgent.processMessagePair(message, assistantResponse);
      
      // 3. Enviar la respuesta a la UI
      this.uiProvider.sendMessageToWebview({
        type: 'receiveMessage',
        message: assistantResponse,
        isUser: false
      });
    } catch (error: any) {
      console.error('Error al procesar mensaje:', error);
      
      // Notificar error a la UI
      this.uiProvider.sendMessageToWebview({
        type: 'receiveMessage',
        message: `Error al procesar la solicitud: ${error.message || 'Desconocido'}`,
        isUser: false,
        isError: true
      });
    }
  }




  



  /**
   * Libera los recursos utilizados por el agente orquestador
   */
  public dispose(): void {
    console.log('Liberando recursos del OrchestratorAgent');
    // No hay recursos propios que liberar
  }
}
