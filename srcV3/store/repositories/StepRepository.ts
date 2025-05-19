// src/store/repositories/StepRepository.ts

import * as sqlite3 from 'sqlite3';
import { randomUUID } from 'crypto';
import { IStepRepository, ExecutionStepEntity } from '../interfaces/IStepRepository';
import { DatabaseManager } from '../database/DatabaseManager'; // Needed for constructor type hint

export class StepRepository implements IStepRepository {
    private db: sqlite3.Database;

    constructor(db: sqlite3.Database) { // Depend directly on the DB instance
        this.db = db;
        // Table initialization handled by DatabaseManager
    }

    public async create(step: ExecutionStepEntity): Promise<ExecutionStepEntity> {
         return new Promise((resolve, reject) => {
            const stepWithId = {
                ...step,
                id: step.id || randomUUID()
            };

            this.db.run(
                `INSERT INTO execution_steps (id, traceId, chatId, stepName, stepType, stepExecute, stepParams, startTime, endTime, status, result, error, planningIteration)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    stepWithId.id,
                    stepWithId.traceId,
                    stepWithId.chatId,
                    stepWithId.stepName,
                    stepWithId.stepType,
                    stepWithId.stepExecute,
                    stepWithId.stepParams ? JSON.stringify(stepWithId.stepParams) : null, // Store params as JSON string
                    stepWithId.startTime,
                    stepWithId.endTime || null,
                    stepWithId.status,
                    stepWithId.result ? JSON.stringify(stepWithId.result) : null, // Store result as JSON string
                    stepWithId.error || null,
                    stepWithId.planningIteration || null,
                ],
                (err) => {
                    if (err) {
                        console.error('[StepRepository] Error creating step:', err.message);
                        reject(err);
                    } else {
                        resolve(stepWithId);
                    }
                }
            );
         });
    }

     public async findById(id: string): Promise<ExecutionStepEntity | null> {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM execution_steps WHERE id = ?',
                [id],
                (err, row) => {
                    if (err) {
                        console.error('[StepRepository] Error finding step:', err.message);
                        reject(err);
                    } else {
                        if (row) {
                            // Primero hacemos un cast a un tipo intermedio para que TypeScript reconozca las propiedades
                            const typedRow = row as Record<string, any>;
                            // Parse JSON strings back to objects
                            if (typedRow.stepParams) typedRow.stepParams = JSON.parse(typedRow.stepParams as string);
                            if (typedRow.result) typedRow.result = JSON.parse(typedRow.result as string);
                            // Finalmente hacemos el cast al tipo final
                            resolve(typedRow as ExecutionStepEntity);
                        } else {
                            resolve(null);
                        }
                    }
                }
            );
        });
    }

     public async findAll(): Promise<ExecutionStepEntity[]> {
         // Typically you wouldn't fetch ALL steps, too many.
         // Implement methods to get steps for a specific trace or conversation.
         throw new Error('findAll not implemented for StepRepository. Use getStepsForTrace instead.');
     }

    public async update(id: string, item: Partial<ExecutionStepEntity>): Promise<void> {
        // Filter fields to update, excluding 'id', 'traceId', 'chatId', 'stepName', 'stepType', 'stepExecute', 'startTime'
        const updateFields: (keyof Partial<ExecutionStepEntity>)[] = ['endTime', 'status', 'result', 'error', 'planningIteration'];
        const fields = updateFields.filter(field => item[field] !== undefined);

        if (fields.length === 0) {
            return Promise.resolve();
        }

        const setClause = fields.map(field => `${field} = ?`).join(', ');
        const values = fields.map(field => {
            // Handle JSON stringification for specific fields
            if (field === 'stepParams' || field === 'result') { // stepParams shouldn't be updated here, but included for robustness
                 return item[field] ? JSON.stringify(item[field]) : null;
            }
            return (item as any)[field];
        });

        return new Promise((resolve, reject) => {
            this.db.run(
                `UPDATE execution_steps SET ${setClause} WHERE id = ?`,
                [...values, id],
                 function(err) {
                     if (err) {
                         console.error('[StepRepository] Error updating step:', err.message);
                         reject(err);
                     } else {
                          if (this.changes === 0) {
                               console.warn(`[StepRepository] No step found with ID ${id} to update.`);
                          }
                         resolve();
                     }
                 }
            );
        });
    }

    public async delete(id: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM execution_steps WHERE id = ?', [id], function(err) {
                if (err) {
                    console.error('[StepRepository] Error deleting step:', err.message);
                    reject(err);
                } else {
                     if (this.changes === 0) {
                           console.warn(`[StepRepository] No step found with ID ${id} to delete.`);
                     }
                    resolve();
                }
            });
        });
    }

    public async getStepsForTrace(traceId: string): Promise<ExecutionStepEntity[]> {
         return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM execution_steps WHERE traceId = ? ORDER BY startTime ASC',
                [traceId],
                (err, rows) => {
                    if (err) {
                        console.error('[StepRepository] Error getting steps for trace:', err.message);
                        reject(err);
                    } else {
                        // Parse JSON strings back to objects for each row
                        const parsedRows = rows.map(row => {
                            // Primero hacemos un cast a un tipo intermedio
                            const typedRow = row as Record<string, any>;
                            // Parse JSON strings back to objects
                            if (typedRow.stepParams && typeof typedRow.stepParams === 'string') {
                                typedRow.stepParams = JSON.parse(typedRow.stepParams);
                            }
                            if (typedRow.result && typeof typedRow.result === 'string') {
                                typedRow.result = JSON.parse(typedRow.result);
                            }
                            // Convertimos al tipo final
                            return typedRow as ExecutionStepEntity;
                        });
                        resolve(parsedRows);
                    }
                }
            );
         });
    }
}