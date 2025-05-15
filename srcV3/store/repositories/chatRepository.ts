// src/storage/repositories/ChatRepository.ts
import * as vscode from 'vscode';
import * as sqlite3 from 'sqlite3';
import { randomUUID } from 'crypto';
import { IChatRepository } from '../interfaces/IChatRepository';
import { Chat, ChatMessage } from '../interfaces/entities';
import { DatabaseManager } from '../database/DatabaseManager';

export class ChatRepository implements IChatRepository {
  private db: sqlite3.Database;

  constructor(context: vscode.ExtensionContext) {
    const dbManager = DatabaseManager.getInstance(context);
    this.db = dbManager.getDatabase();
    this.initializeTable();
  }

  /**
   * Initialize chat tables
   * NOTE: This uses DROP TABLE for simplicity during development/reset.
   * A production system would require schema migration logic.
   */
  private initializeTable(): void {
    this.db.serialize(() => {
      this.db.run('DROP TABLE IF EXISTS messages');
      this.db.run('DROP TABLE IF EXISTS chats');

      this.db.run(`
        CREATE TABLE chats (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          preview TEXT
        )
      `);

      this.db.run(`
        CREATE TABLE messages (
          id TEXT PRIMARY KEY,
          chat_id TEXT NOT NULL,
          content TEXT NOT NULL,
          sender TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
        )
      `);
    });
  }

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
        (err) => {
          if (err) {
            console.error('[ChatRepository] Error updating chat:', err.message);
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  public async updateTitle(chatId: string, title: string): Promise<void> {
    return this.update(chatId, { title });
  }

  public async updateTimestamp(chatId: string): Promise<void> {
    return this.update(chatId, { timestamp: Date.now() });
  }

  public async updatePreview(chatId: string, preview: string): Promise<void> {
    const trimmedPreview = preview.length > 100 ? `${preview.substring(0, 97)}...` : preview;
    return this.update(chatId, { preview: trimmedPreview });
  }

  public async delete(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM chats WHERE id = ?', [id], (err) => {
        if (err) {
          console.error('[ChatRepository] Error deleting chat:', err.message);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  public async addMessage(message: ChatMessage): Promise<ChatMessage> {
    return new Promise((resolve, reject) => {
      const messageWithId = {
        ...message,
        id: message.id || randomUUID()
      };

      this.db.run(
        'INSERT INTO messages (id, chat_id, content, sender, timestamp) VALUES (?, ?, ?, ?, ?)',
        [messageWithId.id, messageWithId.chatId, messageWithId.content, messageWithId.sender, messageWithId.timestamp],
        async (err) => {
          if (err) {
            console.error('[ChatRepository] Error adding message:', err.message);
            reject(err);
          } else {
            try {
              if (message.sender === 'user') {
                await this.updatePreview(message.chatId, message.content);
              }
              await this.updateTimestamp(message.chatId);
              resolve(messageWithId);
            } catch (err) {
              console.error('[ChatRepository] Error updating chat after message:', err);
              resolve(messageWithId);
            }
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
            resolve(rows as ChatMessage[]);
          }
        }
      );
    });
  }
}