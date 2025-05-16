// src/store/repositories/MemoryRepository.ts

import * as sqlite3 from 'sqlite3';
import { DatabaseManager } from '../database/DatabaseManager';
import * as vscode from 'vscode';
import { randomUUID } from 'crypto';
import { getMainWorkspacePath } from '../../tools/core/core'; // Helper to get project ID

// Define la interfaz para la estructura de datos en la tabla memory_items
export interface MemoryItem {
    id?: string; // Optional when creating, will be assigned by repo
    userId?: string; // Optional
    projectId: string; // Associated workspace/project
    type: string; // e.g., 'decision', 'convention', 'key_entity', 'code_snippet'
    keyName?: string; // Optional short identifier, used for UNIQUE constraint
    content: any; // The actual memory data (stored as JSON string in DB)
    timestamp: number; // Timestamp of creation/update
    // Add other fields defined in DB schema here if needed in TS interface
    reason?: string; // Added based on the prompt.memoryExtractor structure
}

// Define la interfaz del repositorio para la memoria semántica
export interface IMemoryRepository {
    /**
     * Almacena o actualiza un item de memoria. Usa REPLACE si projectId, type, y keyName son únicos.
     * @param item El item de memoria a almacenar.
     * @returns El item de memoria almacenado (incluyendo el ID si fue generado).
     */
    put(item: MemoryItem): Promise<MemoryItem>;

    /**
     * Obtiene un item de memoria por su clave compuesta (projectId, type, keyName).
     * @param projectId El ID del proyecto.
     * @param type El tipo de memoria.
     * @param keyName El nombre clave del item.
     * @returns El item de memoria si se encuentra, o null si no.
     */
    get(projectId: string, type: string, keyName: string): Promise<MemoryItem | null>;

    /**
     * Busca items de memoria por tipo para un proyecto específico.
     * @param projectId El ID del proyecto.
     * @param type El tipo de memoria a buscar.
     * @param limit Opcional, el número máximo de items a devolver.
     * @returns Un array de items de memoria.
     */
    findByType(projectId: string, type: string, limit?: number): Promise<MemoryItem[]>;

     /**
      * Busca items de memoria por texto en keyName o content (búsqueda básica).
      * @param projectId El ID del proyecto.
      * @param query La cadena de búsqueda.
      * @param limit Opcional, el número máximo de items a devolver.
      * @returns Un array de items de memoria relevantes.
      */
    search(projectId: string, query: string, limit?: number): Promise<MemoryItem[]>; // Placeholder for future semantic search

    /**
     * Elimina un item de memoria por su ID.
     * @param id El ID del item.
     * @returns Una promesa que se resuelve cuando la operación se completa.
     */
    delete(id: string): Promise<void>;

    /**
     * Elimina un item de memoria por su clave compuesta.
     * @param projectId El ID del proyecto.
     * @param type El tipo de memoria.
     * @param keyName El nombre clave del item.
     * @returns Una promesa que se resuelve cuando la operación se completa.
     */
    deleteByKey(projectId: string, type: string, keyName: string): Promise<void>;

    // Métodos adicionales para limpieza podrían añadirse aquí.
}

/**
 * Implementación del repositorio para gestionar la memoria semántica en la base de datos SQLite.
 */
export class MemoryRepository implements IMemoryRepository {
    private db: sqlite3.Database;
    private projectId: string; // Store current workspace path as project ID

    constructor(context: vscode.ExtensionContext) {
        const dbManager = DatabaseManager.getInstance(context);
        this.db = dbManager.getDatabase();
        // Get the current workspace path to use as the project identifier
        try {
             this.projectId = getMainWorkspacePath();
        } catch (error) {
             console.error('[MemoryRepository] Could not get workspace path, using default ID.', error);
             this.projectId = 'default_project'; // Fallback ID if no workspace is open
        }
        // La creación de la tabla 'memory_items' se maneja en ChatRepository.initializeTables
    }

