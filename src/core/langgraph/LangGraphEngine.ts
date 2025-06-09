// src/core/langgraph/LangGraphEngine.ts
import { CompiledStateGraph, MemorySaver } from "@langchain/langgraph";
import { ModelManager } from "../../features/ai/ModelManager";
import { MemoryManager } from "../../features/memory/MemoryManager";
import { ToolRegistry } from "../../features/tools/ToolRegistry";
import { DEFAULT_ENGINE_CONFIG, EngineConfig } from "./config/EngineConfig";
import { DependencyContainer } from "./dependencies/DependencyContainer";

import { GraphBuilder } from "./graph/GraphBuilder";
import { GraphPhase, SimplifiedOptimizedGraphState } from "./state/GraphState";
import { StateFactory } from "./state/StateFactory";

import { IObservabilityManager } from "./services/interfaces/DependencyInterfaces";
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
    private observability: IObservabilityManager;

    /**
     * Crea una nueva instancia de LangGraphEngine
     * @param modelManager Gestor de modelos de IA
     * @param toolRegistry Registro de herramientas disponibles
     * @param memoryManager Gestor de memoria
     * @param dispatcher Dispatcher de eventos internos
     * @param performanceMonitor Monitor de rendimiento
     * @param cacheManager Gestor de caché (debe ser un singleton)
     * @param parallelExecutionService Servicio de ejecución en paralelo (debe ser un singleton)
     * @param config Configuración personalizada del motor
     */
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


    public async run(
        userInput: string,
        chatId: string
    ): Promise<SimplifiedOptimizedGraphState> {
        this.observability.logEngineStart(chatId);
        const initialState = StateFactory.createInitialState(userInput, chatId, this.config);

        let finalState: SimplifiedOptimizedGraphState;
        try {
            finalState = await this.compiledGraph.invoke(initialState, {
                configurable: { thread_id: chatId }
            });
            // Notify that the turn has completed successfully
            this.dispatchTurnCompletedEvent(chatId, finalState.startTime, finalState.error);
        } catch (error: any) {
            finalState = {
                ...initialState,
                error: `Engine execution failed: ${error.message}`,
                isCompleted: true,
                currentPhase: GraphPhase.ERROR
            };
            this.observability.trackError('LangGraphEngine.run', error, finalState);
            // Notify that the turn has completed with an error
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