import { ChatService } from '../services/chatService';
import { ChatMessage } from '../storage/models/entities';

export class OrchestratorService {
  constructor(private chatService: ChatService) {}

  public async processUserMessage(userText: string, files?: string[]): Promise<ChatMessage> {
    // Asegura que haya un chat activo
    const chatId = await this.ensureChat();

    // Guarda mensaje del usuario
    const userMessage: ChatMessage = {
      chatId,
      content: userText,
      sender: 'user',
      timestamp: Date.now()
    };
    await this.chatService['repository'].addMessage(userMessage);

    // Simular respuesta del modelo
    const responseText = `Respuesta simulada: ${userText}`;

    const assistantMessage: ChatMessage = {
      chatId,
      content: responseText,
      sender: 'assistant',
      timestamp: Date.now()
    };
    await this.chatService['repository'].addMessage(assistantMessage);

    return assistantMessage;
  }

  private async ensureChat(): Promise<string> {
    const current = this.chatService.getCurrentConversationId();
    if (current) return current;

    const newChat = await this.chatService.createConversation();
    return newChat.id;
  }
}
