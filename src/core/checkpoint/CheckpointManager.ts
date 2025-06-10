// src/core/checkpoint/CheckpointManager.ts
import { Checkpoint, CheckpointFilter, CheckpointStats, CheckpointMetadata } from './types';
import { ExecutionState, ExecutionStateManager } from '../execution/ExecutionState';
import { MemoryManager } from '../../features/memory/MemoryManager';
import { generateUniqueId } from '@shared/utils/generateIds';

class LRUCache<K, V> {
    private cache = new Map<K, V>();
    constructor(private maxSize: number) { }

    get(key: K): V | undefined {
        const value = this.cache.get(key);
        if (value !== undefined) {
            this.cache.delete(key);
            this.cache.set(key, value);
        }
        return value;
    }

    set(key: K, value: V): void {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        } else if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
            }
        }
        this.cache.set(key, value);
    }

    delete(key: K): boolean {
        return this.cache.delete(key);
    }

    clear(): void {
        this.cache.clear();
    }
}

export class CheckpointManager {
    private checkpoints: Map<string, Checkpoint> = new Map();
    private cache: LRUCache<string, Checkpoint> = new LRUCache(50);
    private maxCheckpoints: number = 100;
    private isDisposed = false;

    constructor(
        private stateManager: ExecutionStateManager,
        private memoryManager: MemoryManager
    ) { }

    /**
     * Create a new checkpoint with enhanced metadata and validation
     */
    async createCheckpoint(reason: string, isAutomatic: boolean = true): Promise<Checkpoint> {
        if (this.isDisposed) {
            throw new Error('CheckpointManager has been disposed');
        }

        const currentState = this.stateManager.getState();

        // Validate state before creating checkpoint
        if (!this.canCreateCheckpoint(currentState)) {
            throw new Error('Cannot create checkpoint in current state');
        }

        const memorySnapshot = await this.memoryManager.getRelevantMemory(currentState, 1000);

        const checkpoint: Checkpoint = {
            id: generateUniqueId(),
            timestamp: new Date(),
            state: this.deepCloneState(currentState),
            results: [], // Will be populated with actual results from execution context
            memorySnapshot: [...memorySnapshot],
            reason,
            canRollback: this.canSafelyRollback(reason, currentState),
            metadata: {
                version: '1.0',
                mode: currentState.mode,
                step: currentState.step,
                filesModified: currentState.workspaceFiles || [],
                toolsUsed: this.extractToolsFromState(currentState),
                dataSize: this.calculateDataSize(currentState, memorySnapshot),
                isAutomatic,
                parentCheckpointId: this.getLastCheckpointId(),
                createdAt: new Date(),
                tags: this.generateCheckpointTags(reason, currentState)
            }
        };

        await this.saveCheckpoint(checkpoint);
        this.cleanupOldCheckpoints();

        // Store checkpoint creation in memory for future reference
        await this.memoryManager.storeMemoryEntry({
            sessionId: currentState.sessionId,
            timestamp: Date.now(),
            type: 'success',
            content: `Checkpoint created: ${reason} (ID: ${checkpoint.id})`,
            contextMode: currentState.mode,
            contextTools: JSON.stringify(checkpoint.metadata.toolsUsed),
            contextFiles: JSON.stringify(checkpoint.metadata.filesModified),
            relevanceScore: 0.8,
            relatedTo: [`checkpoint_${checkpoint.id}`, 'checkpoint_creation']
        });

        return checkpoint;
    }

    /**
     * Enhanced rollback with safety checks and state validation
     */
    async rollback(checkpointId: string): Promise<void> {
        if (this.isDisposed) {
            throw new Error('CheckpointManager has been disposed');
        }

        const checkpoint = await this.getCheckpoint(checkpointId);
        if (!checkpoint) {
            throw new Error(`Checkpoint ${checkpointId} not found`);
        }

        if (!checkpoint.canRollback) {
            throw new Error(`Cannot rollback to checkpoint ${checkpointId}: rollback not allowed`);
        }

        // Validate rollback safety
        const currentState = this.stateManager.getState();
        if (!this.isRollbackSafe(checkpoint, currentState)) {
            throw new Error(`Rollback to ${checkpointId} would be unsafe in current state`);
        }

        try {
            // Create rollback checkpoint before proceeding
            const rollbackCheckpoint = await this.createCheckpoint(
                `Pre-rollback to ${checkpointId}`,
                true
            );

            // Restore state
            this.stateManager.setState(checkpoint.state);

            // Restore memory if method exists
            if (this.memoryManager.restoreMemory) {
                await this.memoryManager.restoreMemory(checkpoint.memorySnapshot);
            }

            // Cleanup checkpoints created after this one
            await this.cleanupAfterCheckpoint(checkpoint.timestamp);

            // Store rollback event in memory
            await this.memoryManager.storeMemoryEntry({
                sessionId: checkpoint.state.sessionId,
                timestamp: Date.now(),
                type: 'success',
                content: `Rolled back to checkpoint: ${checkpoint.reason} (ID: ${checkpointId})`,
                contextMode: checkpoint.state.mode,
                contextTools: JSON.stringify(checkpoint.metadata.toolsUsed),
                contextFiles: JSON.stringify(checkpoint.metadata.filesModified),
                relevanceScore: 0.9,
                relatedTo: [`checkpoint_${checkpointId}`, 'rollback_operation']
            });

        } catch (error) {
            // If rollback fails, we have a backup checkpoint
            throw new Error(`Rollback failed: ${(error as Error).message}`);
        }
    }

