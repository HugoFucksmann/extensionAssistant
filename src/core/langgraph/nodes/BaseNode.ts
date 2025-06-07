// src/core/langgraph/nodes/BaseNode.ts
import { GraphPhase, SimplifiedOptimizedGraphState } from "../state/GraphState";
import { IObservabilityManager } from "../services/interfaces/DependencyInterfaces";
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

    constructor(
        nodeId: GraphPhase,
        dependencies: DependencyContainer,
        observability: IObservabilityManager
    ) {
        this.nodeId = nodeId;
        this.dependencies = dependencies;
        this.observability = observability;
    }

    async execute(state: SimplifiedOptimizedGraphState): Promise<Partial<SimplifiedOptimizedGraphState>> {
        // <<< LOG MEJORADO
        console.log(`[${this.nodeId}] ==> Phase Started. Chat: ${state.chatId}, Iteration: ${state.iteration}`);
        this.observability.logPhaseStart(this.nodeId, state);

        let result: Partial<SimplifiedOptimizedGraphState>;

        try {
            // Validar límites globales y de nodo
            if (state.iteration >= state.maxGraphIterations) {
                throw new Error(`Max graph iterations (${state.maxGraphIterations}) exceeded`);
            }
            const nodeLimit = state.maxNodeIterations[this.nodeId];
            if (nodeLimit && state.nodeIterations[this.nodeId] >= nodeLimit) {
                throw new Error(`Max node iterations (${nodeLimit}) exceeded for ${this.nodeId}`);
            }

            const context = await this.createExecutionContext(state);
            result = await this.executeCore(state, context);

            // <<< LOG MEJORADO
            console.log(`[${this.nodeId}] <== Phase Completed. Returning state updates:`, result);

        } catch (error: any) {
            result = this.handleError(error, state);
        }

        this.observability.logPhaseComplete(this.nodeId, state, result);

        return {
            ...result,
            currentPhase: this.nodeId,
            nodeIterations: {
                ...state.nodeIterations,
                [this.nodeId]: (state.nodeIterations[this.nodeId] || 0) + 1
            }
        };
    }

    protected abstract executeCore(
        state: SimplifiedOptimizedGraphState,
        context: NodeExecutionContext
    ): Promise<Partial<SimplifiedOptimizedGraphState>>;

    protected async createExecutionContext(state: SimplifiedOptimizedGraphState): Promise<NodeExecutionContext> {
        return {
            timestamp: Date.now(),
            nodeId: this.nodeId,
            chatId: state.chatId,
            iteration: state.nodeIterations[this.nodeId] || 0
        };
    }

    protected handleError(error: Error, state: SimplifiedOptimizedGraphState): Partial<SimplifiedOptimizedGraphState> {
        // <<< LOG MEJORADO
        console.error(`[ERROR in ${this.nodeId}] Chat: ${state.chatId}`, error);
        this.observability.trackError(this.nodeId, error, state);

        return {
            currentPhase: GraphPhase.ERROR,
            error: error.message,
            isCompleted: true
        };
    }
}