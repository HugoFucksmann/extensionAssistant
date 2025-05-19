// src/store/repositories/MemoryRepository.ts

import * as sqlite3 from 'sqlite3';
import { randomUUID } from 'crypto';
import { IMemoryRepository, MemoryEntity } from '../interfaces/IMemoryRepository';
import { DatabaseManager } from '../database/DatabaseManager'; // Needed for constructor type hint

export class MemoryRepository implements IMemoryRepository {
    private db: sqlite3.Database;

    constructor(db: sqlite3.Database) { // Depend directly on the DB instance
        this.db = db;
         // Table initialization handled by DatabaseManager
    }

    public async create(memory: MemoryEntity): Promise<MemoryEntity> {
        return new Promise((resolve, reject) => {
            const memoryWithId = {
                ...memory,
                id: memory.id || randomUUID(),
                timestamp: memory.timestamp || Date.now(),
            };

            this.db.run(
                `INSERT INTO memory (id, chatId, type, key, content, timestamp, relevanceScore, relatedEntities)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    memoryWithId.id,
                    memoryWithId.chatId || null,
                    memoryWithId.type,
                    memoryWithId.key,
                    memoryWithId.content, // Content can be string or JSON stringified
                    memoryWithId.timestamp,
                    memoryWithId.relevanceScore || null,
                    memoryWithId.relatedEntities ? JSON.stringify(memoryWithId.relatedEntities) : null, // Store as JSON string
                ],
                (err) => {
                    if (err) {
                        console.error('[MemoryRepository] Error creating memory:', err.message);
                        reject(err);
                    } else {
                        resolve(memoryWithId);
                    }
                }
            );
        });
    }

    public async findById(id: string): Promise<MemoryEntity | null> {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM memory WHERE id = ?',
                [id],
                (err, row) => {
                    if (err) {
                        console.error('[MemoryRepository] Error finding memory:', err.message);
                        reject(err);
                    } else {
                        if (row) {
                            // Primero hacemos un cast a un tipo intermedio para que TypeScript reconozca las propiedades
                            const typedRow = row as Record<string, any>;
                            // Parse JSON string back for relatedEntities
                            if (typedRow.relatedEntities && typeof typedRow.relatedEntities === 'string') {
                                typedRow.relatedEntities = JSON.parse(typedRow.relatedEntities);
                            }
                            // Finalmente hacemos el cast al tipo final
                            resolve(typedRow as MemoryEntity);
                        } else {
                            resolve(null);
                        }
                    }
                }
            );
        });
    }

     public async findAll(): Promise<MemoryEntity[]> {
         // Typically you wouldn't fetch ALL memory, too many.
         // Use methods to get memory by key, search, or recent.
          throw new Error('findAll not implemented for MemoryRepository. Use specific query methods.');
     }

    public async update(id: string, item: Partial<MemoryEntity>): Promise<void> {
         const updateFields: (keyof Partial<MemoryEntity>)[] = ['chatId', 'type', 'key', 'content', 'timestamp', 'relevanceScore', 'relatedEntities'];
         const fields = updateFields.filter(field => item[field] !== undefined);

         if (fields.length === 0) {
             return Promise.resolve();
         }

         const setClause = fields.map(field => `${field} = ?`).join(', ');
         const values = fields.map(field => {
              if (field === 'relatedEntities') {
                 return item[field] ? JSON.stringify(item[field]) : null;
              }
              return (item as any)[field];
         });

        return new Promise((resolve, reject) => {
            this.db.run(
                `UPDATE memory SET ${setClause} WHERE id = ?`,
                [...values, id],
                 function(err) {
                     if (err) {
                         console.error('[MemoryRepository] Error updating memory:', err.message);
                         reject(err);
                     } else {
                          if (this.changes === 0) {
                               console.warn(`[MemoryRepository] No memory found with ID ${id} to update.`);
                          }
                         resolve();
                     }
                 }
            );
        });
    }

    public async delete(id: string): Promise<void> {
         return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM memory WHERE id = ?', [id], function(err) {
                 if (err) {
                    console.error('[MemoryRepository] Error deleting memory:', err.message);
                    reject(err);
                 } else {
                      if (this.changes === 0) {
                            console.warn(`[MemoryRepository] No memory found with ID ${id} to delete.`);
                      }
                     resolve();
                 }
            });
         });
    }

     // Implement specific query methods
     async getMemoryByKey(key: string): Promise<MemoryEntity | null> {
          return new Promise((resolve, reject) => {
               this.db.get(
                   'SELECT * FROM memory WHERE key = ? ORDER BY timestamp DESC LIMIT 1',
                   [key],
                   (err, row) => {
                       if (err) {
                           console.error('[MemoryRepository] Error getting memory by key:', err.message);
                           reject(err);
                       } else {
                            if (row) {
                                // Primero hacemos un cast a un tipo intermedio
                                const typedRow = row as Record<string, any>;
                                // Parse JSON string back for relatedEntities
                                if (typedRow.relatedEntities && typeof typedRow.relatedEntities === 'string') {
                                    typedRow.relatedEntities = JSON.parse(typedRow.relatedEntities);
                                }
                                // Finalmente hacemos el cast al tipo final
                                resolve(typedRow as MemoryEntity);
                            } else {
                                resolve(null);
                            }
                       }
                   }
               );
          });
     }

     async searchMemory(query: string, limit: number = 10): Promise<MemoryEntity[]> {
          // Basic search implementation (e.g., LIKE on content or key)
          return new Promise((resolve, reject) => {
               this.db.all(
                   `SELECT * FROM memory WHERE key LIKE ? OR content LIKE ? ORDER BY timestamp DESC LIMIT ?`,
                   [`%${query}%`, `%${query}%`, limit],
                   (err, rows) => {
                       if (err) {
                           console.error('[MemoryRepository] Error searching memory:', err.message);
                           reject(err);
                       } else {
                           // Parse JSON strings back to objects for each row
                           const parsedRows = rows.map(row => {
                               // Primero hacemos un cast a un tipo intermedio
                               const typedRow = row as Record<string, any>;
                               // Parse JSON string back for relatedEntities
                               if (typedRow.relatedEntities && typeof typedRow.relatedEntities === 'string') {
                                   typedRow.relatedEntities = JSON.parse(typedRow.relatedEntities);
                               }
                               // Convertimos al tipo final
                               return typedRow as MemoryEntity;
                           });
                           resolve(parsedRows);
                       }
                   }
               );
          });
     }

      async getRecentMemory(chatId: string | null = null, limit: number = 10): Promise<MemoryEntity[]> {
           // Get recent memory, optionally filtered by chat
           let query = 'SELECT * FROM memory';
           const params: (string | number)[] = [];
           if (chatId !== null) {
                query += ' WHERE chatId = ?';
                params.push(chatId);
           }
           query += ' ORDER BY timestamp DESC LIMIT ?';
           params.push(limit);


           return new Promise((resolve, reject) => {
                this.db.all(
                    query,
                    params,
                    (err, rows) => {
                        if (err) {
                            console.error('[MemoryRepository] Error getting recent memory:', err.message);
                            reject(err);
                        } else {
                            // Parse JSON strings back to objects for each row
                            const parsedRows = rows.map(row => {
                                // Primero hacemos un cast a un tipo intermedio
                                const typedRow = row as Record<string, any>;
                                // Parse JSON string back for relatedEntities
                                if (typedRow.relatedEntities && typeof typedRow.relatedEntities === 'string') {
                                    typedRow.relatedEntities = JSON.parse(typedRow.relatedEntities);
                                }
                                // Convertimos al tipo final
                                return typedRow as MemoryEntity;
                            });
                            resolve(parsedRows);
                        }
                    }
                );
           });
      }
}