// src/features/memory/MemoryManager.ts

import * as vscode from 'vscode';
import * as path from 'path';
import { WindsurfState } from '@core/types';
import { HistoryEntry } from '@features/chat/types';

export interface MemoryItem {
    id: string;
    content: any;
    relevance: number;
    timestamp: number;
    metadata?: Record<string, any>;
}

export class MemoryManager {
    private runtimeMemory = new Map<string, any>();
    private storagePath: vscode.Uri;

    constructor(private context: vscode.ExtensionContext) {
        this.storagePath = vscode.Uri.joinPath(
            this.context.globalStorageUri,
            'memory-storage'
        );
        this.ensureStorageDirectory();
    }

    private async ensureStorageDirectory(): Promise<void> {
        try {
            await vscode.workspace.fs.createDirectory(this.storagePath);
        } catch (error) {
            console.error('Failed to create storage directory:', error);
        }
    }

    // Runtime Memory (volátil)
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

    // Long-term Storage (persistente)
    public async storePersistent(key: string, data: any, metadata?: Record<string, any>): Promise<void> {
        const filePath = this.getFilePath(key);
        const content = {
            data,
            metadata: { ...metadata, updatedAt: new Date().toISOString() }
        };

        try {
            await vscode.workspace.fs.writeFile(
                filePath,
                new TextEncoder().encode(JSON.stringify(content, null, 2))
            );
        } catch (error) {
            console.error(`Error storing ${key}:`, error);
            throw error;
        }
    }

    public async retrievePersistent<T>(key: string): Promise<T | null> {
        const filePath = this.getFilePath(key);

        try {
            const fileContent = await vscode.workspace.fs.readFile(filePath);
            const { data } = JSON.parse(fileContent.toString());
            return data;
        } catch (error) {
            if (error instanceof vscode.FileSystemError && error.code === 'ENOENT') {
                return null;
            }
            console.error(`Error retrieving ${key}:`, error);
            return null;
        }
    }

    public async deletePersistent(key: string): Promise<void> {
        const filePath = this.getFilePath(key);
        try {
            await vscode.workspace.fs.delete(filePath, { useTrash: false });
        } catch (error) {
            if (!(error instanceof vscode.FileSystemError && error.code === 'ENOENT')) {
                console.error(`Error deleting ${key}:`, error);
            }
        }
    }

    // Search across persistent storage
    public async search(query: string, limit = 10): Promise<MemoryItem[]> {
        try {
            const files = await vscode.workspace.fs.readDirectory(this.storagePath);
            const results: MemoryItem[] = [];
            const queryLower = query.toLowerCase();

            for (const [filename] of files) {
                if (!filename.endsWith('.json') || results.length >= limit) break;

                const key = path.basename(filename, '.json');
                try {
                    const data = await this.retrievePersistent(key);
                    if (data && JSON.stringify(data).toLowerCase().includes(queryLower)) {
                        results.push({
                            id: key,
                            content: data,
                            relevance: 1,
                            timestamp: Date.now()
                        });
                    }
                } catch {
                    // Ignore file read errors
                }
            }

            return results;
        } catch (error) {
            console.error('Search error:', error);
            return [];
        }
    }

    // Conversation-specific methods
    public async storeConversation(chatId: string, state: WindsurfState): Promise<void> {
        // Store in runtime memory
        this.setRuntime(chatId, 'lastState', state);
        this.setRuntime(chatId, 'lastObjective', state.objective);
        this.setRuntime(chatId, 'conversationHistory', state.history);

        // Extract and store insights persistently
        const insights = this.extractInsights(state);
        if (insights.length > 0) {
            await this.storePersistent(`insights_${chatId}_${Date.now()}`, insights, {
                chatId,
                objective: state.objective,
                type: 'insights'
            });
        }
    }

    private extractInsights(state: WindsurfState): any[] {
        return state.history
            .filter((entry: HistoryEntry) => entry.phase === 'reflection')
            .flatMap((entry: HistoryEntry) => entry.metadata?.insights || []);
    }

    public async getRelevantMemories(context: any, limit = 5): Promise<MemoryItem[]> {
        const query = [
            context.objective,
            context.userMessage,
            ...(context.extractedEntities?.filesMentioned || []),
            ...(context.extractedEntities?.functionsMentioned || [])
        ].filter(Boolean).join(' ');

        return this.search(query, limit);
    }

    private getFilePath(key: string): vscode.Uri {
        const safeKey = key.replace(/[^a-z0-9-_]/gi, '_').toLowerCase();
        return vscode.Uri.joinPath(this.storagePath, `${safeKey}.json`);
    }

    public async dispose(): Promise<void> {
        this.runtimeMemory.clear();
    }
}