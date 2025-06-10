// src/core/execution/ConcreteExecutionEngine.ts
import { ExecutionEngine, ExecutionResult, ExecutionMode } from './ExecutionEngine';
import { ExecutionState, ExecutionStateManager } from './ExecutionState';
import { DefaultExecutionStateManager } from './ExecutionStateManager';
import { CheckpointManager } from '../checkpoint/CheckpointManager';
import { Checkpoint } from '../checkpoint/types';
import { BaseMode, ModeContext } from './modes/BaseMode';
import { SimpleMode } from './modes/SimpleMode';
import { PlannerMode } from './modes/PlannerMode';
import { SupervisedMode } from './modes/SupervisedMode'; // Import SupervisedMode
import { MemoryManager } from '../../features/memory/MemoryManager';
import { generateUniqueId } from '@shared/utils/generateIds';
import { InternalEventDispatcher } from '../events/InternalEventDispatcher';
import { ComponentFactory } from '../ComponentFactory';

export class ConcreteExecutionEngine implements ExecutionEngine {
    private _currentMode: ExecutionMode = 'simple';
    private _stateManager: ExecutionStateManager;
    private _checkpointManager: CheckpointManager;
    private modes: Map<ExecutionMode, BaseMode> = new Map();
    private isDisposed = false;
    private dispatcher: InternalEventDispatcher;

    constructor(
        private memoryManager: MemoryManager,
        sessionId?: string
    ) {
        const actualSessionId = sessionId || generateUniqueId();
        this.dispatcher = ComponentFactory.getInternalEventDispatcher();
        this._stateManager = new DefaultExecutionStateManager(actualSessionId, this._currentMode);
        this._checkpointManager = new CheckpointManager(this._stateManager, this.memoryManager);

        this.initializeModes();
    }

    get currentMode(): ExecutionMode {
        return this._currentMode;
    }

    get state(): ExecutionState {
        return this._stateManager.getState();
    }

    async executeTask(query: string): Promise<ExecutionResult> {
        if (this.isDisposed) {
            throw new Error('ExecutionEngine has been disposed');
        }

        const mode = this.modes.get(this._currentMode);
        if (!mode) {
            throw new Error(`Mode ${this._currentMode} not implemented`);
        }

        try {
            this._stateManager.setState({
                currentQuery: query,
                executionStatus: 'executing'
            });

            const result = await mode.execute(query);

            this._stateManager.setState({
                executionStatus: result.success ? 'completed' : 'error',
                lastResult: result.data
            });

            return result;
        } catch (error) {
            this._stateManager.setState({
                executionStatus: 'error',
                lastError: error as Error
            });

            throw error;
        }
    }

    async createCheckpoint(): Promise<Checkpoint> {
        return await this._checkpointManager.createCheckpoint('Manual checkpoint', false);
    }

    async rollback(checkpointId: string): Promise<void> {
        await this._checkpointManager.rollback(checkpointId);
    }

    setMode(mode: ExecutionMode): void {
        if (this._currentMode !== mode) {
            this._currentMode = mode;

            // Update state manager mode
            this._stateManager.setState({ mode });

            // Reinitialize modes if needed
            if (!this.modes.has(mode)) {
                this.initializeModes();
            }
        }
    }

    getProgress(): number {
        const state = this._stateManager.getState();
        return state.progress || 0;
    }

    async pause(): Promise<void> {
        this._stateManager.setState({
            executionStatus: 'paused'
        });
    }

    async resume(): Promise<void> {
        this._stateManager.setState({
            executionStatus: 'executing'
        });
    }

    async stop(): Promise<void> {
        this._stateManager.setState({
            executionStatus: 'completed'
        });
    }

    async dispose(): Promise<void> {
        if (this.isDisposed) return;

        this.modes.clear();

        // Cleanup checkpoint manager
        if (this._checkpointManager && typeof this._checkpointManager.clearAll === 'function') {
            await this._checkpointManager.clearAll();
        }

        this.isDisposed = true;
    }

    private initializeModes(): void {
        const context: ModeContext = {
            stateManager: this._stateManager,
            checkpointManager: this._checkpointManager,
            memoryManager: this.memoryManager,
            toolExecutor: null, // Will be properly integrated later
            dispatcher: this.dispatcher // Pass dispatcher for user interaction
        };

        // Initialize Simple Mode
        this.modes.set('simple', new SimpleMode('simple', context, {
            maxSteps: 20,
            maxErrors: 3,
            memoryTokenLimit: 100,
            enableCheckpoints: true,
            checkpointInterval: 5,
            timeoutMs: 60000
        }));

        // Initialize Planner Mode
        this.modes.set('planner', new PlannerMode('planner', context, {
            maxSteps: 100,
            maxErrors: 5,
            memoryTokenLimit: 200,
            enableCheckpoints: true,
            checkpointInterval: 3,
            timeoutMs: 300000
        }));

        // Initialize Supervised Mode
        this.modes.set('supervised', new SupervisedMode('supervised', context, {
            maxSteps: 100,
            maxErrors: 3,
            memoryTokenLimit: 300,
            enableCheckpoints: true,
            checkpointInterval: 1, // Frequent checkpoints due to user interaction
            timeoutMs: 600000
        }));
    }
}