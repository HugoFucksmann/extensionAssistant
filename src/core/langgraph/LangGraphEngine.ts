// src/core/langgraph/LangGraphEngine.ts
import { CompiledStateGraph, MemorySaver } from "@langchain/langgraph";
import { ModelManager } from "../../features/ai/ModelManager";
import { MemoryManager } from "../../features/memory/MemoryManager";
import { ToolRegistry } from "../../features/tools/ToolRegistry";
import { EngineConfig, DEFAULT_ENGINE_CONFIG } from "./config/EngineConfig";
import { DependencyContainer } from "./dependencies/DependencyContainer";

import { GraphBuilder } from "./graph/GraphBuilder";
import { GraphPhase, SimplifiedOptimizedGraphState } from "./state/GraphState";

import { IGraphPhaseObserver } from "./services/interfaces/DependencyInterfaces";
import { InternalEventDispatcher } from "@core/events/InternalEventDispatcher";
import { PerformanceMonitor } from "@core/monitoring/PerformanceMonitor";
import { CacheManager } from "@core/utils/CacheManager";
import { ParallelExecutionService } from "@core/utils/ParallelExecutionService";
import { ServiceRegistry } from "./dependencies/ServiceRegistry";
import { EventType } from "@features/events/eventTypes";

export class LangGraphEngine {
    private dependencies: DependencyContainer;
    private compiledGraph: CompiledStateGraph<SimplifiedOptimizedGraphState, Partial<SimplifiedOptimizedGraphState>>;
    private config: EngineConfig;
    private observer: IGraphPhaseObserver;

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

        this.observer = this.dependencies.get<IGraphPhaseObserver>('IGraphPhaseObserver');

        const graphBuilder = new GraphBuilder(this.dependencies, this.observer);
        const workflow = graphBuilder.buildGraph();

        this.compiledGraph = workflow.compile({
            checkpointer: new MemorySaver(),
        });
    }

    public getConfig(): EngineConfig {
        return this.config;
    }

    public async run(
        initialStateForTurn: SimplifiedOptimizedGraphState
    ): Promise<SimplifiedOptimizedGraphState> {
        const chatId = initialStateForTurn.chatId;
        this.observer.logEngineStart(chatId);

        let finalState: SimplifiedOptimizedGraphState;
        try {
            const result = await this.compiledGraph.invoke(initialStateForTurn, {
                configurable: { thread_id: chatId }
            });
            finalState = {
                ...initialStateForTurn,
                ...result
            };
            this.dispatchTurnCompletedEvent(chatId, finalState.startTime, finalState.error);
        } catch (error: any) {
            finalState = {
                ...initialStateForTurn,
                error: `Engine execution failed: ${error.message}`,
                isCompleted: true,
                currentPhase: GraphPhase.ERROR
            };
            this.observer.trackError('LangGraphEngine.run', error, finalState);
            this.dispatchTurnCompletedEvent(chatId, finalState.startTime, finalState.error);
        }

        this.observer.logEngineEnd(chatId, finalState);
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