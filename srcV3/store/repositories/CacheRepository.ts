// src/store/repositories/CacheRepository.ts

import * as vscode from 'vscode';
import { ICacheRepository, CacheItem } from '../interfaces';
import { BaseRepository } from '../database/BaseRepository';


/**
 * Implementation of the repository to manage cache in the SQLite database.
 */
export class CacheRepository extends BaseRepository implements ICacheRepository {

    constructor(context: vscode.ExtensionContext) {
        super(context);
       
    }

    /**
     * Gets a cache item by its key.
     * @param key The unique key of the item.
     * @returns The cache item if found, or null if not.
     * @throws Error if the database operation fails.
     */
    public async getItem(key: string): Promise<CacheItem | null> {
        try {
           
            const row = await super.get<{ key: string, data: string, timestamp: number }>( 
                'SELECT key, data, timestamp FROM cache_items WHERE key = ?',
                [key]
            );

            if (!row) {
                return null; 
            }

        
            try {
                const cacheItem: CacheItem = {
                    key: row.key,
                    data: JSON.parse(row.data), 
                    timestamp: row.timestamp
                };
                return cacheItem;
            } catch (parseErr) {
                console.error('[CacheRepository] Error parsing cached data for key:', key, parseErr);
               
                this.delete(key).catch(deleteErr => console.error('[CacheRepository] Error deleting corrupted cache item:', deleteErr));
                return null; // Return null if data is corrupted JSON
            }

        } catch (err: any) {
       
            console.error('[CacheRepository] Error getting cache item:', err.message);
            throw new Error(`Failed to get cache item "${key}": ${err.message}`);
        }
    }

    /**
     * Stores or updates a cache item.
     * @param key The unique key of the item.
     * @param data The data to store (will be serialized to JSON).
     * @throws Error if the database operation fails.
     */
    public async put(key: string, data: any): Promise<void> {
        try {
            const jsonData = JSON.stringify(data);
            const timestamp = Date.now();

           
            await super.run( 
                'INSERT OR REPLACE INTO cache_items (key, data, timestamp) VALUES (?, ?, ?)',
                [key, jsonData, timestamp]
            );
        } catch (err: any) {
            console.error('[CacheRepository] Error putting cache item:', err.message);
            throw new Error(`Failed to put cache item "${key}": ${err.message}`);
        }
    }

    /**
     * Deletes a cache item by its key.
     * @param key The unique key of the item.
     * @throws Error if the database operation fails.
     */
    public async delete(key: string): Promise<void> {
        try {
            await super.run('DELETE FROM cache_items WHERE key = ?', [key]);
        } catch (err: any) {
            console.error('[CacheRepository] Error deleting cache item:', err.message);
            throw new Error(`Failed to delete cache item "${key}": ${err.message}`);
        }
    }

  
}