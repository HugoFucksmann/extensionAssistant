// src/core/langgraph/nodes/BaseNode.ts
import { GraphPhase, SimplifiedOptimizedGraphState } from "../state/GraphState";
import { IObservabilityManager } from "../services/interfaces/DependencyInterfaces";
import { InternalEventDispatcher } from "../../events/InternalEventDispatcher";
import { EventType } from "../../../features/events/eventTypes";
type DependencyContainer = any;

export interface NodeExecutionContext {
    timestamp: number;
    nodeId: GraphPhase;
    chatId: string;
    iteration: number;
}

export abstract class BaseNode {
    protected nodeId: GraphPhase;
    protected dependencies: DependencyContainer;
    protected observability: IObservabilityManager;
    protected dispatcher: InternalEventDispatcher;

    constructor(
        nodeId: GraphPhase,
        dependencies: DependencyContainer,
        observability: IObservabilityManager
    ) {
        this.nodeId = nodeId;
        this.dependencies = dependencies;
        this.observability = observability;
        this.dispatcher = dependencies.get('InternalEventDispatcher');
    }

    async execute(state: SimplifiedOptimizedGraphState): Promise<Partial<SimplifiedOptimizedGraphState>> {
        this.observability.logPhaseStart(this.nodeId, state);
        let result: Partial<SimplifiedOptimizedGraphState>;

        try {
            if (state.iteration >= state.maxGraphIterations) {
                throw new Error(`Max graph iterations (${state.maxGraphIterations}) exceeded`);
            }
            const nodeLimit = state.maxNodeIterations[this.nodeId];
            if (nodeLimit && (state.nodeIterations[this.nodeId] || 0) >= nodeLimit) {
                throw new Error(`Max node iterations (${nodeLimit}) exceeded for ${this.nodeId}`);
            }

            const context = await this.createExecutionContext(state);
            result = await this.executeCore(state, context);

        } catch (error: any) {
            result = this.handleError(error, state);
        }

        this.observability.logPhaseComplete(this.nodeId, state, result);

        const currentNodeIterations = state.nodeIterations[this.nodeId] || 0;

        return {
            ...result,
            currentPhase: this.nodeId,
            nodeIterations: {
                ...state.nodeIterations,
                [this.nodeId]: currentNodeIterations + 1
            }
        };
    }

    protected abstract executeCore(
        state: SimplifiedOptimizedGraphState,
        context?: NodeExecutionContext // Contexto puede ser opcional
    ): Promise<Partial<SimplifiedOptimizedGraphState>>;

    protected async createExecutionContext(state: SimplifiedOptimizedGraphState): Promise<NodeExecutionContext> {
        return {
            timestamp: Date.now(),
            nodeId: this.nodeId,
            chatId: state.chatId,
            iteration: state.nodeIterations[this.nodeId] || 0
        };
    }

    protected handleError(error: any, state: SimplifiedOptimizedGraphState): Partial<SimplifiedOptimizedGraphState> {
        console.error(`[ERROR in ${this.nodeId}] Chat: ${state.chatId}`, error);
        this.observability.trackError(this.nodeId, error, state);

        this.dispatcher.dispatch(EventType.SYSTEM_ERROR, {
            chatId: state.chatId,
            message: `Error en la fase ${this.nodeId}: ${error.message}`,
            source: `LangGraphEngine.${this.nodeId}`,
            errorObject: { name: error.name, message: error.message, stack: error.stack },
        });

        return {
            currentPhase: this.nodeId, // Mantenemos la fase actual para que la lógica de transición la vea
            error: error.message,
            isCompleted: false, // No está completado, la lógica de transición lo enviará a ERROR_HANDLER
            debugInfo: {
                ...state.debugInfo,
                // AIResponseParser adjunta 'raw' al error si falla.
                rawResponseFromFailedNode: error.raw,
            }
        };
    }
}