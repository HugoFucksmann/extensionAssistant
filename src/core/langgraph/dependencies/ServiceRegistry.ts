// src/core/langgraph/dependencies/ServiceRegistry.ts
import { ModelManager } from "../../../features/ai/ModelManager";
import { MemoryManager } from "../../../features/memory/MemoryManager";
import { ToolRegistry } from "../../../features/tools/ToolRegistry";
import { AnalysisService } from "../services/AnalysisService";
import { HybridMemoryService } from "../services/HybridMemoryService";
import { IAnalysisService, IMemoryService, IModelManager, IReasoningService, IResponseService, IToolRegistry, IValidationService, IPromptProvider, IMemoryManager } from "../services/interfaces/DependencyInterfaces";
import { PromptProvider } from "../services/PromptProvider";
import { ReasoningService } from "../services/ReasoningService";
import { ResponseService } from "../services/ResponseService";
import { ValidationService } from "../services/ValidationService";
import { DependencyContainer } from "./DependencyContainer";
import { IObservabilityManager } from "../services/interfaces/DependencyInterfaces";
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
        container.register<IAnalysisService>('IAnalysisService', new AnalysisService(modelManager, promptProvider));
        container.register<IReasoningService>('IReasoningService', new ReasoningService(modelManager, promptProvider, toolRegistry));
        container.register<IValidationService>('IValidationService', new ValidationService(modelManager, promptProvider));
        container.register<IResponseService>('IResponseService', new ResponseService(modelManager, promptProvider));

        return container;
    }
}