    /**
     * Get checkpoint by ID with caching
     */
    async getCheckpoint(checkpointId: string): Promise<Checkpoint | null> {
        // Check cache first
        const cached = this.cache.get(checkpointId);
        if (cached) return cached;

        // Check in-memory storage
        const checkpoint = this.checkpoints.get(checkpointId);
        if (checkpoint) {
            this.cache.set(checkpointId, checkpoint);
            return checkpoint;
        }

        return null;
    }

    /**
     * List checkpoints with advanced filtering and sorting
     */
    async listCheckpoints(filter?: CheckpointFilter): Promise<Checkpoint[]> {
        let checkpoints = Array.from(this.checkpoints.values());

        if (filter) {
            checkpoints = this.applyFilter(checkpoints, filter);
        }

        return checkpoints.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }

    /**
     * Get comprehensive checkpoint statistics
     */
    async getStats(): Promise<CheckpointStats> {
        const checkpoints = Array.from(this.checkpoints.values());

        if (checkpoints.length === 0) {
            return {
                total: 0,
                automatic: 0,
                manual: 0,
                rollbackable: 0,
                totalSize: 0,
                oldestTimestamp: new Date(),
                newestTimestamp: new Date()
            };
        }

        const timestamps = checkpoints.map(c => c.timestamp.getTime());

        return {
            total: checkpoints.length,
            automatic: checkpoints.filter(c => c.metadata.isAutomatic).length,
            manual: checkpoints.filter(c => !c.metadata.isAutomatic).length,
            rollbackable: checkpoints.filter(c => c.canRollback).length,
            totalSize: checkpoints.reduce((sum, c) => sum + c.metadata.dataSize, 0),
            oldestTimestamp: new Date(Math.min(...timestamps)),
            newestTimestamp: new Date(Math.max(...timestamps)),
            // Additional stats
            averageSize: checkpoints.reduce((sum, c) => sum + c.metadata.dataSize, 0) / checkpoints.length,
            byMode: this.getStatsByMode(checkpoints),
            rollbackFrequency: this.calculateRollbackFrequency(checkpoints)
        };
    }

