// src/features/memory/MemoryManager.ts

import * as vscode from 'vscode';
import * as path from 'path';
import { Database } from 'sqlite3';
import { promisify } from 'util';
import { Disposable } from '../../core/interfaces/Disposable';

export interface MemoryEntry {
    id?: string; // ID es opcional en la creación, se genera al guardar
    sessionId: string;
    timestamp: number;
    type: 'tool_result' | 'error' | 'success' | 'plan' | 'user_feedback' | 'solution';
    content: string;
    contextMode: 'simple' | 'planner' | 'supervised';
    contextTools: string; // JSON string de array de nombres de herramientas
    contextFiles: string; // JSON string de array de nombres de archivos
    relevanceScore: number;
    relatedTo: string[]; // Para IDs de plan, IDs de paso, etc.
    createdAt?: number; // Opcional en la creación
}

// Interfaz de estado simplificada para la dependencia
export interface ExecutionStateForMemory {
    sessionId: string;
    mode: 'simple' | 'planner' | 'supervised';
    currentQuery?: string;
    lastResult?: any;
}


export class MemoryManager implements Disposable {
    private db!: Database;
    private dbPath: string;
    private runtimeMemory = new Map<string, any>();

    private dbRun!: (sql: string, params?: any[]) => Promise<{ lastID: number, changes: number }>;
    private dbGet!: (sql: string, params?: any[]) => Promise<any>;
    private dbAll!: (sql: string, params?: any[]) => Promise<any[]>;

    constructor(private context: vscode.ExtensionContext) {
        this.dbPath = path.join(
            this.context.globalStorageUri.fsPath,
            'memory.db'
        );
        this.initializeDatabase();
    }

    private async initializeDatabase(): Promise<void> {
        try {
            await vscode.workspace.fs.createDirectory(this.context.globalStorageUri);
        } catch (error) {
            // Directorio probablemente ya existe
        }

        this.db = new Database(this.dbPath);
        this.dbRun = promisify(this.db.run.bind(this.db));
        this.dbGet = promisify(this.db.get.bind(this.db));
        this.dbAll = promisify(this.db.all.bind(this.db));

        await this.createTables();
        await this.createIndexes();
    }

    private async createTables(): Promise<void> {
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS memory_entries (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                type TEXT CHECK(type IN ('tool_result', 'error', 'success', 'plan', 'user_feedback', 'solution')) NOT NULL,
                content TEXT NOT NULL,
                context_mode TEXT CHECK(context_mode IN ('simple', 'planner', 'supervised')) NOT NULL,
                context_tools TEXT DEFAULT '[]',
                context_files TEXT DEFAULT '[]',
                relevance_score REAL DEFAULT 1.0,
                related_to TEXT DEFAULT '[]',
                created_at INTEGER DEFAULT (strftime('%s', 'now'))
            )
        `;
        await this.dbRun(createTableSQL);
    }

    private async createIndexes(): Promise<void> {
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_session_mode_timestamp ON memory_entries(session_id, context_mode, timestamp DESC)',
            'CREATE INDEX IF NOT EXISTS idx_type_relevance ON memory_entries(type, relevance_score DESC)',
            'CREATE INDEX IF NOT EXISTS idx_timestamp ON memory_entries(timestamp DESC)',
            'CREATE INDEX IF NOT EXISTS idx_session_type ON memory_entries(session_id, type)'
        ];
        for (const indexSQL of indexes) {
            await this.dbRun(indexSQL);
        }
    }

    /**
     * CAMBIO CLAVE: Lógica de recuperación de memoria mejorada.
     * En lugar de una consulta única por modo, realiza varias consultas dirigidas
     * para construir un contexto de memoria más rico y relevante.
     */
    public async getRelevantMemory(state: ExecutionStateForMemory, maxTokens: number): Promise<MemoryEntry[]> {
        const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);

        try {
            // Consultas concurrentes para diferentes tipos de memoria
            const [errors, lastPlan, successfulPatterns, recentToolResults] = await Promise.all([
                this.getMemoryByType(state.sessionId, 'error', 24, 2), // Últimos 2 errores
                this.getMemoryByType(state.sessionId, 'plan', 24, 1), // Último plan
                this.getMemoryByType(state.sessionId, 'success', 24, 5), // Últimos 5 éxitos
                this.getMemoryByType(state.sessionId, 'tool_result', 24, 3) // Últimos 3 resultados de herramientas
            ]);

            // Combinar y eliminar duplicados
            const combinedEntries = new Map<string, MemoryEntry>();
            [...errors, ...lastPlan, ...successfulPatterns, ...recentToolResults].forEach(entry => {
                if (entry.id) {
                    combinedEntries.set(entry.id, entry);
                }
            });

            // Ordenar por relevancia y luego por fecha
            const sortedEntries = Array.from(combinedEntries.values()).sort((a, b) => {
                if (b.relevanceScore !== a.relevanceScore) {
                    return b.relevanceScore - a.relevanceScore;
                }
                return b.timestamp - a.timestamp;
            });

            return this.tokenLimitedResults(sortedEntries, maxTokens);

        } catch (error) {
            console.error('Error retrieving relevant memory:', error);
            return [];
        }
    }

    private tokenLimitedResults(entries: MemoryEntry[], maxTokens: number): MemoryEntry[] {
        let totalTokens = 0;
        const result: MemoryEntry[] = [];
        for (const entry of entries) {
            const entryTokens = this.estimateTokens(entry.content);
            if (totalTokens + entryTokens > maxTokens) {
                break;
            }
            totalTokens += entryTokens;
            result.push(entry);
        }
        return result;
    }

    private estimateTokens(content: string): number {
        return Math.ceil((content || '').length / 4);
    }

    public async storeMemoryEntry(entry: Omit<MemoryEntry, 'id' | 'createdAt'>): Promise<string> {
        const id = this.generateId();
        const sql = `
            INSERT INTO memory_entries (
                id, session_id, timestamp, type, content, context_mode,
                context_tools, context_files, relevance_score, related_to
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
            id,
            entry.sessionId,
            entry.timestamp,
            entry.type,
            entry.content,
            entry.contextMode,
            entry.contextTools, // Ya es un string JSON
            entry.contextFiles, // Ya es un string JSON
            entry.relevanceScore,
            JSON.stringify(entry.relatedTo || [])
        ];
        await this.dbRun(sql, params);
        return id;
    }

