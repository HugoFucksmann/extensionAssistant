// src/storage/repositories/ChatRepository.ts
import * as vscode from 'vscode';
import { randomUUID } from 'crypto';
import { IChatRepository, Chat, ChatMessage } from '../interfaces'; // Import from combined interfaces
import { BaseRepository } from '../database/BaseRepository';



export class ChatRepository extends BaseRepository implements IChatRepository {

  constructor(context: vscode.ExtensionContext) {
    super(context); // Initialize BaseRepository with DB connection promise
    // Table initialization is now handled by DatabaseManager
  }

  public async create(chat: Chat): Promise<Chat> {
    const chatWithId = {
      ...chat,
      id: chat.id || randomUUID(),
      timestamp: chat.timestamp || Date.now() // Ensure timestamp is set if not provided
    };

    try {
      await super.run( // Use super.run explicitly
        'INSERT INTO chats (id, title, timestamp, preview) VALUES (?, ?, ?, ?)',
        [chatWithId.id, chatWithId.title, chatWithId.timestamp, chatWithId.preview || null] // Include preview, handle null
      );
      return chatWithId;
    } catch (err: any) {
       console.error('[ChatRepository] Error creating chat:', err.message);
       throw new Error(`Failed to create chat: ${err.message}`); // Re-throw standardized error
    }
  }

  public async findById(id: string): Promise<Chat | null> {
    try {
      // Use super.get explicitly, specifying the expected row type
      const row = await super.get<Chat>( // <-- Explicitly call super.get
        'SELECT id, title, timestamp, preview FROM chats WHERE id = ?', // Select all relevant columns
        [id]
      );
      return row; // get returns null if not found, or the row as Chat
    } catch (err: any) {
       console.error('[ChatRepository] Error finding chat by id:', err.message);
       throw new Error(`Failed to find chat by id ${id}: ${err.message}`);
    }
  }

  public async findAll(): Promise<Chat[]> {
    try {
      // Use super.all explicitly, specifying the expected row type array
      const rows = await super.all<Chat>('SELECT id, title, timestamp, preview FROM chats ORDER BY timestamp DESC'); // <-- Explicitly call super.all
      return rows; // all returns [] if not found, or array of rows as Chat[]
    } catch (err: any) {
       console.error('[ChatRepository] Error finding all chats:', err.message);
       throw new Error(`Failed to find all chats: ${err.message}`);
    }
  }

  public async update(id: string, item: Partial<Chat>): Promise<void> {
    const fields = Object.keys(item).filter(key => key !== 'id');
    if (fields.length === 0) {
      return Promise.resolve(); // Nothing to update
    }

    // Map camelCase keys to snake_case for SQL if necessary, or ensure DB schema matches
    // Assuming DB columns match camelCase for simplicity based on current SQL, but be careful here.
    // If DB uses snake_case (e.g., chat_id), you need mapping.
    // Example: const dbFields = fields.map(field => camelToSnakeCase(field));
    // const setClause = dbFields.map(field => `${field} = ?`).join(', ');
    // For now, assuming direct field names work.
    const setClause = fields.map(field => `${field} = ?`).join(', ');


    const values = fields.map(field => (item as any)[field]);

    try {
      await super.run( // Use super.run explicitly
        `UPDATE chats SET ${setClause} WHERE id = ?`,
        [...values, id]
      );
       // Check if any row was actually updated if needed (using this.changes from run callback)
       // The base run method doesn't expose this.changes easily. If critical, modify run or use db.run directly.
       // For now, assume success if run doesn't throw.
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
    const trimmedPreview = preview ? (preview.length > 100 ? `${preview.substring(0, 97)}...` : preview) : null; // Handle null/empty preview
    return this.update(chatId, { preview: trimmedPreview });
  }

  public async delete(id: string): Promise<void> {
    try {
      await super.run('DELETE FROM chats WHERE id = ?', [id]); // Use super.run explicitly
       // Check this.changes if needed to confirm deletion occurred
    } catch (err: any) {
       console.error(`[ChatRepository] Error deleting chat ${id}:`, err.message);
       throw new Error(`Failed to delete chat ${id}: ${err.message}`);
    }
  }

  public async addMessage(message: ChatMessage): Promise<ChatMessage> {
    const messageWithId = {
      ...message,
      id: message.id || randomUUID(),
      timestamp: message.timestamp || Date.now() // Ensure timestamp is set
    };

    try {
      await super.run( // Use super.run explicitly
        'INSERT INTO messages (id, chat_id, content, sender, timestamp) VALUES (?, ?, ?, ?, ?)',
        [messageWithId.id, messageWithId.chatId, messageWithId.content, messageWithId.sender, messageWithId.timestamp]
      );

      // Update chat preview and timestamp after adding message
      // These updates are not strictly necessary for addMessage success,
      // so we can handle errors internally or log them.
      if (message.sender === 'user' && message.content) { // Only update preview for user messages with content
        this.updatePreview(message.chatId, message.content).catch(err => console.error('[ChatRepository] Error updating preview:', err));
      }
      this.updateTimestamp(message.chatId).catch(err => console.error('[ChatRepository] Error updating timestamp:', err));

      return messageWithId; // Resolve with the message object
    } catch (err: any) {
       console.error('[ChatRepository] Error adding message:', err.message);
       throw new Error(`Failed to add message to chat ${message.chatId}: ${err.message}`);
    }
  }

  public async getMessages(chatId: string): Promise<ChatMessage[]> {
    try {
      // Use super.all explicitly, specifying the expected row type array
      // Note: SQLite column names are snake_case (chat_id), interface is camelCase (chatId).
      // The `as ChatMessage[]` cast relies on sqlite3 mapping `chat_id` to `chatId` automatically,
      // or you might need to use SQL aliases (`SELECT chat_id AS chatId, ...`) or map manually.
      // Using aliases in SQL is better practice for clarity and robustness.
      const rows = await super.all<ChatMessage>( // <-- Explicitly call super.all
        'SELECT id, chat_id AS chatId, content, sender, timestamp FROM messages WHERE chat_id = ? ORDER BY timestamp ASC', // Use alias for chatId
        [chatId]
      );
      return rows;
    } catch (err: any) {
       console.error('[ChatRepository] Error getting chat messages:', err.message);
       throw new Error(`Failed to get messages for chat ${chatId}: ${err.message}`);
    }
  }
}