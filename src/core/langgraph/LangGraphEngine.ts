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

        // Crear el contenedor de dependencias con todas las instancias necesarias
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
        } catch (error: any) {
            finalState = {
                ...initialState,
                error: `Engine execution failed: ${error.message}`,
                isCompleted: true,
                currentPhase: GraphPhase.ERROR
            };
            this.observability.trackError('LangGraphEngine.run', error, finalState);
        }

        this.observability.logEngineEnd(chatId, finalState);
        return finalState;
    }

    // La integración en stream es más compleja y se omite por brevedad,
    // pero seguiría un patrón similar de registrar inicio/fin.
    public async *stream(
        // ...
    ): AsyncGenerator<SimplifiedOptimizedGraphState> {
        // ...
    }

    public dispose(): void {
        // Lógica de limpieza si es necesaria (e.g., listeners de observabilidad)
        console.log("[LangGraphEngine] Disposed.");
    }
}