    /**
     * Almacena o actualiza un item de memoria. Usa REPLACE si projectId, type, y keyName son únicos.
     * @param item El item de memoria a almacenar.
     * @returns El item de memoria almacenado (incluyendo el ID si fue generado).
     */
    public async put(item: MemoryItem): Promise<MemoryItem> {
        const itemWithDefaults = {
            ...item,
            id: item.id || randomUUID(), // Generate ID if not provided
            projectId: item.projectId || this.projectId, // Use current project ID if not provided
            timestamp: item.timestamp || Date.now(), // Use current timestamp if not provided
            content: JSON.stringify(item.content) // Store content as JSON string
            // reason is optional and not stored in DB schema based on current ChatRepository table definition
            // If you added 'reason' to the DB schema, include it here.
        };

        return new Promise((resolve, reject) => {
            // Use INSERT OR REPLACE based on the UNIQUE constraint on (project_id, type, key_name)
            // Ensure key_name is not null if using the UNIQUE constraint
            if (itemWithDefaults.keyName === null || itemWithDefaults.keyName === undefined) {
                 // Handle cases where keyName might be missing - maybe generate one or reject?
                 // For now, let's allow null keyName but the UNIQUE constraint won't apply well.
                 // If keyName is crucial for uniqueness, enforce it here.
                 // Based on prompt.memoryExtractor, keyName is required. Let's enforce.
                 if (!itemWithDefaults.keyName) {
                     const error = new Error('MemoryItem requires a keyName for unique identification.');
                     console.error('[MemoryRepository] Put failed:', error.message, item);
                     return reject(error);
                 }
            }


            this.db.run(
                `INSERT OR REPLACE INTO memory_items (id, user_id, project_id, type, key_name, content, timestamp)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    itemWithDefaults.id,
                    itemWithDefaults.userId,
                    itemWithDefaults.projectId,
                    itemWithDefaults.type,
                    itemWithDefaults.keyName, // Ensure keyName is included
                    itemWithDefaults.content,
                    itemWithDefaults.timestamp
                ],
                function(err: Error | null) { // Use function() to access this.lastID/this.changes
                    if (err) {
                        console.error('[MemoryRepository] Error putting memory item:', err.message, item);
                        reject(err);
                    } else {
                        // Return the item with the generated ID and defaults applied
                        // Note: The 'content' property in the returned object is still the JSON string here.
                        // If you want the parsed object, you'd need to parse it back.
                        // Let's parse it back for consistency with 'get' methods.
                         try {
                             const storedItem = {
                                 ...itemWithDefaults,
                                 content: JSON.parse(itemWithDefaults.content) // Parse content back
                             };
                             resolve(storedItem);
                         } catch (parseErr) {
                              console.error('[MemoryRepository] Error parsing content after put:', parseErr, itemWithDefaults);
                              // Resolve with the item, but log the parsing error
                              resolve(itemWithDefaults as any); // Resolve with string content if parsing fails
                         }
                    }
                }
            );
        });
    }

    /**
     * Obtiene un item de memoria por su clave compuesta (projectId, type, keyName).
     * @param projectId El ID del proyecto.
     * @param type El tipo de memoria.
     * @param keyName El nombre clave del item.
     * @returns El item de memoria si se encuentra, o null si no.
     */
    public async get(projectId: string, type: string, keyName: string): Promise<MemoryItem | null> {
         const targetProjectId = projectId || this.projectId; // Use current project ID if not provided
        return new Promise((resolve, reject) => {
            // Select all columns defined in the interface
            this.db.get(
                'SELECT id, user_id, project_id, type, key_name, content, timestamp FROM memory_items WHERE project_id = ? AND type = ? AND key_name = ?',
                [targetProjectId, type, keyName],
                (err: Error | null, row: any) => { // Use 'any' for the raw row
                    if (err) {
                        console.error('[MemoryRepository] Error getting memory item:', err.message);
                        reject(err);
                    } else {
                        if (row) {
                            try {
                                // Ensure required properties exist
                                if (row.id !== undefined && row.project_id !== undefined && row.type !== undefined && row.content !== undefined && row.timestamp !== undefined) {
                                     // Parse the JSON content before returning
                                     resolve({
                                         id: row.id,
                                         userId: row.user_id, // Can be null in DB, keep as optional
                                         projectId: row.project_id,
                                         type: row.type,
                                         keyName: row.key_name, // Can be null in DB, keep as optional
                                         content: JSON.parse(row.content), // Parse the JSON string
                                         timestamp: row.timestamp,
                                         // reason is not in DB schema based on current ChatRepository table definition
                                     });
                                } else {
                                     console.warn('[MemoryRepository] Memory row missing expected properties for key:', keyName, row);
                                     // Consider deleting corrupted row
                                     this.deleteByKey(targetProjectId, type, keyName).catch(deleteErr => console.error('[MemoryRepository] Error deleting incomplete memory item:', deleteErr));
                                     resolve(null); // Return null if row structure is unexpected
                                }
                            } catch (parseErr) {
                                console.error('[MemoryRepository] Error parsing memory content for key:', keyName, parseErr);
                                // Optionally delete corrupted memory item
                                this.deleteByKey(targetProjectId, type, keyName).catch(deleteErr => console.error('[MemoryRepository] Error deleting corrupted memory item:', deleteErr));
                                resolve(null); // Return null if content is corrupted JSON
                            }
                        } else {
                            resolve(null); // Item not found
                        }
                    }
                }
            );
        });
    }

    /**
     * Busca items de memoria por tipo para un proyecto específico.
     * @param projectId El ID del proyecto.
     * @param type El tipo de memoria a buscar.
     * @param limit Opcional, el número máximo de items a devolver.
     * @returns Un array de items de memoria.
     */
    public async findByType(projectId: string, type: string, limit?: number): Promise<MemoryItem[]> {
         const targetProjectId = projectId || this.projectId;
         const limitClause = limit ? `LIMIT ${limit}` : '';
        return new Promise((resolve, reject) => {
            // Select all columns defined in the interface
            this.db.all(
                `SELECT id, user_id, project_id, type, key_name, content, timestamp FROM memory_items WHERE project_id = ? AND type = ? ORDER BY timestamp DESC ${limitClause}`,
                [targetProjectId, type],
                (err: Error | null, rows: any[]) => { // Use 'any[]' for raw rows
                    if (err) {
                        console.error('[MemoryRepository] Error finding memory items by type:', err.message);
                        reject(err);
                    } else {
                         try {
                             // Map and parse JSON content for all rows
                             const items: MemoryItem[] = rows.map(row => {
                                 // Ensure required properties exist before parsing
                                 if (row.id !== undefined && row.project_id !== undefined && row.type !== undefined && row.content !== undefined && row.timestamp !== undefined) {
                                     return {
                                         id: row.id,
                                         userId: row.user_id,
                                         projectId: row.project_id,
                                         type: row.type,
                                         keyName: row.key_name,
                                         content: JSON.parse(row.content), // Parse the JSON string
                                         timestamp: row.timestamp,
                                         // reason is not in DB schema
                                     };
                                 } else {
                                     console.warn('[MemoryRepository] Skipping incomplete memory row in findByType:', row);
                                     // Return null or undefined for incomplete rows, filter them out later
                                     return null;
                                 }
                             }).filter(item => item !== null) as MemoryItem[]; // Filter out any nulls from incomplete rows
                             resolve(items);
                         } catch (parseErr) {
                             console.error('[MemoryRepository] Error parsing memory content in findByType:', parseErr);
                             // If parsing fails for *any* row, the whole operation might be suspect.
                             // Rejecting or resolving with partial data depends on desired robustness.
                             // Let's reject for now if parsing fails for the result set.
                             reject(parseErr);
                         }
                    }
                }
            );
        });
    }

     /**
      * Busca items de memoria por texto en keyName o content (búsqueda básica).
      * @param projectId El ID del proyecto.
      * @param query La cadena de búsqueda.
      * @param limit Opcional, el número máximo de items a devolver.
      * @returns Un array de items de memoria relevantes.
      */
    public async search(projectId: string, query: string, limit?: number): Promise<MemoryItem[]> {
        // Placeholder: Implement actual semantic search later (e.g., using embeddings)
        // For now, a simple text search on key_name or content might be a basic fallback
         const targetProjectId = projectId || this.projectId;
         const limitClause = limit ? `LIMIT ${limit}` : '';
         const searchTerm = `%${query}%`; // Basic substring search

        return new Promise((resolve, reject) => {
            // Select all columns defined in the interface
            this.db.all(
                `SELECT id, user_id, project_id, type, key_name, content, timestamp FROM memory_items
                 WHERE project_id = ? AND (key_name LIKE ? OR content LIKE ?)
                 ORDER BY timestamp DESC ${limitClause}`,
                [targetProjectId, searchTerm, searchTerm],
                (err: Error | null, rows: any[]) => { // Use 'any[]' for raw rows
                    if (err) {
                        console.error('[MemoryRepository] Error searching memory items:', err.message);
                        reject(err);
                    } else {
                         try {
                             // Map and parse JSON content for all rows
                             const items: MemoryItem[] = rows.map(row => {
                                  if (row.id !== undefined && row.project_id !== undefined && row.type !== undefined && row.content !== undefined && row.timestamp !== undefined) {
                                     return {
                                         id: row.id,
                                         userId: row.user_id,
                                         projectId: row.project_id,
                                         type: row.type,
                                         keyName: row.key_name,
                                         content: JSON.parse(row.content), // Parse the JSON string
                                         timestamp: row.timestamp,
                                         // reason is not in DB schema
                                     };
                                 } else {
                                     console.warn('[MemoryRepository] Skipping incomplete memory row in search:', row);
                                     return null;
                                 }
                             }).filter(item => item !== null) as MemoryItem[]; // Filter out any nulls
                             resolve(items);
                         } catch (parseErr) {
                             console.error('[MemoryRepository] Error parsing memory content in search:', parseErr);
                             reject(parseErr);
                         }
                    }
                }
            );
        });
    }


    /**
     * Elimina un item de memoria por su ID.
     * @param id El ID del item.
     * @returns Una promesa que se resuelve cuando la operación se completa.
     */
    public async delete(id: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM memory_items WHERE id = ?', [id], (err: Error | null) => {
                if (err) {
                    console.error('[MemoryRepository] Error deleting memory item by id:', err.message);
                    reject(err);
                } else {
                    // this.changes is available here
                    resolve();
                }
            });
        });
    }

    /**
     * Elimina un item de memoria por su clave compuesta.
     * @param projectId El ID del proyecto.
     * @param type El tipo de memoria.
     * @param keyName El nombre clave del item.
     * @returns Una promesa que se resuelve cuando la operación se completa.
     */
    public async deleteByKey(projectId: string, type: string, keyName: string): Promise<void> {
         const targetProjectId = projectId || this.projectId;
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM memory_items WHERE project_id = ? AND type = ? AND key_name = ?', [targetProjectId, type, keyName], (err: Error | null) => {
                if (err) {
                    console.error('[MemoryRepository] Error deleting memory item by key:', err.message);
                    reject(err);
                } else {
                    // this.changes is available here
                    resolve();
                }
            });
        });
    }

    /**
     * Dispone de los recursos del repositorio (si los hubiera).
     * En este caso, la conexión a la DB es gestionada por DatabaseManager.
     */
    dispose(): void {
        console.log('[MemoryRepository] Disposing.');
        // DB is managed by DatabaseManager singleton
    }
}