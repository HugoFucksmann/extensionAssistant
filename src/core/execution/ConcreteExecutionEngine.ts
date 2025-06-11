// src/core/execution/ConcreteExecutionEngine.ts
import { ExecutionEngine, ExecutionResult, ExecutionMode } from './ExecutionEngine';
import { ExecutionState, ExecutionStateManager } from './ExecutionState';
import { DefaultExecutionStateManager } from './ExecutionStateManager';
import { CheckpointManager } from '../checkpoint/CheckpointManager';
import { Checkpoint } from '../checkpoint/types';
import { MemoryManager } from '../../features/memory/MemoryManager';
import { generateUniqueId } from '../../shared/utils/generateIds';
import { ToolRegistry } from '../../features/tools/ToolRegistry';
import { GraphBuilder } from '../langgraph/GraphBuilder';
import { HumanMessage } from '@langchain/core/messages';
import { StreamEvent } from '@langchain/core/tracers/log_stream';
import { AgentState } from '../langgraph/GraphState';
import { InternalEventDispatcher } from '../events/InternalEventDispatcher';
import { ComponentFactory } from '@core/ComponentFactory';

import { EventType, AgentPhaseCompletedPayload, SystemEventPayload } from '@features/events/eventTypes';

export class ConcreteExecutionEngine implements ExecutionEngine {
    private _currentMode: ExecutionMode = 'simple';
    private _stateManager: ExecutionStateManager;
    private _checkpointManager: CheckpointManager;
    private isDisposed = false;
    private graphBuilder: GraphBuilder;
    private dispatcher: InternalEventDispatcher;

    constructor(
        private memoryManager: MemoryManager,
        private toolRegistry: ToolRegistry,
        sessionId?: string
    ) {
        const actualSessionId = sessionId || generateUniqueId();
        this._stateManager = new DefaultExecutionStateManager(actualSessionId, this._currentMode);
        this._checkpointManager = new CheckpointManager(this._stateManager, this.memoryManager);
        this.graphBuilder = new GraphBuilder();
        this.dispatcher = ComponentFactory.getInternalEventDispatcher();
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

        const startTime = Date.now();
        const compiledGraph = this.graphBuilder.getCompiledGraph();

        // Aseguramos que el estado inicial tenga todos los campos necesarios
        const initialState: AgentState = {
            messages: [new HumanMessage({ content: query })],
            userQuery: query,
            mode: this._currentMode,
            errorCount: 0,
            maxIterations: 10,
            // No inicializamos analysisResult aquí, debe ser generado por el nodo de análisis
        };

        const stream = await compiledGraph.streamEvents(initialState, {
            version: "v2",
            configurable: {
                sessionId: this.state.sessionId,
            }
        });

        let finalState: AgentState | undefined;
        let stepCounter = 0;

        try {
            for await (const event of stream) {
                await this.handleExecutionControls();
                if (this.state.executionStatus === 'completed' || this.state.executionStatus === 'error') {
                    console.log(`[ExecutionEngine] Execution stopped prematurely with status: ${this.state.executionStatus}`);
                    break;
                }

                this.processStreamEvent(event, ++stepCounter);

                if (event.event === 'on_chain_end' && event.name === 'LangGraph') {
                    finalState = event.data.output as AgentState;
                }
            }

            const executionTime = Date.now() - startTime;

            if (!finalState) {
                throw new Error("Graph execution finished without a final state.");
            }

            if (finalState.finalResponse) {
                return {
                    success: true,
                    data: { response: finalState.finalResponse, fullState: finalState },
                    executionTime,
                };
            } else {
                const lastMessage = finalState.messages[finalState.messages.length - 1];
                const errorMessage = `Execution finished without a final response. Last message: ${lastMessage.content}`;
                return {
                    success: false,
                    error: errorMessage,
                    data: { fullState: finalState },
                    executionTime,
                };
            }
        } catch (error: any) {
            const executionTime = Date.now() - startTime;
            console.error('[ExecutionEngine] Graph execution failed:', error);
            this._stateManager.setState({ executionStatus: 'error', lastError: error });
            return {
                success: false,
                error: error.message || 'Unknown graph execution error',
                executionTime,
            };
        }
    }

