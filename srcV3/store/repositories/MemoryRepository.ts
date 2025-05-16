// src/store/repositories/MemoryRepository.ts

import * as sqlite3 from 'sqlite3'; // Keep import if needed for types
import * as vscode from 'vscode';
import { randomUUID } from 'crypto';
import { getMainWorkspacePath } from '../../tools/core/core'; // Helper to get project ID
import { IMemoryRepository, MemoryItem } from '../interfaces'; // Import from combined interfaces
import { BaseRepository } from '../database/BaseRepository';


/**
 * Implementation of the repository to manage semantic memory in the SQLite database.
 */
export class MemoryRepository extends BaseRepository implements IMemoryRepository {
    private currentProjectId: string; // Store current workspace path as project ID

    constructor(context: vscode.ExtensionContext) {
        super(context); // Initialize BaseRepository with DB connection promise
        // Get the current workspace path to use as the project identifier
        try {
             this.currentProjectId = getMainWorkspacePath();
        } catch (error) {
             console.error('[MemoryRepository] Could not get workspace path, using default ID for repository instance.', error);
             // Using a default is risky if the extension needs to operate on a specific project.
             // Consider throwing here or handling this case explicitly in methods that use projectId.
             // For now, keep the default but log a warning.
             this.currentProjectId = 'default_project';
        }
        // Table initialization is handled by DatabaseManager
    }

    // Helper to get the project ID, preferring the provided one, falling back to the current workspace ID.
    private getProjectId(projectId?: string): string {
        const targetProjectId = projectId || this.currentProjectId;
        if (!targetProjectId || targetProjectId === 'default_project') {
             // If still using default and no specific ID was provided, maybe throw?
             // Or rely on the initial warning. Let's rely on the warning for now.
             console.warn('[MemoryRepository] Using default project ID. Ensure a workspace is open for proper project isolation.');
        }
        return targetProjectId;
    }


