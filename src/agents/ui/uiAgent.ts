import { Agent, MemoryResponse, UIResponse, UIProvider } from '../../interfaces';

/**
 * UIAgent es responsable de gestionar la comunicación con la interfaz de usuario.
 * Recibe las respuestas del agente de memoria y las formatea para enviarlas a la UI.
 */
export class UIAgent implements Agent<MemoryResponse, UIResponse> {
  public name = 'UIAgent';
  
  constructor(private uiProvider: UIProvider) {}
  
  public async initialize(): Promise<void> {
    console.log('UIAgent inicializado');
  }
  
  /**
   * Procesa la respuesta del agente de memoria y la envía a la UI
   * @param memoryResponse Respuesta del agente de memoria
   * @returns Respuesta formateada para la UI
   */
  public async process(memoryResponse: MemoryResponse): Promise<UIResponse> {
    console.log(`${this.name} procesando respuesta de memoria:`, memoryResponse);
    
    // Extraer el mensaje del asistente
    const message = memoryResponse.assistantMessage.text;
    
    // Enviar mensaje a la UI
    this.uiProvider.sendMessageToWebview({
      type: 'receiveMessage',
      message,
      isUser: false
    });
    
    return {
      message,
      isUser: false,
      metadata: {
        timestamp: new Date().toISOString(),
        originalMemoryResponse: memoryResponse
      }
    };
  }
  
  public dispose(): void {
    console.log('UIAgent eliminado');
  }
}
