// src/core/checkpoint/types.ts
import { ExecutionState } from '../execution/ExecutionState';

export interface Checkpoint {
    id: string;
    timestamp: Date;
    state: ExecutionState;
    results: any[];
    memorySnapshot: any[];
    reason: string;
    canRollback: boolean;
    metadata: CheckpointMetadata;
}

export interface CheckpointMetadata {
    version: string;
    mode: string;
    step: number;
    filesModified: string[];
    toolsUsed: string[];
    dataSize: number;
    isAutomatic: boolean;
    parentCheckpointId?: string; // Added to match implementation
    createdAt: Date; // Added to match implementation
    tags?: string[]; // Added to match implementation
}

export interface CheckpointFilter {
    sessionId?: string;
    mode?: string;
    dateRange?: {
        from: Date;
        to: Date;
    };
    canRollback?: boolean;
    limit?: number;
    tags?: string[]; // Added for advanced filtering
}

export interface CheckpointStats {
    total: number;
    automatic: number;
    manual: number;
    rollbackable: number;
    totalSize: number;
    oldestTimestamp: Date;
    newestTimestamp: Date;
    averageSize?: number; // Added for more detailed stats
    byMode?: Record<string, number>; // Added for more detailed stats
    rollbackFrequency?: number; // Added for more detailed stats
}