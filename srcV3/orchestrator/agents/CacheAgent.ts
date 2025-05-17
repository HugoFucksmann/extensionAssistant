// src/orchestrator/agents/CacheAgent.ts

// Remove specific repository import
// import { CacheRepository } from "../../store/repositories/CacheRepository";

import * as crypto from 'crypto';
// Remove vscode import if only used for repo instantiation
// import * as vscode from 'vscode';

// Import Storage Service interface and Cache Repository interface
import { IStorageService, ICacheRepository } from '../../store'; // <-- Added import

export class CacheAgent {
    private repository: ICacheRepository; // <-- Use interface

    // Accept IStorageService in the constructor
    // Remove vscode.ExtensionContext if not used for other purposes
    constructor(storageService: IStorageService) { // <-- Added dependency
        // Get the specific repository from the Storage Service
        this.repository = storageService.getCacheRepository(); // <-- Get repo from service
        console.log('[CacheAgent] Initialized.');
    }

    /**
     * Generates a unique key for a cache entry based on a base key and content hash.
     * @param baseKey A base identifier (e.g., file path, search query).
     * @param content The content to hash (e.g., file content, query string).
     * @returns A unique cache key string.
     */
    private generateCacheKey(baseKey: string, content: string): string {
        const hash = crypto.createHash('sha256').update(content).digest('hex');
        // Ensure baseKey is safe for use in a key (remove problematic characters if necessary)
        const safeBaseKey = baseKey.replace(/[^a-zA-Z0-9_\-.\/]/g, '_'); // Keep this utility
        return `${safeBaseKey}:${hash}`;
    }

    /**
     * Gets cached data for a given key and content hash.
     * @param baseKey The base identifier (e.g., file path).
     * @param content The content whose hash is part of the key (e.g., file content).
     * @returns The cached data, or null if not found or content has changed.
     */
    public async get(baseKey: string, content: string): Promise<any | null> {
        const key = this.generateCacheKey(baseKey, content);
        try {
            // Use the injected repository's method
            const item = await this.repository.getItem(key); // <-- Use this.repository
            if (item) {
                console.log(`[CacheAgent] Cache hit for key: ${key}`);
                return item.data;
            } else {
                console.log(`[CacheAgent] Cache miss for key: ${key}`);
                return null;
            }
        } catch (error) {
            console.error(`[CacheAgent] Error getting cache item for key ${key}:`, error);
            return null; // Treat errors as cache misses
        }
    }

     /**
      * Gets cached data for a specific key without hashing (useful for fixed keys).
      * @param key The exact cache key.
      * @returns The cached data, or null if not found.
      */
     public async getExact(key: string): Promise<any | null> {
         try {
             // Use the injected repository's method
             const item = await this.repository.getItem(key); // <-- Use this.repository
             if (item) {
                 console.log(`[CacheAgent] Exact cache hit for key: ${key}`);
                 return item.data;
             } else {
                 console.log(`[CacheAgent] Exact cache miss for key: ${key}`);
                 return null;
             }
         } catch (error) {
             console.error(`[CacheAgent] Error getting exact cache item for key ${key}:`, error);
             return null; // Treat errors as cache misses
         }
     }


    /**
     * Puts data into the cache using a base key and content hash.
     * @param baseKey The base identifier.
     * @param content The content whose hash is part of the key.
     * @param data The data to cache.
     */
    public async put(baseKey: string, content: string, data: any): Promise<void> {
        const key = this.generateCacheKey(baseKey, content);
        try {
             // Use the injected repository's method
            await this.repository.put(key, data); // <-- Use this.repository
            console.log(`[CacheAgent] Cache put successful for key: ${key}`);
        } catch (error) {
            console.error(`[CacheAgent] Error putting cache item for key ${key}:`, error);
        }
    }

     /**
      * Puts data into the cache using an exact key.
      * @param key The exact cache key.
      * @param data The data to cache.
      */
     public async putExact(key: string, data: any): Promise<void> {
         try {
             // Use the injected repository's method
             await this.repository.put(key, data); // <-- Use this.repository
             console.log(`[CacheAgent] Exact cache put successful for key: ${key}`);
         } catch (error) {
             console.error(`[CacheAgent] Error putting exact cache item for key ${key}:`, error);
         }
     }

    /**
     * Deletes a cache entry using a base key and content hash.
     * @param baseKey The base identifier.
     * @param content The content whose hash is part of the key.
     */
    public async delete(baseKey: string, content: string): Promise<void> {
        const key = this.generateCacheKey(baseKey, content);
        try {
            // Use the injected repository's method
            await this.repository.delete(key); // <-- Use this.repository
            console.log(`[CacheAgent] Cache delete successful for key: ${key}`);
        } catch (error) {
            console.error(`[CacheAgent] Error deleting cache item for key ${key}:`, error);
        }
    }

    // CacheAgent itself likely doesn't need a dispose method if the repository is disposed by StorageService
    dispose(): void {
        console.log('[CacheAgent] Disposing.');
        // The repository instance is owned and disposed by the StorageService
    }
}