    /**
     * CAMBIO CLAVE: Implementación completa de la restauración de memoria.
     * Borra las entradas de memoria de la sesión que son más recientes que la entrada más antigua
     * del snapshot y luego inserta todas las entradas del snapshot.
     * Esto asegura que el estado de la memoria sea consistente con el checkpoint.
     */
    public async restoreMemory(memorySnapshot: MemoryEntry[]): Promise<void> {
        if (!memorySnapshot || memorySnapshot.length === 0) {
            console.warn('[MemoryManager] Attempted to restore an empty or invalid memory snapshot.');
            return;
        }

        const sessionId = memorySnapshot[0].sessionId;
        if (!sessionId) {
            console.error('[MemoryManager] Cannot restore memory snapshot without a session ID.');
            return;
        }

        // Encontrar la marca de tiempo más antigua en el snapshot para el borrado
        const oldestTimestampInSnapshot = Math.min(...memorySnapshot.map(e => e.timestamp));

        try {
            await this.dbRun('BEGIN TRANSACTION');

            // Borrar entradas más recientes para evitar inconsistencias
            const deleteSql = 'DELETE FROM memory_entries WHERE session_id = ? AND timestamp >= ?';
            await this.dbRun(deleteSql, [sessionId, oldestTimestampInSnapshot]);

            // Insertar las entradas del snapshot
            const insertSql = `
                INSERT INTO memory_entries (id, session_id, timestamp, type, content, context_mode, context_tools, context_files, relevance_score, related_to, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            for (const entry of memorySnapshot) {
                const params = [
                    entry.id || this.generateId(),
                    entry.sessionId,
                    entry.timestamp,
                    entry.type,
                    entry.content,
                    entry.contextMode,
                    entry.contextTools,
                    entry.contextFiles,
                    entry.relevanceScore,
                    JSON.stringify(entry.relatedTo || '[]'),
                    entry.createdAt || Math.floor(entry.timestamp / 1000)
                ];
                await this.dbRun(insertSql, params);
            }

            await this.dbRun('COMMIT');
            console.log(`[MemoryManager] Successfully restored memory for session ${sessionId} with ${memorySnapshot.length} entries.`);

        } catch (error) {
            await this.dbRun('ROLLBACK');
            console.error('[MemoryManager] Failed to restore memory snapshot. Transaction rolled back.', error);
            throw error;
        }
    }

    public async searchMemory(sessionId: string, query: string, type?: MemoryEntry['type'], limit = 10): Promise<MemoryEntry[]> {
        let sql = `SELECT * FROM memory_entries WHERE session_id = ? AND content LIKE ?`;
        const params: any[] = [sessionId, `%${query}%`];

        if (type) {
            sql += ` AND type = ?`;
            params.push(type);
        }

        sql += ` ORDER BY relevance_score DESC, timestamp DESC LIMIT ?`;
        params.push(limit);

        const results = await this.dbAll(sql, params);
        return results.map(this.mapRowToMemoryEntry);
    }

    public async getMemoryByType(sessionId: string, type: MemoryEntry['type'], hoursBack = 24, limit = 10): Promise<MemoryEntry[]> {
        const cutoffTime = Date.now() - (hoursBack * 60 * 60 * 1000);
        const sql = `
            SELECT * FROM memory_entries
            WHERE session_id = ? AND type = ? AND timestamp > ?
            ORDER BY timestamp DESC LIMIT ?
        `;
        const params = [sessionId, type, cutoffTime, limit];
        const results = await this.dbAll(sql, params);
        return results.map(this.mapRowToMemoryEntry);
    }

    // ... (resto de métodos como setRuntime, getRuntime, cleanup, dispose, etc. se mantienen sin cambios) ...

    public setRuntime(chatId: string, key: string, value: any): void {
        this.runtimeMemory.set(`${chatId}:${key}`, value);
    }

    public getRuntime<T>(chatId: string, key: string): T | undefined {
        return this.runtimeMemory.get(`${chatId}:${key}`);
    }

    public clearRuntime(chatId: string): void {
        for (const key of this.runtimeMemory.keys()) {
            if (key.startsWith(`${chatId}:`)) {
                this.runtimeMemory.delete(key);
            }
        }
    }

    private mapRowToMemoryEntry(row: any): MemoryEntry {
        return {
            ...row,
            relatedTo: JSON.parse(row.related_to || '[]')
        };
    }

    private generateId(): string {
        return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    public async dispose(): Promise<void> {
        this.runtimeMemory.clear();
        if (this.db) {
            await new Promise<void>((resolve, reject) => {
                this.db.close((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }
    }
}