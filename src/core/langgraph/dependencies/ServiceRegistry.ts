// src/core/langgraph/dependencies/ServiceRegistry.ts
import { ModelManager } from "../../../features/ai/ModelManager";
import { MemoryManager } from "../../../features/memory/MemoryManager";
import { ToolRegistry } from "../../../features/tools/ToolRegistry";
import { HybridMemoryService } from "../services/HybridMemoryService";
import {
    IPlannerService,
    IExecutorService,
    IFinalResponseService,
    IMemoryService,
    IModelManager,
    IToolRegistry,
    IMemoryManager,
    IPromptProvider,
    IObservabilityManager
} from "../services/interfaces/DependencyInterfaces";
import { PromptProvider } from "../services/PromptProvider";
import { PlannerService } from "../services/PlannerService";
import { ExecutorService } from "../services/ExecutorService";
import { FinalResponseService } from "../services/FinalResponseService";
import { DependencyContainer } from "./DependencyContainer";
import { ObservabilityManager } from "../observability/ObservabilityManager";
import { InternalEventDispatcher } from "../../events/InternalEventDispatcher";
import { PerformanceMonitor } from "../../monitoring/PerformanceMonitor";
import { CacheManager } from "../../utils/CacheManager";
import { ParallelExecutionService } from "../../utils/ParallelExecutionService";

export class ServiceRegistry {

    public static createContainer(
        modelManager: ModelManager,
        toolRegistry: ToolRegistry,
        memoryManager: MemoryManager,
        dispatcher: InternalEventDispatcher,
        performanceMonitor: PerformanceMonitor,
        cacheManager: CacheManager,
        parallelExecutionService: ParallelExecutionService
    ): DependencyContainer {
        const container = new DependencyContainer();

        // Dependencias base
        container.register<CacheManager>('CacheManager', cacheManager);
        container.register<ParallelExecutionService>('ParallelExecutionService', parallelExecutionService);
        container.register<IModelManager>('IModelManager', modelManager);
        container.register<IToolRegistry>('IToolRegistry', toolRegistry);
        container.register<IMemoryManager>('IMemoryManager', memoryManager);
        container.register<InternalEventDispatcher>('InternalEventDispatcher', dispatcher);

        const promptProvider = new PromptProvider();
        container.register<IPromptProvider>('IPromptProvider', promptProvider);

        const observabilityManager = new ObservabilityManager(dispatcher, performanceMonitor);
        container.register<IObservabilityManager>('IObservabilityManager', observabilityManager);

        container.register<IMemoryService>('IMemoryService', new HybridMemoryService(memoryManager, modelManager));

        // Servicios de la arquitectura Planner/Executor
        container.register<IPlannerService>('IPlannerService', new PlannerService(modelManager, promptProvider));
        container.register<IExecutorService>('IExecutorService', new ExecutorService(modelManager, promptProvider));
        container.register<IFinalResponseService>('IFinalResponseService', new FinalResponseService(modelManager, promptProvider));

        return container;
    }
}