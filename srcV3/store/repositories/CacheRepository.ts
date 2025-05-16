// src/store/repositories/CacheRepository.ts

import * as sqlite3 from 'sqlite3';
import { DatabaseManager } from '../database/DatabaseManager';
import * as vscode from 'vscode';

// Define la interfaz para la estructura de datos en la tabla cache_items
export interface CacheItem {
    key: string;
    data: any; // Campo para almacenar datos arbitrarios (como JSON)
    timestamp: number; // Timestamp de creación o actualización
}

// Define la interfaz del repositorio para el caché
export interface ICacheRepository {
    /**
     * Obtiene un item del caché por su clave.
     * @param key La clave única del item.
     * @returns El item del caché si se encuentra, o null si no.
     */
    get(key: string): Promise<CacheItem | null>;

    /**
     * Almacena o actualiza un item en el caché.
     * @param key La clave única del item.
     * @param data Los datos a almacenar (serán serializados a JSON).
     * @returns Una promesa que se resuelve cuando la operación se completa.
     */
    put(key: string, data: any): Promise<void>;

    /**
     * Elimina un item del caché por su clave.
     * @param key La clave única del item.
     * @returns Una promesa que se resuelve cuando la operación se completa.
     */
    delete(key: string): Promise<void>;

    // Métodos adicionales para limpieza (ej: eliminar items antiguos) podrían añadirse aquí.
}

/**
 * Implementación del repositorio para gestionar el caché en la base de datos SQLite.
 */
export class CacheRepository implements ICacheRepository {
    private db: sqlite3.Database;

    constructor(context: vscode.ExtensionContext) {
        const dbManager = DatabaseManager.getInstance(context);
        this.db = dbManager.getDatabase();
        // La creación de la tabla 'cache_items' se maneja en ChatRepository.initializeTables
        // para simplificar la inicialización en una sola función por ahora.
    }

    /**
     * Obtiene un item del caché por su clave.
     * @param key La clave única del item.
     * @returns El item del caché si se encuentra, o null si no.
     */
    public async get(key: string): Promise<CacheItem | null> {
        return new Promise((resolve, reject) => {
            // Especifica explícitamente los nombres de las columnas que esperas
            this.db.get(
                'SELECT key, data, timestamp FROM cache_items WHERE key = ?',
                [key],
                (err: Error | null, row: any) => { // Usa 'any' para la fila cruda de SQLite
                    if (err) {
                        console.error('[CacheRepository] Error getting cache item:', err.message);
                        reject(err);
                    } else {
                        if (row) {
                            try {
                                // Asegúrate de que las propiedades existen en la fila devuelta
                                if (row.key !== undefined && row.data !== undefined && row.timestamp !== undefined) {
                                     // Parse the JSON data before returning
                                     resolve({
                                         key: row.key,
                                         data: JSON.parse(row.data), // Parsea el string JSON
                                         timestamp: row.timestamp
                                     });
                                } else {
                                     console.warn('[CacheRepository] Cached row missing expected properties for key:', key, row);
                                     // Consider deleting corrupted row here if properties are missing
                                     this.delete(key).catch(deleteErr => console.error('[CacheRepository] Error deleting incomplete cache item:', deleteErr));
                                     resolve(null); // Return null if row structure is unexpected
                                }
                            } catch (parseErr) {
                                console.error('[CacheRepository] Error parsing cached data for key:', key, parseErr);
                                // Optionally delete corrupted cache item
                                this.delete(key).catch(deleteErr => console.error('[CacheRepository] Error deleting corrupted cache item:', deleteErr));
                                resolve(null); // Return null if data is corrupted JSON
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
     * Almacena o actualiza un item en el caché.
     * @param key La clave única del item.
     * @param data Los datos a almacenar (serán serializados a JSON).
     * @returns Una promesa que se resuelve cuando la operación se completa.
     */
    public async put(key: string, data: any): Promise<void> {
        const jsonData = JSON.stringify(data); // Serializa los datos a JSON string
        const timestamp = Date.now();

        return new Promise((resolve, reject) => {
            // Usa INSERT OR REPLACE para actualizar si la clave ya existe
            this.db.run(
                'INSERT OR REPLACE INTO cache_items (key, data, timestamp) VALUES (?, ?, ?)',
                [key, jsonData, timestamp],
                (err: Error | null) => {
                    if (err) {
                        console.error('[CacheRepository] Error putting cache item:', err.message);
                        reject(err);
                    } else {
                        // this.lastID and this.changes are available here if needed,
                        // but for put operation, just resolving is usually sufficient.
                        resolve();
                    }
                }
            );
        });
    }

    /**
     * Elimina un item del caché por su clave.
     * @param key La clave única del item.
     * @returns Una promesa que se resuelve cuando la operación se completa.
     */
    public async delete(key: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run(
                'DELETE FROM cache_items WHERE key = ?',
                [key],
                (err: Error | null) => {
                    if (err) {
                        console.error('[CacheRepository] Error deleting cache item:', err.message);
                        reject(err);
                    } else {
                        // this.changes is available here if needed (number of rows deleted)
                        resolve();
                    }
                }
            );
        });
    }

    /**
     * Dispone de los recursos del repositorio (si los hubiera).
     * En este caso, la conexión a la DB es gestionada por DatabaseManager.
     */
    dispose(): void {
        console.log('[CacheRepository] Disposing.');
        // No specific resources to clean up here as DBManager is singleton
    }
}