// src/storage/interfaces/index.ts

export interface Chat {
  id: string;
  title: string;
  timestamp: number;
  preview?: string | null; 
}

export interface ChatMessage {
id?: string;
chatId: string;
content: string;
sender: 'user' | 'assistant' | 'system';
role?: 'user' | 'assistant' | 'system';
timestamp: number;
files?: string[];
}

// Define the interface for the structure of data in the memory_items table
export interface MemoryItem {
  id?: string;
  userId?: string | null; 
  projectId: string; 
  type: string; 
  keyName: string; 
  content: any;
  timestamp: number;
  reason?: string | null; 
}


export interface CacheItem {
  key: string;
  data: any;
  timestamp: number;
}


/**
* Generic interface for basic CRUD repository operations.
* @template T The type of the entity the repository manages.
* Note: This interface is currently only fully implemented by ChatRepository.
* Cache and Memory repositories have different primary lookup methods.
*/
export interface IRepository<T> {
/**
 * Creates a new item in the repository.
 * @param item The item to create.
 * @returns The created item, potentially with generated ID/metadata.
 * @throws Error if creation fails.
 */
create?(item: T): Promise<T>;

/**
 * Finds an item by its unique identifier.
 * @param id The ID of the item.
 * @returns The item if found, or null.
 * @throws Error if the operation fails (excluding item not found).
 */
findById?(id: string): Promise<T | null>;

/**
 * Finds all items in the repository.
 * @returns An array of all items. Returns an empty array if none are found.
 * @throws Error if the operation fails.
 */
findAll?(): Promise<T[]>; 

/**
 * Updates an existing item by its ID with partial data.
 * @param id The ID of the item to update.
 * @param item Partial data to update.
 * @throws Error if the operation fails or item not found (implementation detail).
 */
update?(id: string, item: Partial<T>): Promise<void>; 

/**
 * Deletes an item by its ID.
 * @param id The ID of the item to delete.
 * @throws Error if the operation fails or item not found (implementation detail).
 */
delete?(id: string): Promise<void>; 
}



export interface IChatRepository extends IRepository<Chat> {
 
  create(chat: Chat): Promise<Chat>;
  findById(id: string): Promise<Chat | null>;
  findAll(): Promise<Chat[]>;
  update(id: string, item: Partial<Chat>): Promise<void>;
  delete(id: string): Promise<void>;

  /**
   * Updates the title of a specific chat.
   * @param chatId The ID of the chat.
   * @param title The new title.
   * @throws Error if the operation fails.
   */
  updateTitle(chatId: string, title: string): Promise<void>;

  /**
   * Updates the timestamp of a specific chat to the current time.
   * Useful for marking a chat as recently active.
   * @param chatId The ID of the chat.
   * @throws Error if the operation fails.
   */
  updateTimestamp(chatId: string): Promise<void>;

  /**
   * Updates the preview text for a specific chat.
   * @param chatId The ID of the chat.
   * @param preview The new preview text.
   * @throws Error if the operation fails.
   */
  updatePreview(chatId: string, preview: string | null): Promise<void>; // Allow null preview

  /**
   * Adds a new message to a specific chat.
   * Also updates the chat's timestamp and preview (if user message).
   * @param message The message to add. Must include chatId.
   * @returns The added message, potentially with a generated ID.
   * @throws Error if the operation fails.
   */
  addMessage(message: ChatMessage): Promise<ChatMessage>;

  /**
   * Gets all messages for a specific chat, ordered by timestamp.
   * @param chatId The ID of the chat.
   * @returns An array of messages. Returns an empty array if the chat has no messages.
   * @throws Error if the operation fails.
   */
  getMessages(chatId: string): Promise<ChatMessage[]>;
}


/**
* Interface for the Cache repository.
*/
export interface ICacheRepository {
  /**
   * Gets a cache item by its key.
   * @param key The unique key of the item.
   * @returns The cache item if found, or null if not.
   * @throws Error if the database operation fails.
   */
  getItem(key: string): Promise<CacheItem | null>; // Renamed from get

  /**
   * Stores or updates a cache item.
   * @param key The unique key of the item.
   * @param data The data to store (will be serialized to JSON).
   * @throws Error if the database operation fails.
   */
  put(key: string, data: any): Promise<void>;

  /**
   * Deletes a cache item by its key.
   * @param key The unique key of the item.
   * @throws Error if the database operation fails.
   */
  delete(key: string): Promise<void>;

 
}


export interface IMemoryRepository {
  /**
   * Stores or updates a memory item. Uses REPLACE based on unique constraint (projectId, type, keyName).
   * @param item The memory item to store.
   * @returns The stored memory item (including generated ID if any).
   * @throws Error if keyName is missing or database operation fails.
   */
  put(item: MemoryItem): Promise<MemoryItem>;

  /**
   * Gets a memory item by its composite key (projectId, type, keyName).
   * @param projectId The project ID.
   * @param type The memory type.
   * @param keyName The key name of the item.
   * @returns The memory item if found, or null if not.
   * @throws Error if database operation fails.
   */
  getItem(projectId: string, type: string, keyName: string): Promise<MemoryItem | null>; // Renamed from get

  /**
   * Finds memory items by type for a specific project.
   * @param projectId The project ID.
   * @param type The memory type to search for.
   * @param limit Optional, the maximum number of items to return.
   * @returns An array of memory items.
   * @throws Error if database operation fails.
   */
  findByType(projectId: string, type: string, limit?: number): Promise<MemoryItem[]>;

   /**
    * Searches memory items by text in keyName, content, or reason (basic LIKE search).
    * @param projectId The project ID.
    * @param query The search string.
    * @param limit Optional, the maximum number of items to return.
    * @returns An array of relevant memory items.
    * @throws Error if database operation fails.
    */
  search(projectId: string, query: string, limit?: number): Promise<MemoryItem[]>;

  /**
   * Deletes a memory item by its ID.
   * @param id The ID of the item.
   * @throws Error if database operation fails.
   */
  delete(id: string): Promise<void>;

  /**
   * Deletes a memory item by its composite key.
   * @param projectId The project ID.
   * @param type The memory type.
   * @param keyName The key name of the item.
   * @throws Error if database operation fails.
   */
  deleteByKey(projectId: string, type: string, keyName: string): Promise<void>;

 
}