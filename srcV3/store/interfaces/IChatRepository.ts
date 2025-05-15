import { Chat, ChatMessage } from "./entities";
import { IRepository } from "./IRepository";


/**
 * Chat repository specific operations
 */
export interface IChatRepository extends IRepository<Chat> {
    updateTitle(chatId: string, title: string): Promise<void>;
    updateTimestamp(chatId: string): Promise<void>;
    updatePreview(chatId: string, preview: string): Promise<void>;
    
    addMessage(message: ChatMessage): Promise<ChatMessage>;
    getMessages(chatId: string): Promise<ChatMessage[]>;
  }



  