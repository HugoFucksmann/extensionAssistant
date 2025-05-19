// src/store/interfaces/IMemoryRepository.ts

import { IRepository } from "./IRepository";

// Define the entity structure for Memory (longer-term context/facts)
export interface MemoryEntity {
    id: string; // UUID for the memory entry
    chatId?: string | null; // Optional: Link to a specific conversation if relevant
    type: 'fact' | 'insight' | 'summary' | 'code_snippet' | 'plan'; // Type of memory
    key: string; // A key to identify/query the memory (e.g., 'project_summary', 'file_summary:path/to/file.ts')
    content: string; // The actual content of the memory (JSON string, text, etc.)
    timestamp: number; // When this memory was created/updated
    relevanceScore?: number; // Optional: Score for retrieval
    relatedEntities?: string; // Optional: JSON string of related entity IDs (files, functions, etc.)
    // Add other relevant fields for indexing/querying
}

/**
 * Repository interface for storing longer-term memory/facts.
 */
export interface IMemoryRepository extends IRepository<MemoryEntity> {
    // Add repository-specific methods if needed, e.g., getMemoryByKey(key: string), searchMemory(query: string)
     getMemoryByKey(key: string): Promise<MemoryEntity | null>;
     searchMemory(query: string, limit?: number): Promise<MemoryEntity[]>;
     getRecentMemory(chatId?: string | null, limit?: number): Promise<MemoryEntity[]>;
}