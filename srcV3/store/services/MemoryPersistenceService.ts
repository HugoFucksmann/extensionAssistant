// src/store/services/MemoryPersistenceService.ts

import { IMemoryRepository, MemoryEntity } from "../interfaces/IMemoryRepository";
import { EventEmitterService } from "../../events/EventEmitterService";

/**
 * Service layer for Memory persistence.
 * Wraps the MemoryRepository and adds business logic/event emission.
 */
export class MemoryPersistenceService {
     constructor(
         private memoryRepository: IMemoryRepository,
         private eventEmitter: EventEmitterService // Inject EventEmitterService
     ) {
          console.log('[MemoryPersistenceService] Initialized.');
     }

     async saveMemory(memory: MemoryEntity): Promise<MemoryEntity> {
         // This method handles both creation and update (upsert like logic)
         // Memory is typically upserted based on its key, or created if key is new.
         // Find existing by key, if found, update, else create.
         const existing = await this.memoryRepository.getMemoryByKey(memory.key);

         if (existing) {
             // Update existing memory entry
             const updatedMemoryData: Partial<MemoryEntity> = {
                 content: memory.content,
                 timestamp: Date.now(), // Update timestamp on modification
                 relevanceScore: memory.relevanceScore, // Allow updating score
                 relatedEntities: memory.relatedEntities, // Allow updating related entities
                 // Don't update type or key here typically
             };
             await this.memoryRepository.update(existing.id, updatedMemoryData);
              const updatedMemory = await this.memoryRepository.findById(existing.id); // Fetch full updated entity
               if (updatedMemory) {
                    this.eventEmitter.emit('memoryUpdated', updatedMemory);
                    return updatedMemory;
               } else {
                    // Should not happen
                    throw new Error(`Failed to retrieve updated memory with ID ${existing.id}`);
               }

         } else {
             // Create new memory entry
             const { id, ...memoryWithoutId } = memory; // Remove any existing id
             const newMemoryData: MemoryEntity = {
                 id: '', // Repo generates ID
                 ...memoryWithoutId, // Spread the rest of the properties
                 timestamp: Date.now(), // Ensure timestamp is set on creation
             };
             const newMemory = await this.memoryRepository.create(newMemoryData);
             this.eventEmitter.emit('memoryCreated', newMemory);
             return newMemory;
         }
     }

     async getMemoryByKey(key: string): Promise<MemoryEntity | null> {
         return this.memoryRepository.getMemoryByKey(key);
     }

     async searchMemory(query: string, limit?: number): Promise<MemoryEntity[]> {
         return this.memoryRepository.searchMemory(query, limit);
     }

      async getRecentMemory(chatId?: string | null, limit?: number): Promise<MemoryEntity[]> {
           return this.memoryRepository.getRecentMemory(chatId, limit);
      }


      dispose(): void {
          console.log('[MemoryPersistenceService] Disposed.');
      }
}