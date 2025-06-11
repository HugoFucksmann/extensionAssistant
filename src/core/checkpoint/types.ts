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
    // --- CORRECCIÓN: Añadidas las propiedades que faltaban para coincidir con la implementación ---
    parentCheckpointId?: string;
    createdAt: Date;
    tags?: string[];
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
    tags?: string[];
}

export interface CheckpointStats {
    total: number;
    automatic: number;
    manual: number;
    rollbackable: number;
    totalSize: number;
    oldestTimestamp: Date;
    newestTimestamp: Date;
    // --- NOTA: Estas propiedades opcionales pueden ser implementadas en el futuro ---
    averageSize?: number;
    byMode?: Record<string, number>;
    rollbackFrequency?: number;
}