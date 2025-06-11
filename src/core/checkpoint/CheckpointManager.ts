// src/core/checkpoint/CheckpointManager.ts

import { Checkpoint, CheckpointFilter, CheckpointStats } from './types';
import { ExecutionState, ExecutionStateManager } from '../execution/ExecutionState';
import { MemoryManager } from '../../features/memory/MemoryManager';
import { generateUniqueId } from '../../shared/utils/generateIds';

// --- INICIO DE LA MEJORA: Utilidad de clonado profundo ---
/**
 * Realiza un clonado profundo de un objeto, manejando correctamente tipos como Date.
 * @param obj El objeto a clonar.
 * @returns Un clon profundo del objeto.
 */
function deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (obj instanceof Date) {
        return new Date(obj.getTime()) as any;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => deepClone(item)) as any;
    }

    const cloned = {} as T;
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            cloned[key] = deepClone(obj[key]);
        }
    }
    return cloned;
}
// --- FIN DE LA MEJORA ---

export class CheckpointManager {
    private checkpoints: Map<string, Checkpoint> = new Map();
    private maxCheckpoints: number = 50;
    private isDisposed = false;

    constructor(
        private stateManager: ExecutionStateManager,
        private memoryManager: MemoryManager
    ) { }

    async createCheckpoint(reason: string, isAutomatic: boolean = true): Promise<Checkpoint> {
        if (this.isDisposed) {
            throw new Error('CheckpointManager has been disposed');
        }

        const currentState = this.stateManager.getState();
        // NOTA: getRelevantMemory es una optimización. Para una restauración perfecta,
        // un snapshot completo podría ser necesario en ciertos casos.
        const memorySnapshot = await this.memoryManager.getRelevantMemory(currentState, 500);

        const checkpoint: Checkpoint = {
            id: generateUniqueId(),
            timestamp: new Date(),
            // --- CORRECCIÓN: Usar la nueva función de clonado profundo ---
            state: deepClone(currentState),
            results: [],
            memorySnapshot: deepClone(memorySnapshot), // También clonamos la memoria por seguridad
            reason,
            canRollback: this.canRollback(currentState),
            metadata: {
                version: '1.0',
                mode: currentState.mode,
                step: currentState.step,
                filesModified: currentState.workspaceFiles || [],
                toolsUsed: currentState.lastResult?.toolsUsed || [],
                dataSize: JSON.stringify(currentState).length,
                isAutomatic,
                parentCheckpointId: this.getLastCheckpointId(),
                createdAt: new Date(),
                tags: [`mode_${currentState.mode}`]
            }
        };

        this.checkpoints.set(checkpoint.id, checkpoint);
        this.cleanupOldCheckpoints();

        return checkpoint;
    }

    // --- CORRECCIÓN CRÍTICA: Lógica de rollback completa ---
    async rollback(checkpointId: string): Promise<void> {
        if (this.isDisposed) {
            throw new Error('CheckpointManager has been disposed');
        }

        const checkpoint = this.checkpoints.get(checkpointId);
        if (!checkpoint) {
            throw new Error(`Checkpoint ${checkpointId} not found`);
        }

        if (!checkpoint.canRollback) {
            throw new Error(`Cannot rollback to checkpoint ${checkpointId}`);
        }

        try {
            // 1. Restaurar la memoria PRIMERO. Si esto falla, no alteramos el estado de ejecución.
            // La propia función `restoreMemory` maneja la transacción de la base de datos.
            await this.memoryManager.restoreMemory(checkpoint.memorySnapshot);

            // 2. Si la memoria se restauró con éxito, restaurar el estado de ejecución.
            this.stateManager.setState(checkpoint.state);

            // 3. Limpiar los checkpoints que son más recientes que el que acabamos de restaurar.
            const checkpointsToDelete = Array.from(this.checkpoints.values())
                .filter(c => c.timestamp > checkpoint.timestamp);

            checkpointsToDelete.forEach(c => this.checkpoints.delete(c.id));

            console.log(`[CheckpointManager] Successfully rolled back to checkpoint ${checkpointId}`);

        } catch (error) {
            console.error(`[CheckpointManager] Rollback to ${checkpointId} failed:`, error);
            // Si el rollback falla, lanzamos el error para que el orquestador pueda manejarlo.
            // El estado del sistema no debería quedar inconsistente si la restauración de memoria falla.
            throw new Error(`Failed to complete rollback process: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    getCheckpoint(checkpointId: string): Checkpoint | null {
        return this.checkpoints.get(checkpointId) || null;
    }

    listCheckpoints(filter?: CheckpointFilter): Checkpoint[] {
        // ... (sin cambios)
        let checkpoints = Array.from(this.checkpoints.values());

        if (filter) {
            checkpoints = checkpoints.filter(checkpoint => {
                if (filter.sessionId && checkpoint.state.sessionId !== filter.sessionId) return false;
                if (filter.mode && checkpoint.metadata.mode !== filter.mode) return false;
                if (filter.canRollback !== undefined && checkpoint.canRollback !== filter.canRollback) return false;
                if (filter.dateRange) {
                    const time = checkpoint.timestamp.getTime();
                    if (time < filter.dateRange.from.getTime() || time > filter.dateRange.to.getTime()) return false;
                }
                return true;
            }).slice(0, filter.limit || 50);
        }

        return checkpoints.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }

    getStats(): CheckpointStats {
        // ... (sin cambios)
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
            newestTimestamp: new Date(Math.max(...timestamps))
        };
    }

    deleteCheckpoint(checkpointId: string): boolean {
        return this.checkpoints.delete(checkpointId);
    }

    clearAll(): void {
        this.checkpoints.clear();
    }

    dispose(): void {
        if (this.isDisposed) return;
        this.checkpoints.clear();
        this.isDisposed = true;
    }

    private canRollback(state: ExecutionState): boolean {
        return state.executionStatus !== 'error' && state.errorCount < 3;
    }

    private getLastCheckpointId(): string | undefined {
        const checkpoints = Array.from(this.checkpoints.values())
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        return checkpoints[0]?.id;
    }

    private cleanupOldCheckpoints(): void {
        if (this.checkpoints.size <= this.maxCheckpoints) return;

        const checkpoints = Array.from(this.checkpoints.values())
            .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        const toDelete = checkpoints.slice(0, checkpoints.length - this.maxCheckpoints);
        toDelete.forEach(checkpoint => this.checkpoints.delete(checkpoint.id));
    }
}