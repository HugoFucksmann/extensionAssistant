// src/ui/services/MessageService.ts
export class MessageService {
  private static instance: MessageService;
  
  private constructor() {}
  
  static getInstance(): MessageService {
    if (!MessageService.instance) {
      MessageService.instance = new MessageService();
    }
    return MessageService.instance;
  }

  /**
   * Envía un mensaje a la extensión de VS Code (al MessageBridge).
   * @param type El tipo de mensaje (ej. 'userMessageSent', 'uiReady', 'newChatRequestedByUI').
   * @param payload Los datos asociados al mensaje.
   */
  postMessage(type: string, payload: Record<string, unknown> = {}) {
    // Directamente postear el mensaje con el tipo y el payload
    // El MessageBridge en el backend se encargará de la lógica de enrutamiento.
    window.vscode.postMessage({ type, payload });
    console.log('[MessageService] Posted message:', { type, payload });
  }


}