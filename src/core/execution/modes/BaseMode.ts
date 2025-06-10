// src/core/execution/modes/BaseMode.ts
import { ExecutionEngine, ExecutionResult, ExecutionMode } from '../ExecutionEngine';
import { ExecutionState, ExecutionStateManager, ExecutionMetrics } from '../ExecutionState'; // Importar ExecutionMetrics
import { CheckpointManager } from '../../checkpoint/CheckpointManager';
import { MemoryManager, MemoryEntry } from '../../../features/memory/MemoryManager';
import { InternalEventDispatcher } from '../../events/InternalEventDispatcher';

export interface ModeConfiguration {
    maxSteps: number;
    maxErrors: number;
    memoryTokenLimit: number;
    enableCheckpoints: boolean;
    checkpointInterval: number;
    timeoutMs: number;
}


export interface ModeContext {
    stateManager: ExecutionStateManager;
    checkpointManager: CheckpointManager;
    memoryManager: MemoryManager;
    toolExecutor: any; // Will be properly typed later
    dispatcher: InternalEventDispatcher;
}

export abstract class BaseMode {
    protected readonly mode: ExecutionMode;
    protected readonly config: ModeConfiguration;

    constructor(
        mode: ExecutionMode,
        protected readonly context: ModeContext,
        config?: Partial<ModeConfiguration>
    ) {
        this.mode = mode;
        this.config = this.getModeSpecificConfig(mode, config);
    }

    private getModeSpecificConfig(mode: ExecutionMode, config?: Partial<ModeConfiguration>): ModeConfiguration {
        const baseConfig = {
            maxSteps: 50,
            maxErrors: 3,
            enableCheckpoints: true,
            checkpointInterval: 5,
            timeoutMs: 300000, // 5 minutes
            ...config
        };

        switch (mode) {
            case 'simple':
                return { ...baseConfig, memoryTokenLimit: 100 };
            case 'planner':
                return { ...baseConfig, memoryTokenLimit: 200 };
            case 'supervised':
                return { ...baseConfig, memoryTokenLimit: 300 };
            default:
                return { ...baseConfig, memoryTokenLimit: 100 };
        }
    }

    abstract execute(query: string): Promise<ExecutionResult>;

    protected async getRelevantMemory(): Promise<MemoryEntry[]> {
        const state = this.context.stateManager.getState();
        return await this.context.memoryManager.getRelevantMemory(
            state,
            this.getMemoryTokenLimit()
        );
    }

    protected async storeMemoryEntry(
        type: MemoryEntry['type'],
        content: string,
        relevanceScore: number = 1.0,
        relatedTo: string[] = []
    ): Promise<void> {
        const state = this.context.stateManager.getState();

        await this.context.memoryManager.storeMemoryEntry({
            sessionId: state.sessionId,
            timestamp: Date.now(),
            type,
            content,
            contextMode: this.mode,
            contextTools: JSON.stringify(this.getCurrentTools()),
            contextFiles: JSON.stringify(this.getCurrentFiles()),
            relevanceScore,
            relatedTo
        });
    }

    protected shouldContinue(result: any): boolean {
        const state = this.context.stateManager.getState();

        if (state.step >= this.config.maxSteps) {
            return false;
        }

        if (state.errorCount >= this.config.maxErrors) {
            return false;
        }

        return !this.isComplete();
    }

    protected isComplete(): boolean {
        const state = this.context.stateManager.getState();
        return state.executionStatus === 'completed';
    }

    protected generateFinalResponse(): ExecutionResult {
        const state = this.context.stateManager.getState();
        const endTime = Date.now();
        const startTime = state.createdAt.getTime();

        return {
            success: state.executionStatus === 'completed',
            data: state.lastResult,
            error: state.lastError?.message,
            executionTime: endTime - startTime
        };
    }

    protected async createCheckpointIfNeeded(reason: string): Promise<void> {
        if (!this.config.enableCheckpoints) return;

        const state = this.context.stateManager.getState();
        if (state.step % this.config.checkpointInterval === 0) {
            await this.context.checkpointManager.createCheckpoint(reason);

            await this.storeMemoryEntry(
                'success',
                `Checkpoint created: ${reason}`,
                0.8,
                [`checkpoint_${state.step}`]
            );
        }
    }

    protected async handleError(error: Error): Promise<void> {
        const state = this.context.stateManager.getState();

        this.context.stateManager.setState({
            errorCount: (state.errorCount || 0) + 1, // Manejar el caso de que errorCount sea undefined
            lastError: error,
            executionStatus: 'error'
        });

        await this.storeMemoryEntry(
            'error',
            `Error at step ${state.step}: ${error.message}`,
            0.9,
            [`step_${state.step}`, 'error_recovery']
        );
    }

    protected async handleSuccess(result: any, description: string): Promise<void> {
        const state = this.context.stateManager.getState();

        await this.storeMemoryEntry(
            'success',
            `Success at step ${state.step}: ${description}`,
            0.8,
            [`step_${state.step}`, 'success_pattern']
        );
    }

    protected async storeToolResult(toolName: string, parameters: any, result: any): Promise<void> {
        const content = JSON.stringify({
            tool: toolName,
            parameters,
            result,
            timestamp: Date.now()
        });

        await this.storeMemoryEntry(
            'tool_result',
            content,
            0.7,
            [toolName, `tool_execution`]
        );
    }

    /**
     * CAMBIO CLAVE: Lógica de actualización de métricas corregida.
     * Se asegura de que el objeto 'metrics' siempre sea válido y completo.
     */
    protected updateProgress(completed: number, total: number): void {
        const progress = total > 0 ? completed / total : 0;
        const currentState = this.context.stateManager.getState();

        // 1. Obtener las métricas existentes o crear una estructura por defecto si no existen.
        const existingMetrics = currentState.metrics || {
            totalSteps: 0,
            completedSteps: 0,
            errorCount: 0,
            successRate: 0,
            averageStepTime: 0,
            memoryUsage: 0,
            tokensUsed: 0,
        };

        // 2. Crear el nuevo objeto de métricas, preservando los valores antiguos y actualizando los nuevos.
        const newMetrics: ExecutionMetrics = {
            ...existingMetrics, // Preserva valores como errorCount, memoryUsage, etc.
            totalSteps: total,
            completedSteps: completed,
            successRate: total > 0 ? (completed / total) : 0, // También actualizamos la tasa de éxito
        };

        // 3. Establecer el estado con el objeto de métricas ahora completo y válido.
        this.context.stateManager.setState({
            progress,
            metrics: newMetrics,
        });
    }

    protected getMemoryTokenLimit(): number {
        return this.config.memoryTokenLimit;
    }

    protected validateState(): boolean {
        return this.context.stateManager.validateState();
    }

    protected getCurrentTools(): string[] {
        return [];
    }

    protected getCurrentFiles(): string[] {
        return [];
    }

    protected async searchMemoryForPattern(pattern: string, limit: number = 5): Promise<MemoryEntry[]> {
        const state = this.context.stateManager.getState();
        return await this.context.memoryManager.searchMemory(
            state.sessionId,
            pattern,
            this.mode,
            limit
        );
    }

    protected async getMemoryByType(
        type: MemoryEntry['type'],
        hoursBack: number = 24,
        limit: number = 10
    ): Promise<MemoryEntry[]> {
        const state = this.context.stateManager.getState();
        return await this.context.memoryManager.getMemoryByType(
            state.sessionId,
            type,
            hoursBack,
            limit
        );
    }
}