    /**
     * Stores or updates a memory item. Uses REPLACE based on unique constraint (projectId, type, keyName).
     * @param item The memory item to store.
     * @returns The stored memory item (including generated ID if any).
     * @throws Error if keyName is missing or database operation fails.
     */
    public async put(item: MemoryItem): Promise<MemoryItem> {
        // Enforce keyName presence as it's part of the UNIQUE constraint
        if (!item.keyName || typeof item.keyName !== 'string') {
             const error = new Error('MemoryItem requires a non-empty string keyName for unique identification.');
             console.error('[MemoryRepository] Put failed: keyName missing or invalid', item);
             throw error; // Throw error immediately if keyName is invalid
        }

        const itemWithDefaults = {
            ...item,
            id: item.id || randomUUID(), // Generate ID if not provided
            projectId: this.getProjectId(item.projectId), // Use provided or current project ID
            timestamp: item.timestamp || Date.now(), // Use current timestamp if not provided
            content: JSON.stringify(item.content), // Store content as JSON string
            reason: item.reason === undefined ? null : item.reason // Store reason, use null if undefined
        };

        try {
            // Use super.run explicitly
            // Use INSERT OR REPLACE based on the UNIQUE constraint on (project_id, type, key_name)
            await super.run( // <-- Explicitly call super.run
                `INSERT OR REPLACE INTO memory_items (id, user_id, project_id, type, key_name, content, timestamp, reason)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    itemWithDefaults.id,
                    itemWithDefaults.userId === undefined ? null : itemWithDefaults.userId, // Store null if userId is undefined/null
                    itemWithDefaults.projectId,
                    itemWithDefaults.type,
                    itemWithDefaults.keyName,
                    itemWithDefaults.content,
                    itemWithDefaults.timestamp,
                    itemWithDefaults.reason // Include reason in insert
                ]
            );

            // Return the item with the generated ID and defaults applied, parsing content back
            // Need to parse content back from the stringified version used for storage
             const storedItem: MemoryItem = {
                 id: itemWithDefaults.id,
                 userId: itemWithDefaults.userId, // This will be string | null | undefined based on input
                 projectId: itemWithDefaults.projectId,
                 type: itemWithDefaults.type,
                 keyName: itemWithDefaults.keyName,
                 content: JSON.parse(itemWithDefaults.content), // Parse content back
                 timestamp: itemWithDefaults.timestamp,
                 reason: itemWithDefaults.reason // This will be string | null based on input
             };
             // Ensure userId and reason types match the interface after creation
             if (storedItem.userId === undefined) storedItem.userId = null;
             if (storedItem.reason === undefined) storedItem.reason = null;


            return storedItem;

        } catch (err: any) {
            console.error('[MemoryRepository] Error putting memory item:', err.message, item);
            throw new Error(`Failed to put memory item "${item.type}/${item.keyName}" for project "${itemWithDefaults.projectId}": ${err.message}`); // Re-throw standardized error
        }
    }

    /**
     * Helper to parse raw row data from SQLite into a MemoryItem, handling JSON content and potential errors.
     * @param row The raw row object from SQLite (expected to have string 'content').
     * @returns The parsed MemoryItem object, or null if parsing fails or row is incomplete.
     */
    private parseMemoryRow(row: any): MemoryItem | null {
         // Basic check for required columns expected from the SELECT query
         if (!row || row.id === undefined || row.project_id === undefined || row.type === undefined || row.content === undefined || row.timestamp === undefined || row.key_name === undefined) {
             console.warn('[MemoryRepository] Skipping incomplete or malformed memory row:', row);
             // Optionally delete corrupted row here if properties are missing - requires ID
             if (row && row.id) {
                  // Use this.delete as it's the public method for deleting by ID
                  this.delete(row.id).catch(deleteErr => console.error('[MemoryRepository] Error deleting incomplete memory item:', row.id, deleteErr));
             }
             return null;
         }
         try {
             return {
                 id: row.id,
                 userId: row.user_id, // Can be null in DB, maps to null in TS
                 projectId: row.project_id,
                 type: row.type,
                 keyName: row.key_name, // Expected to be string based on put validation
                 content: JSON.parse(row.content), // Parse the JSON string
                 timestamp: row.timestamp,
                 reason: row.reason // Can be null in DB, maps to null in TS
             };
         } catch (parseErr) {
             console.error('[MemoryRepository] Error parsing memory content for row:', row, parseErr);
             // Optionally delete corrupted memory item by ID
             if (row.id) {
                 // Use this.delete as it's the public method for deleting by ID
                 this.delete(row.id).catch(deleteErr => console.error('[MemoryRepository] Error deleting corrupted memory item by id:', row.id, deleteErr));
             }
             return null; // Return null if content is corrupted JSON
         }
    }


    /**
     * Gets a memory item by its composite key (projectId, type, keyName).
     * @param projectId The project ID.
     * @param type The memory type.
     * @param keyName The key name of the item.
     * @returns The memory item if found, or null if not.
     * @throws Error if database operation fails.
     */
    public async getItem(projectId: string, type: string, keyName: string): Promise<MemoryItem | null> { // Renamed from get
         const targetProjectId = this.getProjectId(projectId);
        try {
            // Use super.get explicitly. Fetch the raw row as 'any'.
            const row = await super.get<any>( // <-- Explicitly call super.get with type arg
                'SELECT id, user_id, project_id, type, key_name, content, timestamp, reason FROM memory_items WHERE project_id = ? AND type = ? AND key_name = ?',
                [targetProjectId, type, keyName]
            );

            if (!row) {
                return null; // Item not found
            }

            // Use helper to parse the raw row and handle JSON/errors
            return this.parseMemoryRow(row);

        } catch (err: any) {
            console.error('[MemoryRepository] Error getting memory item by key:', err.message);
            throw new Error(`Failed to get memory item "${type}/${keyName}" for project "${targetProjectId}": ${err.message}`);
        }
    }

    /**
     * Finds memory items by type for a specific project.
     * @param projectId The project ID.
     * @param type The memory type to search for.
     * @param limit Optional, the maximum number of items to return.
     * @returns An array of memory items.
     * @throws Error if database operation fails.
     */
    public async findByType(projectId: string, type: string, limit?: number): Promise<MemoryItem[]> {
         const targetProjectId = this.getProjectId(projectId);
         const limitClause = limit ? `LIMIT ${limit}` : '';
        try {
            // Use super.all explicitly. Fetch raw rows as 'any[]'.
            const rows = await super.all<any>( // <-- Explicitly call super.all with type arg
                `SELECT id, user_id, project_id, type, key_name, content, timestamp, reason FROM memory_items WHERE project_id = ? AND type = ? ORDER BY timestamp DESC ${limitClause}`,
                [targetProjectId, type]
            );

            // Map and parse JSON content for all rows using the helper, filtering out any corrupted ones
            const items: MemoryItem[] = rows.map(row => this.parseMemoryRow(row)).filter(item => item !== null) as MemoryItem[];
            return items;

        } catch (err: any) {
            console.error('[MemoryRepository] Error finding memory items by type:', err.message);
            throw new Error(`Failed to find memory items of type "${type}" for project "${targetProjectId}": ${err.message}`);
        }
    }

     /**
      * Searches memory items by text in keyName, content, or reason (basic LIKE search).
      * @param projectId The project ID.
      * @param query The search string.
      * @param limit Optional, the maximum number of items to return.
      * @returns An array of relevant memory items.
      * @throws Error if database operation fails.
      */
    public async search(projectId: string, query: string, limit?: number): Promise<MemoryItem[]> {
         const targetProjectId = this.getProjectId(projectId);
         const limitClause = limit ? `LIMIT ${limit}` : '';
         const searchTerm = `%${query}%`; // Basic substring search

        try {
            // Use super.all explicitly. Fetch raw rows as 'any[]'.
            const rows = await super.all<any>( // <-- Explicitly call super.all with type arg
                `SELECT id, user_id, project_id, type, key_name, content, timestamp, reason FROM memory_items
                 WHERE project_id = ? AND (key_name LIKE ? OR content LIKE ? OR reason LIKE ?)
                 ORDER BY timestamp DESC ${limitClause}`,
                [targetProjectId, searchTerm, searchTerm, searchTerm] // Include reason in search
            );

            // Map and parse JSON content for all rows using the helper, filtering out any corrupted ones
            const items: MemoryItem[] = rows.map(row => this.parseMemoryRow(row)).filter(item => item !== null) as MemoryItem[];
            return items;

        } catch (err: any) {
            console.error('[MemoryRepository] Error searching memory items:', err.message);
            throw new Error(`Failed to search memory items for project "${targetProjectId}" with query "${query}": ${err.message}`);
        }
    }


    /**
     * Deletes a memory item by its ID.
     * @param id The ID of the item.
     * @throws Error if database operation fails.
     */
    public async delete(id: string): Promise<void> {
        try {
            await super.run('DELETE FROM memory_items WHERE id = ?', [id]); // <-- Explicitly call super.run
        } catch (err: any) {
            console.error('[MemoryRepository] Error deleting memory item by id:', id, err.message);
            throw new Error(`Failed to delete memory item by id "${id}": ${err.message}`);
        }
    }

    /**
     * Elimina un item de memoria por su clave compuesta.
     * @param projectId The project ID.
     * @param type The memory type.
     * @param keyName The key name of the item.
     * @throws Error if database operation fails.
     */
    public async deleteByKey(projectId: string, type: string, keyName: string): Promise<void> {
         const targetProjectId = this.getProjectId(projectId);
        try {
            await super.run('DELETE FROM memory_items WHERE project_id = ? AND type = ? AND key_name = ?', [targetProjectId, type, keyName]); // <-- Explicitly call super.run
        } catch (err: any) {
            console.error('[MemoryRepository] Error deleting memory item by key:', { projectId, type, keyName }, err.message);
            throw new Error(`Failed to delete memory item "${type}/${keyName}" for project "${targetProjectId}": ${err.message}`);
        }
    }

    // Optional: Prune old memory items for a project
    // public async prune(projectId: string, olderThanTimestamp: number): Promise<void> {
    //     const targetProjectId = this.getProjectId(projectId);
    //     try {
    //         await super.run('DELETE FROM memory_items WHERE project_id = ? AND timestamp < ?', [targetProjectId, olderThanTimestamp]); // <-- Explicitly call super.run
    //         console.log(`[MemoryRepository] Pruned items for project "${targetProjectId}" older than ${new Date(olderThanTimestamp).toISOString()}`);
    //     } catch (err: any) {
    //         console.error('[MemoryRepository] Error pruning memory items:', err.message);
    //         throw new Error(`Failed to prune memory items for project "${targetProjectId}": ${err.message}`);
    //     }
    // }
}