    /**
     * Find checkpoints related to current execution
     */
    async findRelatedCheckpoints(currentState: ExecutionState, limit: number = 10): Promise<Checkpoint[]> {
        const checkpoints = Array.from(this.checkpoints.values());

        return checkpoints
            .filter(c => c.state.sessionId === currentState.sessionId)
            .filter(c => c.state.mode === currentState.mode)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, limit);
    }

    /**
     * Get checkpoint chain (parent-child relationships)
     */
    async getCheckpointChain(checkpointId: string): Promise<Checkpoint[]> {
        const checkpoint = await this.getCheckpoint(checkpointId);
        if (!checkpoint) return [];

        const chain = [checkpoint];
        let current = checkpoint;

        // Build chain backwards to root
        while (current.metadata.parentCheckpointId) {
            const parent = await this.getCheckpoint(current.metadata.parentCheckpointId);
            if (!parent) break;
            chain.unshift(parent);
            current = parent;
        }

        return chain;
    }

    /**
     * Delete checkpoint with dependency checking
     */
    async deleteCheckpoint(checkpointId: string): Promise<boolean> {
        // Check if other checkpoints depend on this one
        const dependents = Array.from(this.checkpoints.values())
            .filter(c => c.metadata.parentCheckpointId === checkpointId);

        if (dependents.length > 0) {
            throw new Error(`Cannot delete checkpoint ${checkpointId}: ${dependents.length} dependent checkpoints exist`);
        }

        const deleted = this.checkpoints.delete(checkpointId);
        this.cache.delete(checkpointId);
        return deleted;
    }

    /**
     * Clear all checkpoints
     */
    async clearAll(): Promise<void> {
        this.checkpoints.clear();
        this.cache.clear();
    }

    /**
     * Cleanup resources
     */
    public dispose(): void {
        if (this.isDisposed) return;

        this.checkpoints.clear();
        this.cache.clear();
        this.isDisposed = true;
    }

    // Private helper methods

    private async saveCheckpoint(checkpoint: Checkpoint): Promise<void> {
        this.checkpoints.set(checkpoint.id, checkpoint);
        this.cache.set(checkpoint.id, checkpoint);
    }

    private canCreateCheckpoint(state: ExecutionState): boolean {
        // Don't create checkpoints in error state
        if (state.executionStatus === 'error') {
            return false;
        }

        // Check if we're not creating too many checkpoints too quickly
        const recentCheckpoints = Array.from(this.checkpoints.values())
            .filter(c => c.timestamp.getTime() > Date.now() - 5000); // 5 seconds

        return recentCheckpoints.length < 5;
    }

    private canSafelyRollback(reason: string, state: ExecutionState): boolean {
        // Basic safety checks
        if (state.errorCount > 5) return false;
        if (reason.toLowerCase().includes('critical') || reason.toLowerCase().includes('unsafe')) return false;

        // Mode-specific checks
        switch (state.mode) {
            case 'simple':
                return true; // Simple mode is generally safe to rollback
            case 'planner':
                return state.step < 10; // Only allow rollback in early planning stages
            case 'supervised':
                return state.executionStatus !== 'executing'; // Only when not actively executing
            default:
                return false;
        }
    }

    private isRollbackSafe(checkpoint: Checkpoint, currentState: ExecutionState): boolean {
        // Can't rollback if current state is more recent and has critical changes
        if (currentState.step > checkpoint.state.step + 10) {
            return false; // Too many steps ahead
        }

        // Can't rollback across different execution modes
        if (currentState.mode !== checkpoint.state.mode) {
            return false;
        }

        return true;
    }

    private deepCloneState(state: ExecutionState): ExecutionState {
        return JSON.parse(JSON.stringify(state));
    }

    private extractToolsFromState(state: ExecutionState): string[] {
        // Extract tools from state - this would be populated by actual execution
        return state.lastResult?.toolsUsed || [];
    }

    private calculateDataSize(state: ExecutionState, memorySnapshot: any[]): number {
        const stateSize = JSON.stringify(state).length;
        const memorySize = JSON.stringify(memorySnapshot).length;
        return stateSize + memorySize;
    }

    private generateCheckpointTags(reason: string, state: ExecutionState): string[] {
        const tags = [`mode_${state.mode}`, `step_${state.step}`];

        if (reason.includes('error')) tags.push('error_recovery');
        if (reason.includes('plan')) tags.push('planning');
        if (reason.includes('manual')) tags.push('user_initiated');

        return tags;
    }

    private getLastCheckpointId(): string | undefined {
        const checkpoints = Array.from(this.checkpoints.values())
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        return checkpoints[0]?.id;
    }

    private applyFilter(checkpoints: Checkpoint[], filter: CheckpointFilter): Checkpoint[] {
        return checkpoints.filter(checkpoint => {
            if (filter.sessionId && checkpoint.state.sessionId !== filter.sessionId) {
                return false;
            }

            if (filter.mode && checkpoint.metadata.mode !== filter.mode) {
                return false;
            }

            if (filter.canRollback !== undefined && checkpoint.canRollback !== filter.canRollback) {
                return false;
            }

            if (filter.dateRange) {
                const time = checkpoint.timestamp.getTime();
                if (time < filter.dateRange.from.getTime() || time > filter.dateRange.to.getTime()) {
                    return false;
                }
            }

            if (filter.tags && filter.tags.length > 0) {
                const hasAllTags = filter.tags.every(tag =>
                    checkpoint.metadata.tags?.includes(tag)
                );
                if (!hasAllTags) return false;
            }

            return true;
        }).slice(0, filter.limit || 50);
    }

    private getStatsByMode(checkpoints: Checkpoint[]): Record<string, number> {
        const stats: Record<string, number> = {};
        checkpoints.forEach(c => {
            stats[c.metadata.mode] = (stats[c.metadata.mode] || 0) + 1;
        });
        return stats;
    }

    private calculateRollbackFrequency(checkpoints: Checkpoint[]): number {
        const rollbackOperations = checkpoints.filter(c =>
            c.reason.toLowerCase().includes('rollback') ||
            c.reason.toLowerCase().includes('pre-rollback')
        );

        return checkpoints.length > 0 ? rollbackOperations.length / checkpoints.length : 0;
    }

    private cleanupOldCheckpoints(): void {
        if (this.checkpoints.size <= this.maxCheckpoints) return;

        const checkpoints = Array.from(this.checkpoints.values())
            .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        const toDelete = checkpoints.slice(0, checkpoints.length - this.maxCheckpoints);
        toDelete.forEach(checkpoint => {
            this.checkpoints.delete(checkpoint.id);
            this.cache.delete(checkpoint.id);
        });
    }

    private async cleanupAfterCheckpoint(timestamp: Date): Promise<void> {
        const toDelete = Array.from(this.checkpoints.values())
            .filter(c => c.timestamp > timestamp);

        toDelete.forEach(checkpoint => {
            this.checkpoints.delete(checkpoint.id);
            this.cache.delete(checkpoint.id);
        });
    }
}