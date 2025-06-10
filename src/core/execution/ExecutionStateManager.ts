// src/core/execution/ExecutionStateManager.ts
import { ExecutionMode } from './ExecutionEngine';
import { ExecutionState, ExecutionStateManager, ExecutionStateSnapshot } from './ExecutionState';
import { generateUniqueId } from '@shared/utils/generateIds';

export class DefaultExecutionStateManager implements ExecutionStateManager {
    private currentState: ExecutionState;
    private snapshots: Map<string, ExecutionStateSnapshot> = new Map();
    private maxSnapshots = 10;

    constructor(sessionId: string, mode: ExecutionMode) {
        this.currentState = this.createInitialState(sessionId, mode);
    }

    getState(): ExecutionState {
        return { ...this.currentState };
    }

    setState(partialState: Partial<ExecutionState>): void {
        this.currentState = {
            ...this.currentState,
            ...partialState,
            updatedAt: new Date()
        };
    }

    resetState(): void {
        const { sessionId, mode } = this.currentState;
        this.currentState = this.createInitialState(sessionId, mode);
    }

    createSnapshot(reason: string): ExecutionStateSnapshot {
        const snapshot: ExecutionStateSnapshot = {
            state: { ...this.currentState },
            timestamp: new Date(),
            reason,
            canRestore: this.canSafelyRestore()
        };

        const snapshotId = generateUniqueId();
        this.snapshots.set(snapshotId, snapshot);
        this.cleanupOldSnapshots();

        return snapshot;
    }

    async restoreSnapshot(snapshot: ExecutionStateSnapshot): Promise<void> {
        if (!snapshot.canRestore) {
            throw new Error('Cannot restore this snapshot - restoration not allowed');
        }

        this.currentState = {
            ...snapshot.state,
            updatedAt: new Date()
        };
    }

    validateState(): boolean {
        const state = this.currentState;

        // Basic validation
        if (!state.sessionId || !state.mode) return false;
        if (state.step < 0 || state.errorCount < 0) return false;
        if (state.progress !== undefined && (state.progress < 0 || state.progress > 1)) return false;

        return true;
    }

    private createInitialState(sessionId: string, mode: ExecutionMode): ExecutionState {
        const now = new Date();

        return {
            sessionId,
            mode,
            step: 0,
            lastResult: null,
            errorCount: 0,
            createdAt: now,
            updatedAt: now,
            executionStatus: 'planning',
            progress: 0,
            workspaceFiles: [],
            recoveryAttempts: 0,
            maxRecoveryAttempts: 3
        };
    }

    private canSafelyRestore(): boolean {
        const state = this.currentState;

        // Don't allow restore if too many errors
        if (state.errorCount > 5) return false;

        // Don't allow restore if in critical execution phase
        if (state.executionStatus === 'executing' && state.step > 10) return false;

        return true;
    }

    private cleanupOldSnapshots(): void {
        if (this.snapshots.size <= this.maxSnapshots) return;

        const snapshots = Array.from(this.snapshots.entries())
            .sort(([, a], [, b]) => a.timestamp.getTime() - b.timestamp.getTime());

        const toDelete = snapshots.slice(0, snapshots.length - this.maxSnapshots);
        toDelete.forEach(([id]) => this.snapshots.delete(id));
    }
}