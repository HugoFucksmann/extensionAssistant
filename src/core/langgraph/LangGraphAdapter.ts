// src/core/langgraph/LangGraphAdapter.ts
import { WindsurfState } from '@core/types';
import { OptimizedReActEngine } from '@features/ai/core/OptimizedReActEngine';
import { LangGraphEngine } from './LangGraphEngine'; // <-- IMPORTAR
import { ModelManager } from '../../features/ai/ModelManager';
import { ToolRegistry } from '../../features/tools/ToolRegistry';
import { InternalEventDispatcher } from '../events/InternalEventDispatcher';
import { MemoryManager } from '../../features/memory/MemoryManager';
import { PerformanceMonitor } from '../monitoring/PerformanceMonitor';
import { Disposable } from '../interfaces/Disposable';
import { getConfig } from '@shared/config2';


export class LangGraphAdapter implements Disposable {
    private reactEngine: OptimizedReActEngine;
    private langGraphEngine?: LangGraphEngine; // Hacerlo opcional
    private useLangGraph: boolean;
    private performanceMonitoringEnabled: boolean;

    constructor(
        private modelManager: ModelManager,
        private toolRegistry: ToolRegistry,
        private dispatcher: InternalEventDispatcher,
        private memoryManager: MemoryManager,
        private performanceMonitor: PerformanceMonitor,
    ) {
        // Log de inicialización
        this.dispatcher.systemInfo('LangGraphAdapter constructor called', {}, 'LangGraphAdapter');
        const config = getConfig(process.env.NODE_ENV === 'production' ? 'production' : 'development').backend;
        this.useLangGraph = config.langgraph.enabled;
        this.performanceMonitoringEnabled = config.langgraph.performanceMonitoring;

        this.dispatcher.systemInfo(
            `LangGraphAdapter initialized. Full config: ${JSON.stringify(config)}`,
            { useLangGraph: this.useLangGraph, performanceMonitoring: this.performanceMonitoringEnabled },
            'LangGraphAdapter'
        );
        this.useLangGraph = config.langgraph.enabled;
        this.performanceMonitoringEnabled = config.langgraph.performanceMonitoring;

        this.reactEngine = new OptimizedReActEngine(
            this.modelManager,
            this.toolRegistry,
            this.dispatcher,
            this.memoryManager
        );

        if (this.useLangGraph) { // Solo instanciar si está habilitado
            this.langGraphEngine = new LangGraphEngine( // <-- INSTANCIAR
                this.modelManager,
                this.toolRegistry,
                this.dispatcher,
                this.memoryManager,
                this.performanceMonitor
            );
        }

        this.dispatcher.systemInfo(
            `LangGraphAdapter initialized. LangGraph active: ${this.useLangGraph}`,
            { useLangGraph: this.useLangGraph, performanceMonitoring: this.performanceMonitoringEnabled },
            'LangGraphAdapter'
        );
    }

    public async run(state: WindsurfState): Promise<WindsurfState> {
        const startTime = Date.now();
        let resultState: WindsurfState = state; // <--- INICIALIZAR AQUÍ con el estado de entrada
        // Esto asegura que siempre tenga un valor.
        // Si todo falla, al menos devolvemos el estado original.

        const currentConfig = getConfig(process.env.NODE_ENV === 'production' ? 'production' : 'development').backend;
        const shouldUseLangGraph = currentConfig.langgraph.enabled && this.langGraphEngine;
        const engineName = shouldUseLangGraph ? 'LangGraphEngine' : 'OptimizedReActEngine';

        try {
            this.dispatcher.systemInfo(`LangGraphAdapter run called. shouldUseLangGraph: ${shouldUseLangGraph}, langGraphEngine: ${!!this.langGraphEngine}`, {}, 'LangGraphAdapter');
            if (shouldUseLangGraph && this.langGraphEngine) {
                this.dispatcher.systemInfo(`Attempting to use LangGraphEngine for chat: ${state.chatId}`, { chatId: state.chatId }, 'LangGraphAdapter');
                resultState = await this.langGraphEngine.run(state);
            } else {
                if (currentConfig.langgraph.enabled && !this.langGraphEngine) {
                    this.dispatcher.systemWarning(`LangGraph is enabled in config but engine instance is missing. Current config: ${JSON.stringify(currentConfig.langgraph)}`, { chatId: state.chatId }, 'LangGraphAdapter');
                    this.dispatcher.systemWarning(`LangGraph is enabled in config, but engine instance is missing. Falling back.`, { chatId: state.chatId }, 'LangGraphAdapter');
                }
                this.dispatcher.systemInfo(`Using OptimizedReActEngine for chat: ${state.chatId}`, { chatId: state.chatId }, 'LangGraphAdapter');
                resultState = await this.reactEngine.run(state);
            }
        } catch (error: any) {
            this.dispatcher.systemWarning(
                `Critical error in ${engineName} or its invocation. Falling back to OptimizedReActEngine.`,
                { originalEngine: engineName, error: error.message, chatId: state.chatId, stack: error.stack },
                'LangGraphAdapter'
            );

            const fallbackState: WindsurfState = {
                ...state, // Usar el estado original de entrada para el fallback
                history: [
                    ...(state.history || []),
                    {
                        phase: 'system_message',
                        content: `Primary engine (${engineName}) failed catastrophically: ${error.message}. Using fallback.`,
                        timestamp: Date.now(),
                        iteration: state.iterationCount || 0,
                        metadata: { status: 'error', fallback: true, critical: true } // Marcar como error crítico
                    }
                ],
                error: `Primary engine (${engineName}) failed: ${error.message}`, // Añadir error al estado
                completionStatus: 'failed' // Marcar como fallido
            };
            // Intentar el fallback, pero si también falla, resultState mantendrá el fallbackState con el error.
            try {
                resultState = await this.reactEngine.run(fallbackState);
            } catch (fallbackError: any) {
                this.dispatcher.systemError(
                    `Fallback engine (OptimizedReActEngine) also failed after ${engineName} failure.`,
                    fallbackError, { chatId: state.chatId, originalError: error.message }, 'LangGraphAdapter'
                );
                // En este punto, resultState ya es fallbackState, que contiene el error del motor original.
                // Podríamos añadir el error del fallback también.
                resultState.error += `; Fallback also failed: ${fallbackError.message}`;
                resultState.history.push({
                    phase: 'system_message',
                    content: `Fallback engine also failed: ${fallbackError.message}`,
                    timestamp: Date.now(),
                    iteration: state.iterationCount || 0,
                    metadata: { status: 'error', critical: true }
                });
            }
        } finally {
            // Ahora resultState siempre está asignado.
            if (this.performanceMonitoringEnabled) {
                const duration = Date.now() - startTime;
                this.performanceMonitor.trackNodeExecution(
                    engineName,
                    duration,
                    resultState.error // Usar el error del estado final (que podría ser del fallback)
                );
            }
        }
        return resultState;
    }

    public dispose(): void {
        if (this.reactEngine && typeof this.reactEngine.dispose === 'function') {
            this.reactEngine.dispose();
        }
        if (this.langGraphEngine && typeof this.langGraphEngine.dispose === 'function') { // <-- DISPOSE
            this.langGraphEngine.dispose();
        }
        this.dispatcher.systemInfo('LangGraphAdapter disposed.', {}, 'LangGraphAdapter');
    }
}