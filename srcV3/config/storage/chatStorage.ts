
export interface ChatMessage {
    id?: string;
    chatId: string;
    content: string;
    sender: 'user' | 'assistant' | 'system';
    timestamp: number;
  }
  
  export interface Chat {
    id: string;
    title: string;
    timestamp: number;
    preview?: string;
  }
  
  // src/storage/ChatStorage.ts
  import * as vscode from 'vscode';
  import * as sqlite3 from 'sqlite3';
  import * as path from 'path';
  import * as fs from 'fs';
  import { randomUUID } from 'crypto';
  
  export class ChatStorage {
    private db: sqlite3.Database;
    
    constructor(context: vscode.ExtensionContext) {
      const dbPath = path.join(context.globalStorageUri.fsPath, 'chat_assistant.db');
      
      // Ensure directory exists
      const dbDir = path.dirname(dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('[ChatStorage] Error opening database:', err.message);
          throw err;
        }
        this.initializeDatabaseSync();
      });
    }
    
    private initializeDatabaseSync(): void {
      this.db.serialize(() => {
        // Create chats table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS chats (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            preview TEXT
          )
        `);
        
        // Create messages table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            chat_id TEXT NOT NULL,
            content TEXT NOT NULL,
            sender TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
          )
        `);
        
        // Enable foreign keys
        this.db.run('PRAGMA foreign_keys = ON');
        
        console.log('[ChatStorage] Database tables initialized successfully');
      });
    }
    
    /**
     * Creates a new chat
     * @param title Chat title
     * @returns Created chat
     */
    public createChat(title: string): Promise<Chat> {
      return new Promise((resolve, reject) => {
        const chat: Chat = {
          id: randomUUID(),
          title,
          timestamp: Date.now()
        };
        
        this.db.run(
          'INSERT INTO chats (id, title, timestamp) VALUES (?, ?, ?)',
          [chat.id, chat.title, chat.timestamp],
          (err) => {
            if (err) {
              console.error('[ChatStorage] Error creating chat:', err.message);
              reject(err);
            } else {
              resolve(chat);
            }
          }
        );
      });
    }
    
    /**
     * Gets a chat by ID
     * @param chatId Chat ID
     * @returns Chat or null if not found
     */
    public getChat(chatId: string): Promise<Chat | null> {
      return new Promise((resolve, reject) => {
        this.db.get(
          'SELECT * FROM chats WHERE id = ?',
          [chatId],
          (err, row) => {
            if (err) {
              console.error('[ChatStorage] Error getting chat:', err.message);
              reject(err);
            } else {
              resolve(row ? row as Chat : null);
            }
          }
        );
      });
    }
    
    /**
     * Gets all chats
     * @returns List of chats
     */
    public getAllChats(): Promise<Chat[]> {
      return new Promise((resolve, reject) => {
        this.db.all('SELECT * FROM chats ORDER BY timestamp DESC', (err, rows) => {
          if (err) {
            console.error('[ChatStorage] Error getting all chats:', err.message);
            reject(err);
          } else {
            resolve(rows as Chat[]);
          }
        });
      });
    }
    
    /**
     * Adds a message to a chat
     * @param message Message to add
     * @returns Added message
     */
    public addMessage(message: ChatMessage): Promise<ChatMessage> {
      return new Promise((resolve, reject) => {
        const messageWithId = {
          ...message,
          id: message.id || randomUUID()
        };
        
        this.db.run(
          'INSERT INTO messages (id, chat_id, content, sender, timestamp) VALUES (?, ?, ?, ?, ?)',
          [messageWithId.id, messageWithId.chatId, messageWithId.content, messageWithId.sender, messageWithId.timestamp],
          (err) => {
            if (err) {
              console.error('[ChatStorage] Error adding message:', err.message);
              reject(err);
            } else {
              // Update chat timestamp and preview
              if (message.sender === 'user') {
                this.updateChatPreview(message.chatId, message.content);
              }
              this.updateChatTimestamp(message.chatId);
              resolve(messageWithId);
            }
          }
        );
      });
    }
    
    /**
     * Gets all messages for a chat
     * @param chatId Chat ID
     * @returns List of messages
     */
    public getChatMessages(chatId: string): Promise<ChatMessage[]> {
      return new Promise((resolve, reject) => {
        this.db.all(
          'SELECT * FROM messages WHERE chat_id = ? ORDER BY timestamp ASC',
          [chatId],
          (err, rows) => {
            if (err) {
              console.error('[ChatStorage] Error getting chat messages:', err.message);
              reject(err);
            } else {
              resolve(rows as ChatMessage[]);
            }
          }
        );
      });
    }
    
    /**
     * Updates a chat's timestamp
     * @param chatId Chat ID
     */
    private updateChatTimestamp(chatId: string): Promise<void> {
      return new Promise((resolve, reject) => {
        const timestamp = Date.now();
        this.db.run(
          'UPDATE chats SET timestamp = ? WHERE id = ?',
          [timestamp, chatId],
          (err) => {
            if (err) {
              console.error('[ChatStorage] Error updating chat timestamp:', err.message);
              reject(err);
            } else {
              resolve();
            }
          }
        );
      });
    }
    
    /**
     * Updates a chat's preview with the first part of a message
     * @param chatId Chat ID
     * @param content Message content
     */
    private updateChatPreview(chatId: string, content: string): Promise<void> {
      return new Promise((resolve, reject) => {
        // Take first 100 characters as preview
        const preview = content.length > 100 ? `${content.substring(0, 97)}...` : content;
        
        this.db.run(
          'UPDATE chats SET preview = ? WHERE id = ?',
          [preview, chatId],
          (err) => {
            if (err) {
              console.error('[ChatStorage] Error updating chat preview:', err.message);
              reject(err);
            } else {
              resolve();
            }
          }
        );
      });
    }
    
    /**
     * Updates a chat's title
     * @param chatId Chat ID
     * @param title New title
     */
    public updateChatTitle(chatId: string, title: string): Promise<void> {
      return new Promise((resolve, reject) => {
        this.db.run(
          'UPDATE chats SET title = ? WHERE id = ?',
          [title, chatId],
          (err) => {
            if (err) {
              console.error('[ChatStorage] Error updating chat title:', err.message);
              reject(err);
            } else {
              resolve();
            }
          }
        );
      });
    }
    
    /**
     * Deletes a chat and all its messages
     * @param chatId Chat ID
     */
    public deleteChat(chatId: string): Promise<void> {
      return new Promise((resolve, reject) => {
        this.db.run('DELETE FROM chats WHERE id = ?', [chatId], (err) => {
          if (err) {
            console.error('[ChatStorage] Error deleting chat:', err.message);
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }
    
    /**
     * Closes the database connection
     */
    public close(): void {
      this.db.close((err) => {
        if (err) {
          console.error('[ChatStorage] Error closing database:', err.message);
        }
      });
    }
  }