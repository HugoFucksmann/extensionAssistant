// src/features/memory/MemoryManager.ts

import * as vscode from 'vscode';
import * as path from 'path';
import { Database } from 'sqlite3';
import { promisify } from 'util';

export interface MemoryEntry {
    id: string;
    sessionId: string;
    timestamp: number;
    type: 'tool_result' | 'error' | 'success' | 'plan' | 'user_feedback' | 'solution';
    content: string;
    contextMode: 'simple' | 'planner' | 'supervised';
    contextTools: string;
    contextFiles: string;
    relevanceScore: number;
    relatedTo: string[];
    createdAt: number;
}

export interface ExecutionState {
    sessionId: string;
    mode: 'simple' | 'planner' | 'supervised';
    step: number;
    lastResult: any;
    errorCount: number;
    executionState?: 'planning' | 'executing' | 'paused' | 'completed' | 'error';
    planText?: string;
    checkpoints?: any[];
    progress?: number;
    metrics?: any;
}

import { Disposable } from '../../core/interfaces/Disposable';

export class MemoryManager implements Disposable {
    private db!: Database;
    private dbPath: string;
    private runtimeMemory = new Map<string, any>();

    // Promisified database methods
    private dbRun!: (sql: string, params?: any[]) => Promise<void>;
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
            // Ensure storage directory exists
            await vscode.workspace.fs.createDirectory(this.context.globalStorageUri);
        } catch (error) {
            // Directory might already exist
        }

        this.db = new Database(this.dbPath);

        // Promisify database methods
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
            'CREATE INDEX IF NOT EXISTS idx_session_mode_timestamp ON memory_entries(session_id, context_mode, timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_type_relevance ON memory_entries(type, relevance_score)',
            'CREATE INDEX IF NOT EXISTS idx_timestamp ON memory_entries(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_session_type ON memory_entries(session_id, type)'
        ];

        for (const indexSQL of indexes) {
            await this.dbRun(indexSQL);
        }
    }

    // Core method for mode-specific memory retrieval
    public async getRelevantMemory(state: ExecutionState, maxTokens: number): Promise<MemoryEntry[]> {
        const modeQuery = this.buildModeQuery(state.mode);
        const params = [
            state.sessionId,
            state.mode,
            Date.now() - (24 * 60 * 60 * 1000), // Last 24 hours
            10 // Base limit
        ];

        try {
            const results = await this.dbAll(modeQuery, params);
            const memoryEntries = results.map(this.mapRowToMemoryEntry);
            return this.tokenLimitedResults(memoryEntries, maxTokens);
        } catch (error) {
            console.error('Error retrieving relevant memory:', error);
            return [];
        }
    }

    private buildModeQuery(mode: string): string {
        const baseQuery = `
            SELECT * FROM memory_entries 
            WHERE session_id = ? AND context_mode = ? AND timestamp > ?
        `;

        switch (mode) {
            case 'simple':
                return baseQuery + ` AND type IN ('error', 'solution') ORDER BY timestamp DESC LIMIT ?`;
            case 'planner':
                return baseQuery + ` AND type IN ('success', 'plan') ORDER BY relevance_score DESC, timestamp DESC LIMIT ?`;
            case 'supervised':
                return baseQuery + ` ORDER BY timestamp DESC LIMIT ?`;
            default:
                return baseQuery + ` LIMIT ?`;
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
        // Rough estimation: ~4 characters per token
        return Math.ceil(content.length / 4);
    }

    // Store new memory entry
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
            JSON.stringify(entry.contextTools || []),
            JSON.stringify(entry.contextFiles || []),
            entry.relevanceScore,
            JSON.stringify(entry.relatedTo || [])
        ];

        try {
            await this.dbRun(sql, params);
            return id;
        } catch (error) {
            console.error('Error storing memory entry:', error);
            throw error;
        }
    }

    /**
     * Restore memory from a snapshot.
     * Placeholder implementation for now. A full implementation would involve
     * clearing recent memory and inserting the snapshot entries.
     */
    public async restoreMemory(memorySnapshot: any[]): Promise<void> {
        console.log(`[MemoryManager] Restoring memory from snapshot with ${memorySnapshot.length} entries.`);
        // In a real implementation, you might clear memory for the current session
        // and then bulk-insert the entries from the snapshot.
        // For now, this is a no-op to satisfy the CheckpointManager dependency.
        return Promise.resolve();
    }

    // Enhanced search with mode context
    public async searchMemory(
        sessionId: string,
        query: string,
        mode?: 'simple' | 'planner' | 'supervised',
        limit = 10
    ): Promise<MemoryEntry[]> {
        let sql = `
            SELECT * FROM memory_entries
            WHERE session_id = ? AND content LIKE ?
        `;
        const params: any[] = [sessionId, `%${query}%`];

        if (mode) {
            sql += ` AND context_mode = ?`;
            params.push(mode);
        }

        sql += ` ORDER BY relevance_score DESC, timestamp DESC LIMIT ?`;
        params.push(limit);

        try {
            const results = await this.dbAll(sql, params);
            return results.map(this.mapRowToMemoryEntry);
        } catch (error) {
            console.error('Error searching memory:', error);
            return [];
        }
    }

    // Get memory by type and timeframe
    public async getMemoryByType(
        sessionId: string,
        type: MemoryEntry['type'],
        hoursBack = 24,
        limit = 10
    ): Promise<MemoryEntry[]> {
        const sql = `
            SELECT * FROM memory_entries
            WHERE session_id = ? AND type = ? AND timestamp > ?
            ORDER BY timestamp DESC LIMIT ?
        `;
        const params = [
            sessionId,
            type,
            Date.now() - (hoursBack * 60 * 60 * 1000),
            limit
        ];

        try {
            const results = await this.dbAll(sql, params);
            return results.map(this.mapRowToMemoryEntry);
        } catch (error) {
            console.error('Error getting memory by type:', error);
            return [];
        }
    }

    // Update relevance score
    public async updateRelevanceScore(entryId: string, score: number): Promise<void> {
        const sql = 'UPDATE memory_entries SET relevance_score = ? WHERE id = ?';
        try {
            await this.dbRun(sql, [score, entryId]);
        } catch (error) {
            console.error('Error updating relevance score:', error);
        }
    }

    // Clean old entries
    public async cleanupOldEntries(daysToKeep = 30): Promise<number> {
        const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
        const sql = 'DELETE FROM memory_entries WHERE timestamp < ?';

        try {
            await this.dbRun(sql, [cutoffTime]);
            // Get count of deleted rows (would need additional query in real implementation)
            return 0; // Placeholder
        } catch (error) {
            console.error('Error cleaning up old entries:', error);
            return 0;
        }
    }

    // Get session statistics
    public async getSessionStats(sessionId: string): Promise<{
        totalEntries: number;
        entriesByType: Record<string, number>;
        entriesByMode: Record<string, number>;
        averageRelevanceScore: number;
    }> {
        try {
            const totalQuery = 'SELECT COUNT(*) as count FROM memory_entries WHERE session_id = ?';
            const totalResult = await this.dbGet(totalQuery, [sessionId]);

            const typeQuery = `
                SELECT type, COUNT(*) as count 
                FROM memory_entries 
                WHERE session_id = ? 
                GROUP BY type
            `;
            const typeResults = await this.dbAll(typeQuery, [sessionId]);

            const modeQuery = `
                SELECT context_mode, COUNT(*) as count 
                FROM memory_entries 
                WHERE session_id = ? 
                GROUP BY context_mode
            `;
            const modeResults = await this.dbAll(modeQuery, [sessionId]);

            const avgQuery = `
                SELECT AVG(relevance_score) as avg_score 
                FROM memory_entries 
                WHERE session_id = ?
            `;
            const avgResult = await this.dbGet(avgQuery, [sessionId]);

            return {
                totalEntries: totalResult?.count || 0,
                entriesByType: typeResults.reduce((acc, row) => {
                    acc[row.type] = row.count;
                    return acc;
                }, {}),
                entriesByMode: modeResults.reduce((acc, row) => {
                    acc[row.context_mode] = row.count;
                    return acc;
                }, {}),
                averageRelevanceScore: avgResult?.avg_score || 0
            };
        } catch (error) {
            console.error('Error getting session stats:', error);
            return {
                totalEntries: 0,
                entriesByType: {},
                entriesByMode: {},
                averageRelevanceScore: 0
            };
        }
    }

    // Runtime memory methods (unchanged for backward compatibility)
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

    // Legacy methods for backward compatibility
    public async storePersistent(key: string, data: any, metadata?: Record<string, any>): Promise<void> {
        // Convert to new memory entry format
        const entry: Omit<MemoryEntry, 'id' | 'createdAt'> = {
            sessionId: 'legacy',
            timestamp: Date.now(),
            type: 'user_feedback',
            content: JSON.stringify(data),
            contextMode: 'simple',
            contextTools: JSON.stringify([]),
            contextFiles: JSON.stringify([]),
            relevanceScore: 1.0,
            relatedTo: []
        };

        await this.storeMemoryEntry(entry);
    }

    public async retrievePersistent<T>(key: string): Promise<T | null> {
        // Legacy method - search by content containing the key
        const results = await this.searchMemory('legacy', key, undefined, 1);
        if (results.length > 0) {
            try {
                return JSON.parse(results[0].content);
            } catch {
                return results[0].content as any;
            }
        }
        return null;
    }

    public async getRelevantMemories(context: any, limit = 5): Promise<MemoryEntry[]> {
        const query = [
            context.objective,
            context.userMessage,
            ...(context.extractedEntities?.filesMentioned || []),
            ...(context.extractedEntities?.functionsMentioned || [])
        ].filter(Boolean).join(' ');

        return this.searchMemory(context.sessionId || 'default', query, undefined, limit);
    }

    // Helper methods
    private mapRowToMemoryEntry(row: any): MemoryEntry {
        return {
            id: row.id,
            sessionId: row.session_id,
            timestamp: row.timestamp,
            type: row.type,
            content: row.content,
            contextMode: row.context_mode,
            contextTools: row.context_tools,
            contextFiles: row.context_files,
            relevanceScore: row.relevance_score,
            relatedTo: JSON.parse(row.related_to || '[]'),
            createdAt: row.created_at
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