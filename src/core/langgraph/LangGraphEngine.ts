// src/core/langgraph/LangGraphEngine.ts
import { CompiledStateGraph, MemorySaver } from "@langchain/langgraph";
import { ModelManager } from "../../features/ai/ModelManager";
import { MemoryManager } from "../../features/memory/MemoryManager";
import { ToolRegistry } from "../../features/tools/ToolRegistry";
import { DEFAULT_ENGINE_CONFIG, EngineConfig } from "./config/EngineConfig"; // <-- Asegúrate que EngineConfig esté exportado
import { DependencyContainer } from "./dependencies/DependencyContainer";

import { GraphBuilder } from "./graph/GraphBuilder";
import { GraphPhase, SimplifiedOptimizedGraphState } from "./state/GraphState";

import { IObservabilityManager } from "./services/interfaces/DependencyInterfaces";
import { InternalEventDispatcher } from "src/core/events/InternalEventDispatcher";
import { PerformanceMonitor } from "src/core/monitoring/PerformanceMonitor";
import { CacheManager } from "src/core/utils/CacheManager";
import { ParallelExecutionService } from "src/core/utils/ParallelExecutionService";
import { ServiceRegistry } from "./dependencies/ServiceRegistry";
import { EventType } from "@features/events/eventTypes";

export class LangGraphEngine {
    private dependencies: DependencyContainer;
    private compiledGraph: CompiledStateGraph<SimplifiedOptimizedGraphState, Partial<SimplifiedOptimizedGraphState>>;
    private config: EngineConfig;
    private observability: IObservabilityManager;

    constructor(
        modelManager: ModelManager,
        toolRegistry: ToolRegistry,
        memoryManager: MemoryManager,
        dispatcher: InternalEventDispatcher,
        performanceMonitor: PerformanceMonitor,
        private readonly cacheManager: CacheManager,
        private readonly parallelExecutionService: ParallelExecutionService,
        config: Partial<EngineConfig> = {}
    ) {
        this.config = { ...DEFAULT_ENGINE_CONFIG, ...config };

        this.dependencies = ServiceRegistry.createContainer(
            modelManager,
            toolRegistry,
            memoryManager,
            dispatcher,
            performanceMonitor,
            this.cacheManager,
            this.parallelExecutionService
        );

        this.observability = this.dependencies.get<IObservabilityManager>('IObservabilityManager');

        const graphBuilder = new GraphBuilder(this.dependencies, this.observability);
        const workflow = graphBuilder.buildGraph();

        this.compiledGraph = workflow.compile({
            checkpointer: new MemorySaver(),
        });
    }

    // CAMBIO: Añadir este getter público
    public getConfig(): EngineConfig {
        return this.config;
    }

    public async run(
        initialStateForTurn: SimplifiedOptimizedGraphState
    ): Promise<SimplifiedOptimizedGraphState> {
        const chatId = initialStateForTurn.chatId;
        this.observability.logEngineStart(chatId);

        let finalState: SimplifiedOptimizedGraphState;
        try {
            finalState = await this.compiledGraph.invoke(initialStateForTurn, {
                configurable: { thread_id: chatId }
            });
            this.dispatchTurnCompletedEvent(chatId, finalState.startTime, finalState.error);
        } catch (error: any) {
            finalState = {
                ...initialStateForTurn,
                error: `Engine execution failed: ${error.message}`,
                isCompleted: true,
                currentPhase: GraphPhase.ERROR
            };
            this.observability.trackError('LangGraphEngine.run', error, finalState);
            this.dispatchTurnCompletedEvent(chatId, finalState.startTime, finalState.error);
        }

        this.observability.logEngineEnd(chatId, finalState);
        return finalState;
    }

    public async *stream(
        // ...
    ): AsyncGenerator<SimplifiedOptimizedGraphState> {
        // ...
    }

    private dispatchTurnCompletedEvent(chatId: string, startTime: number, error?: string): void {
        const dispatcher = this.dependencies.get<InternalEventDispatcher>('InternalEventDispatcher');
        dispatcher.dispatch(EventType.CONVERSATION_TURN_COMPLETED, {
            chatId,
            status: error ? 'failure' : 'success',
            duration: Date.now() - startTime,
            error: error
        });
    }

    public dispose(): void {
        console.log("[LangGraphEngine] Disposed.");
    }
}