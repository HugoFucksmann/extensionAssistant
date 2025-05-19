// src/store/repositories/ChatRepository.ts
// MODIFIED: Removed high-level logic like updating preview/timestamp in addMessage.
// This logic moves to ChatPersistenceService.

import * as vscode from 'vscode';
import * as sqlite3 from 'sqlite3';
import { randomUUID } from 'crypto';
import { IChatRepository } from '../interfaces/IChatRepository';
import { Chat, ChatMessage } from '../interfaces/entities';
import { DatabaseManager } from '../database/DatabaseManager';

export class ChatRepository implements IChatRepository {
  private db: sqlite3.Database;

  constructor(db: sqlite3.Database) { // Depend directly on the DB instance
    this.db = db;
    // Table initialization/schema updates are now handled by DatabaseManager
    // this.initializeTable(); // Removed, handled by DB Manager
  }

  // initializeTable method is removed from repositories and centralized in DatabaseManager

  public async create(chat: Chat): Promise<Chat> {
    return new Promise((resolve, reject) => {
      const chatWithId = {
        ...chat,
        id: chat.id || randomUUID()
      };

      this.db.run(
        'INSERT INTO chats (id, title, timestamp) VALUES (?, ?, ?)',
        [chatWithId.id, chatWithId.title, chatWithId.timestamp],
        (err) => {
          if (err) {
            console.error('[ChatRepository] Error creating chat:', err.message);
            reject(err);
          } else {
            resolve(chatWithId);
          }
        }
      );
    });
  }

  public async findById(id: string): Promise<Chat | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM chats WHERE id = ?',
        [id],
        (err, row) => {
          if (err) {
            console.error('[ChatRepository] Error finding chat:', err.message);
            reject(err);
          } else {
            // Ensure the row matches Chat structure or cast carefully
            resolve(row ? row as Chat : null);
          }
        }
      );
    });
  }

  public async findAll(): Promise<Chat[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM chats ORDER BY timestamp DESC', (err, rows) => {
        if (err) {
          console.error('[ChatRepository] Error finding all chats:', err.message);
          reject(err);
        } else {
           // Ensure rows match Chat structure
          resolve(rows as Chat[]);
        }
      });
    });
  }

  public async update(id: string, item: Partial<Chat>): Promise<void> {
    const fields = Object.keys(item).filter(key => key !== 'id');
    if (fields.length === 0) {
      return Promise.resolve();
    }

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => (item as any)[field]);

    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE chats SET ${setClause} WHERE id = ?`,
        [...values, id],
        function(err) { // Use function() to access 'this.changes'
          if (err) {
            console.error('[ChatRepository] Error updating chat:', err.message);
            reject(err);
          } else {
             if (this.changes === 0) {
                  console.warn(`[ChatRepository] No chat found with ID ${id} to update.`);
                  // Optional: reject(new Error(`Chat with ID ${id} not found.`));
             }
            resolve();
          }
        }
      );
    });
  }

  // updateTitle, updateTimestamp, updatePreview methods might move to PersistenceService
  // keeping updateTitle as it's a common repository operation, others move for business logic reasons
   public async updateTitle(chatId: string, title: string): Promise<void> {
       return this.update(chatId, { title });
   }

   // Implement the missing methods required by IChatRepository
   public async updateTimestamp(chatId: string): Promise<void> {
       return this.update(chatId, { timestamp: Date.now() });
   }

   public async updatePreview(chatId: string, preview: string): Promise<void> {
       return this.update(chatId, { preview });
   }

  public async delete(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM chats WHERE id = ?', [id], function(err) { // Use function() to access 'this.changes'
        if (err) {
          console.error('[ChatRepository] Error deleting chat:', err.message);
          reject(err);
        } else {
           if (this.changes === 0) {
                console.warn(`[ChatRepository] No chat found with ID ${id} to delete.`);
                // Optional: reject(new Error(`Chat with ID ${id} not found.`));
           }
          resolve();
        }
      });
    });
  }

  public async addMessage(message: ChatMessage): Promise<ChatMessage> {
    return new Promise((resolve, reject) => {
      const messageWithId = {
        ...message,
        id: message.id || randomUUID() // Ensure ID is generated if not provided
      };

      this.db.run(
        'INSERT INTO messages (id, chat_id, content, sender, timestamp) VALUES (?, ?, ?, ?, ?)',
        [messageWithId.id, messageWithId.chatId, messageWithId.content, messageWithId.sender, messageWithId.timestamp],
        (err) => {
          if (err) {
            console.error('[ChatRepository] Error adding message:', err.message);
            reject(err);
          } else {
             // Do NOT update preview or timestamp here. That's PersistenceService's job.
            resolve(messageWithId);
          }
        }
      );
    });
  }

  public async getMessages(chatId: string): Promise<ChatMessage[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM messages WHERE chat_id = ? ORDER BY timestamp ASC',
        [chatId],
        (err, rows) => {
          if (err) {
            console.error('[ChatRepository] Error getting chat messages:', err.message);
            reject(err);
          } else {
            // Ensure rows match ChatMessage structure
            resolve(rows as ChatMessage[]);
          }
        }
      );
    });
  }

    // Method to get the latest message for preview, moved from here to PersistenceService
    // Method to update chat timestamp, moved from here to PersistenceService
}