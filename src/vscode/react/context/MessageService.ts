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
  
    postMessage(type: string, payload: Record<string, unknown> = {}) {
      if (type === 'userMessage') {
        this.handleUserMessage(payload);
      } else if (type === 'command' && payload.command && typeof payload.command === 'string') {
        this.handleCommand(payload);
      } else {
        window.vscode.postMessage({ type, ...payload });
      }
    }
  
    private handleUserMessage(payload: Record<string, unknown>) {
      const userMsgPayload = payload as { text: string, files?: string[] };
      
      window.vscode.postMessage({ 
        type: 'userMessageSent',
        payload: {
          text: userMsgPayload.text, 
          files: userMsgPayload.files
        }
      });
    }
  
    private handleCommand(payload: Record<string, unknown>) {
      const commandActual = payload.command as string;
      let finalPayload: Record<string, unknown> = {};
  
      if (payload.payload && typeof payload.payload === 'object' && payload.payload !== null) {
        finalPayload = { ...(payload.payload as Record<string, unknown>) };
      } else {
        const { command, ...restOfPayload } = payload;
        finalPayload = restOfPayload;
      }
      
      window.vscode.postMessage({ type: commandActual, ...finalPayload });
    }
  }