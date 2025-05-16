// src/store/repositories/CacheRepository.ts

import * as sqlite3 from 'sqlite3'; // Keep import if needed for types, though not directly used in methods now
import * as vscode from 'vscode';
import { ICacheRepository, CacheItem } from '../interfaces'; // Import from combined interfaces
import { BaseRepository } from '../database/BaseRepository';


/**
 * Implementation of the repository to manage cache in the SQLite database.
 */
export class CacheRepository extends BaseRepository implements ICacheRepository {

    constructor(context: vscode.ExtensionContext) {
        super(context); // Initialize BaseRepository with DB connection promise
        // Table initialization is handled by DatabaseManager
    }

    /**
     * Gets a cache item by its key.
     * @param key The unique key of the item.
     * @returns The cache item if found, or null if not.
     * @throws Error if the database operation fails.
     */
    public async getItem(key: string): Promise<CacheItem | null> { // Renamed from get
        try {
            // Use super.get explicitly. Fetch the raw row data where 'data' is a string.
            const row = await super.get<{ key: string, data: string, timestamp: number }>( // <-- Explicitly call super.get
                'SELECT key, data, timestamp FROM cache_items WHERE key = ?',
                [key]
            );

            if (!row) {
                return null; // Item not found
            }

            // Manually parse the JSON data from the string column
            try {
                const cacheItem: CacheItem = {
                    key: row.key,
                    data: JSON.parse(row.data), // Parse the JSON string
                    timestamp: row.timestamp
                };
                return cacheItem;
            } catch (parseErr) {
                console.error('[CacheRepository] Error parsing cached data for key:', key, parseErr);
                // Optionally delete corrupted cache item
                // Use super.delete implicitly via this.delete - NO, call delete directly
                this.delete(key).catch(deleteErr => console.error('[CacheRepository] Error deleting corrupted cache item:', deleteErr));
                return null; // Return null if data is corrupted JSON
            }

        } catch (err: any) {
            // Catch errors from the database operation itself (e.g., SQL error, DB not ready)
            console.error('[CacheRepository] Error getting cache item:', err.message);
            throw new Error(`Failed to get cache item "${key}": ${err.message}`); // Re-throw standardized error
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
            const jsonData = JSON.stringify(data); // Serialize the data to JSON string
            const timestamp = Date.now();

            // Use super.run explicitly
            // Use INSERT OR REPLACE to update if the key already exists
            await super.run( // <-- Explicitly call super.run
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
            await super.run('DELETE FROM cache_items WHERE key = ?', [key]); // <-- Explicitly call super.run
        } catch (err: any) {
            console.error('[CacheRepository] Error deleting cache item:', err.message);
            throw new Error(`Failed to delete cache item "${key}": ${err.message}`);
        }
    }

    // Optional: Prune old cache items
    // public async prune(olderThanTimestamp: number): Promise<void> {
    //     try {
    //         await super.run('DELETE FROM cache_items WHERE timestamp < ?', [olderThanTimestamp]); // <-- Explicitly call super.run
    //         console.log(`[CacheRepository] Pruned items older than ${new Date(olderThanTimestamp).toISOString()}`);
    //     } catch (err: any) {
    //         console.error('[CacheRepository] Error pruning cache items:', err.message);
    //         throw new Error(`Failed to prune cache items: ${err.message}`);
    //     }
    // }
}