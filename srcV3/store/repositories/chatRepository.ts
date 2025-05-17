// src/storage/repositories/ChatRepository.ts
import * as vscode from 'vscode';
import { randomUUID } from 'crypto';
import { IChatRepository, Chat, ChatMessage } from '../interfaces';
import { BaseRepository } from '../database/BaseRepository';



export class ChatRepository extends BaseRepository implements IChatRepository {

  constructor(context: vscode.ExtensionContext) {
    super(context);
    
  }

  public async create(chat: Chat): Promise<Chat> {
    const chatWithId = {
      ...chat,
      id: chat.id || randomUUID(),
      timestamp: chat.timestamp || Date.now() 
    };

    try {
      await super.run( 
        'INSERT INTO chats (id, title, timestamp, preview) VALUES (?, ?, ?, ?)',
        [chatWithId.id, chatWithId.title, chatWithId.timestamp, chatWithId.preview || null]
      );
      return chatWithId;
    } catch (err: any) {
       console.error('[ChatRepository] Error creating chat:', err.message);
       throw new Error(`Failed to create chat: ${err.message}`); 
    }
  }

  public async findById(id: string): Promise<Chat | null> {
    try {
   
      const row = await super.get<Chat>( 
        'SELECT id, title, timestamp, preview FROM chats WHERE id = ?', 
        [id]
      );
      return row; 
    } catch (err: any) {
       console.error('[ChatRepository] Error finding chat by id:', err.message);
       throw new Error(`Failed to find chat by id ${id}: ${err.message}`);
    }
  }

  public async findAll(): Promise<Chat[]> {
    try {
     
      const rows = await super.all<Chat>('SELECT id, title, timestamp, preview FROM chats ORDER BY timestamp DESC'); 
      return rows;
    } catch (err: any) {
       console.error('[ChatRepository] Error finding all chats:', err.message);
       throw new Error(`Failed to find all chats: ${err.message}`);
    }
  }

  public async update(id: string, item: Partial<Chat>): Promise<void> {
    const fields = Object.keys(item).filter(key => key !== 'id');
    if (fields.length === 0) {
      return Promise.resolve(); 
    }


    const setClause = fields.map(field => `${field} = ?`).join(', ');


    const values = fields.map(field => (item as any)[field]);

    try {
      await super.run( // Use super.run explicitly
        `UPDATE chats SET ${setClause} WHERE id = ?`,
        [...values, id]
      );
     
    } catch (err: any) {
       console.error(`[ChatRepository] Error updating chat ${id}:`, err.message);
       throw new Error(`Failed to update chat ${id}: ${err.message}`);
    }
  }

  public async updateTitle(chatId: string, title: string): Promise<void> {
    return this.update(chatId, { title });
  }

  public async updateTimestamp(chatId: string): Promise<void> {
    return this.update(chatId, { timestamp: Date.now() });
  }

  public async updatePreview(chatId: string, preview: string | null): Promise<void> {
    const trimmedPreview = preview ? (preview.length > 100 ? `${preview.substring(0, 97)}...` : preview) : null; 
    return this.update(chatId, { preview: trimmedPreview });
  }

  public async delete(id: string): Promise<void> {
    try {
      await super.run('DELETE FROM chats WHERE id = ?', [id]); 
     
    } catch (err: any) {
       console.error(`[ChatRepository] Error deleting chat ${id}:`, err.message);
       throw new Error(`Failed to delete chat ${id}: ${err.message}`);
    }
  }

  public async addMessage(message: ChatMessage): Promise<ChatMessage> {
    const messageWithId = {
      ...message,
      id: message.id || randomUUID(),
      timestamp: message.timestamp || Date.now()
    };

    try {
      await super.run(
        'INSERT INTO messages (id, chat_id, content, sender, timestamp) VALUES (?, ?, ?, ?, ?)',
        [messageWithId.id, messageWithId.chatId, messageWithId.content, messageWithId.sender, messageWithId.timestamp]
      );

    
      if (message.sender === 'user' && message.content) {
        this.updatePreview(message.chatId, message.content).catch(err => console.error('[ChatRepository] Error updating preview:', err));
      }
      this.updateTimestamp(message.chatId).catch(err => console.error('[ChatRepository] Error updating timestamp:', err));

      return messageWithId;
    } catch (err: any) {
       console.error('[ChatRepository] Error adding message:', err.message);
       throw new Error(`Failed to add message to chat ${message.chatId}: ${err.message}`);
    }
  }

  public async getMessages(chatId: string): Promise<ChatMessage[]> {
    try {
     
      const rows = await super.all<ChatMessage>( 
        'SELECT id, chat_id AS chatId, content, sender, timestamp FROM messages WHERE chat_id = ? ORDER BY timestamp ASC', 
        [chatId]
      );
      return rows;
    } catch (err: any) {
       console.error('[ChatRepository] Error getting chat messages:', err.message);
       throw new Error(`Failed to get messages for chat ${chatId}: ${err.message}`);
    }
  }
}