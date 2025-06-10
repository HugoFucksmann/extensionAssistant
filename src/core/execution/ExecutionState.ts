// src/core/execution/ExecutionState.ts
import { ExecutionMode } from './ExecutionEngine';
import { Checkpoint } from '../checkpoint/types';

export type ExecutionStatus = 'planning' | 'executing' | 'paused' | 'completed' | 'error';

export interface ExecutionMetrics {
    totalSteps: number;
    completedSteps: number;
    errorCount: number;
    successRate: number;
    averageStepTime: number;
    memoryUsage: number;
    tokensUsed: number;
}

export interface ExecutionState {
    // Basic state (used by all modes)
    readonly sessionId: string;
    readonly mode: ExecutionMode;
    step: number;
    lastResult: any;
    errorCount: number;
    createdAt: Date;
    updatedAt: Date;

    // Extended state (for complex modes)
    executionStatus?: ExecutionStatus;
    planText?: string;
    checkpoints?: Checkpoint[];
    progress?: number;
    metrics?: ExecutionMetrics;

    // Context information
    currentQuery?: string;
    workspaceFiles?: string[];
    activeFile?: string;
    userContext?: Record<string, any>;

    // Error handling
    lastError?: Error;
    recoveryAttempts?: number;
    maxRecoveryAttempts?: number;
}

export interface ExecutionStateSnapshot {
    state: ExecutionState;
    timestamp: Date;
    reason: string;
    canRestore: boolean;
}

export interface ExecutionStateManager {
    getState(): ExecutionState;
    setState(state: Partial<ExecutionState>): void;
    resetState(): void;
    createSnapshot(reason: string): ExecutionStateSnapshot;
    restoreSnapshot(snapshot: ExecutionStateSnapshot): Promise<void>;
    validateState(): boolean;
}