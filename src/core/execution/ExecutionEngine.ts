// src/core/execution/ExecutionEngine.ts
import { ExecutionState } from './ExecutionState';
import { Checkpoint } from '../checkpoint/types';
import { Disposable } from '../interfaces/Disposable';

export type ExecutionMode = 'simple' | 'planner' | 'supervised';

export interface ExecutionResult {
    success: boolean;
    data?: any;
    error?: string;
    executionTime: number;
    checkpointId?: string;
}

export interface ExecutionEngine extends Disposable {
    readonly currentMode: ExecutionMode;
    readonly state: ExecutionState;

    /**
     * Execute a task using the current mode
     */
    executeTask(query: string): Promise<ExecutionResult>;

    /**
     * Create a checkpoint of current execution state
     */
    createCheckpoint(): Promise<Checkpoint>;

    /**
     * Rollback to a previous checkpoint
     */
    rollback(checkpointId: string): Promise<void>;

    /**
     * Change execution mode (user-triggered only)
     */
    setMode(mode: ExecutionMode): void;

    /**
     * Get current execution progress
     */
    getProgress(): number;

    /**
     * Pause current execution
     */
    pause(): Promise<void>;

    /**
     * Resume paused execution
     */
    resume(): Promise<void>;

    /**
     * Stop current execution
     */
    stop(): Promise<void>;
}