// src/core/langgraph/LangGraphAdapter.ts
import { WindsurfState } from '@core/types';
import { LangGraphEngine } from './LangGraphEngine';
import { ModelManager } from '../../features/ai/ModelManager';
import { ToolRegistry } from '../../features/tools/ToolRegistry';
import { InternalEventDispatcher } from '../events/InternalEventDispatcher';
import { MemoryManager } from '../../features/memory/MemoryManager';
import { PerformanceMonitor } from '../monitoring/PerformanceMonitor';
import { Disposable } from '../interfaces/Disposable';
import { getConfig } from '@shared/config2';

export class LangGraphAdapter implements Disposable {
    private langGraphEngine: LangGraphEngine;
    private performanceMonitoringEnabled: boolean;

    constructor(
        private modelManager: ModelManager,
        private toolRegistry: ToolRegistry,
        private dispatcher: InternalEventDispatcher,
        private memoryManager: MemoryManager,
        private performanceMonitor: PerformanceMonitor,
    ) {
        this.dispatcher.systemInfo('LangGraphAdapter constructor called', {}, 'LangGraphAdapter');

        const config = getConfig(process.env.NODE_ENV === 'production' ? 'production' : 'development').backend;
        this.performanceMonitoringEnabled = config.langgraph.performanceMonitoring;

        // Always initialize LangGraphEngine - no fallback needed
        this.langGraphEngine = new LangGraphEngine(
            this.modelManager,
            this.toolRegistry,
            this.dispatcher,
            this.memoryManager,
            this.performanceMonitor
        );

        this.dispatcher.systemInfo(
            'LangGraphAdapter initialized with LangGraphEngine',
            { performanceMonitoring: this.performanceMonitoringEnabled },
            'LangGraphAdapter'
        );
    }

    public async run(state: WindsurfState): Promise<WindsurfState> {
        const startTime = Date.now();
        // Initialize with input state to ensure it always has a value
        let resultState: WindsurfState = { ...state };

        try {
            this.dispatcher.systemInfo(
                `LangGraphAdapter executing LangGraphEngine for chat: ${state.chatId}`,
                { chatId: state.chatId },
                'LangGraphAdapter'
            );

            resultState = await this.langGraphEngine.run(state);

        } catch (error: any) {
            this.dispatcher.systemError(
                `Critical error in LangGraphEngine execution for chat ${state.chatId}: ${error.message}`,
                error,
                { chatId: state.chatId, stack: error.stack },
                'LangGraphAdapter'
            );

            // Create error state instead of falling back to another engine
            resultState = {
                ...state,
                history: [
                    ...(state.history || []),
                    {
                        phase: 'system_message',
                        content: `LangGraphEngine failed: ${error.message}. Please try again or contact support if the issue persists.`,
                        timestamp: Date.now(),
                        iteration: state.iterationCount || 0,
                        metadata: { status: 'error', critical: true }
                    }
                ],
                error: `LangGraphEngine execution failed: ${error.message}`,
                completionStatus: 'failed'
            };
        } finally {
            if (this.performanceMonitoringEnabled) {
                const duration = Date.now() - startTime;
                this.performanceMonitor.trackNodeExecution(
                    'LangGraphEngine',
                    duration,
                    resultState.error
                );
            }
        }

        return resultState;
    }

    public dispose(): void {
        if (this.langGraphEngine && typeof this.langGraphEngine.dispose === 'function') {
            this.langGraphEngine.dispose();
        }
        this.dispatcher.systemInfo('LangGraphAdapter disposed.', {}, 'LangGraphAdapter');
    }
}