    private processStreamEvent(event: StreamEvent, step: number): void {
        // Procesamos todos los eventos para depuración
        if (event.event === 'on_chain_start') {
            console.log(`[ExecutionEngine] Iniciando nodo: ${event.name}`);
            this.dispatcher.systemInfo(`Iniciando nodo: ${event.name}`, {
                input: event.data.input ? JSON.stringify(event.data.input).substring(0, 200) + '...' : 'No input data'
            }, 'ExecutionEngine', this.state.sessionId);
        }

        // Solo procesamos los eventos de finalización de nodo para actualizar el estado
        if (event.event !== 'on_chain_end') {
            return;
        }

        const nodeName = event.name;
        const output = event.data.output; // No hacer cast todavía
        console.log(`[DEBUG][ExecutionEngine] Output recibido del nodo '${nodeName}':`, JSON.stringify(output));

        // --- INICIO DE LA CORRECCIÓN ---

        // 1. Crear un objeto para la actualización del estado.
        const stateUpdate: Partial<ExecutionState> = {
            step: step,
            lastResult: { node: nodeName, output: output },
            progress: (this.state.progress || 0) + 0.1,
        };

        // 2. Fusionar el output de forma segura.
        //    Solo fusionamos si 'output' es un objeto y no un array o un primitivo.
        if (output && typeof output === 'object' && !Array.isArray(output)) {
            // Iteramos sobre las claves del output y las añadimos a la actualización.
            // Esto evita esparcir propiedades de clases de LangChain como 'lc_serializable'.
            Object.assign(stateUpdate, output);
        }

        // 3. Aplicar la actualización al stateManager.
        this._stateManager.setState(stateUpdate);

        // --- FIN DE LA CORRECCIÓN ---

        console.log(`[DEBUG][ExecutionEngine] Nuevo estado global tras fusión:`, JSON.stringify(this._stateManager.getState()));

        // El resto del código del método puede permanecer igual,
        // ya que ahora el estado se actualiza correctamente.

        if (nodeName === 'analysis') {
            // Este check ahora debería funcionar correctamente porque el estado global ya está actualizado.
            const currentState = this._stateManager.getState();
            if (!(currentState as any)['analysisResult']) {
                console.error('[ExecutionEngine] `analysisResult` no se encuentra en el estado global después de la ejecución del nodo de análisis.');
                this.dispatcher.systemWarning('`analysisResult` no se encontró en el estado global', {
                    nodeOutput: JSON.stringify(output).substring(0, 200) + '...'
                }, 'ExecutionEngine', this.state.sessionId);
            } else {
                console.log('[ExecutionEngine] `analysisResult` verificado en el estado global.');
            }
        }

        if (nodeName !== 'LangGraph') {
            console.log(`[ExecutionEngine] Nodo completado: ${nodeName}`);

            const payload: Omit<AgentPhaseCompletedPayload, 'timestamp'> = {
                chatId: this.state.sessionId,
                phase: nodeName,
                iteration: step,
                data: output,
                duration: 0,
            };
            this.dispatcher.dispatch(EventType.AGENT_PHASE_COMPLETED, payload);

            this.createCheckpoint(`Automatic checkpoint after step: ${nodeName}`, true)
                .catch(err => console.warn(`[ExecutionEngine] Failed to create automatic checkpoint: ${err.message}`));
        }
    }

    private async handleExecutionControls(): Promise<void> {
        while (this.state.executionStatus === 'paused') {
            console.log('[ExecutionEngine] Execution paused. Waiting...');
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    setMode(mode: ExecutionMode): void {
        if (this._currentMode !== mode) {
            this._currentMode = mode;
            this._stateManager.setState({ mode });
        }
    }

    async createCheckpoint(reason: string = 'Manual checkpoint', isAutomatic: boolean = false): Promise<Checkpoint> {
        return await this._checkpointManager.createCheckpoint(reason, isAutomatic);
    }

    async rollback(checkpointId: string): Promise<void> {
        await this._checkpointManager.rollback(checkpointId);
    }

    getProgress(): number {
        return this.state.progress || 0;
    }


    async pause(): Promise<void> {
        this._stateManager.setState({ executionStatus: 'paused' });

        this.dispatcher.systemInfo('Execution paused', {}, 'ExecutionEngine', this.state.sessionId);
    }

    async resume(): Promise<void> {
        this._stateManager.setState({ executionStatus: 'executing' });
        this.dispatcher.systemInfo('Execution resumed', {}, 'ExecutionEngine', this.state.sessionId);
    }

    async stop(): Promise<void> {
        this._stateManager.setState({ executionStatus: 'completed' });
        this.dispatcher.systemInfo('Execution stopped by user', {}, 'ExecutionEngine', this.state.sessionId);
    }

    async dispose(): Promise<void> {
        if (this.isDisposed) return;
        if (this._checkpointManager) {
            await this._checkpointManager.dispose();
        }
        this.isDisposed = true;
    }
}