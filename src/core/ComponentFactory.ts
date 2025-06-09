// src/core/ComponentFactory.ts
import * as vscode from 'vscode';

import { ModelManager } from '../features/ai/ModelManager';
import { ToolRegistry } from '../features/tools/ToolRegistry';
import { allToolDefinitions } from '../features/tools/definitions';
import { ConversationManager } from './ConversationManager';
import { ApplicationLogicService } from './ApplicationLogicService';
import { InternalEventDispatcher } from './events/InternalEventDispatcher';
import { MemoryManager } from '../features/memory/MemoryManager';
import { LangGraphEngine } from './langgraph/LangGraphEngine';
import { PerformanceMonitor } from './monitoring/PerformanceMonitor';
import { CacheManager } from './utils/CacheManager';
import { ParallelExecutionService } from './utils/ParallelExecutionService';
import { SystemInitializer } from './langgraph/initialization/SystemInitializer';
import { Disposable } from './interfaces/Disposable';


export class ComponentFactory {
  private static applicationLogicServiceInstance: ApplicationLogicService;
  private static internalEventDispatcherInstance: InternalEventDispatcher;
  private static toolRegistryInstance: ToolRegistry;
  private static modelManagerInstance: ModelManager;
  private static conversationManagerInstance: ConversationManager;
  private static memoryManagerInstance: MemoryManager;
  private static performanceMonitorInstance: PerformanceMonitor;
  private static langGraphEngineInstance: LangGraphEngine;
  private static cacheManagerInstance: CacheManager;
  private static parallelExecutionServiceInstance: ParallelExecutionService;
  private static appLogicService: ApplicationLogicService;

  public static getCacheManager(): CacheManager {
    if (!this.cacheManagerInstance) {
      this.cacheManagerInstance = new CacheManager();
    }
    return this.cacheManagerInstance;
  }

  public static getParallelExecutionService(): ParallelExecutionService {
    if (!this.parallelExecutionServiceInstance) {
      this.parallelExecutionServiceInstance = new ParallelExecutionService();
    }
    return this.parallelExecutionServiceInstance;
  }

  public static getInternalEventDispatcher(): InternalEventDispatcher {
    if (!this.internalEventDispatcherInstance) {
      this.internalEventDispatcherInstance = new InternalEventDispatcher();
    }
    return this.internalEventDispatcherInstance;
  }

  public static getToolRegistry(): ToolRegistry {
    if (!this.toolRegistryInstance) {
      const dispatcher = this.getInternalEventDispatcher();
      const performanceMonitor = this.getPerformanceMonitor();
      const cacheManager = this.getCacheManager();

      this.toolRegistryInstance = new ToolRegistry(dispatcher, performanceMonitor, cacheManager);
      this.toolRegistryInstance.registerTools(allToolDefinitions);
    }
    return this.toolRegistryInstance;
  }

  public static getModelManager(): ModelManager {
    if (!this.modelManagerInstance) {
      this.modelManagerInstance = new ModelManager();
    }
    return this.modelManagerInstance;
  }

  public static getMemoryManager(extensionContext: vscode.ExtensionContext): MemoryManager {
    if (!this.memoryManagerInstance) {
      this.memoryManagerInstance = new MemoryManager(extensionContext);
    }
    return this.memoryManagerInstance;
  }

  public static getPerformanceMonitor(): PerformanceMonitor {
    if (!this.performanceMonitorInstance) {
      this.performanceMonitorInstance = new PerformanceMonitor();
    }
    return this.performanceMonitorInstance;
  }

  public static async getLangGraphEngine(extensionContext: vscode.ExtensionContext): Promise<LangGraphEngine> {
    if (!this.langGraphEngineInstance) {
      this.langGraphEngineInstance = await SystemInitializer.initialize(extensionContext);
    }
    return this.langGraphEngineInstance;
  }

  public static async getApplicationLogicService(context: vscode.ExtensionContext): Promise<ApplicationLogicService> {
    if (!this.appLogicService) {
      const agentEngine = await this.getLangGraphEngine(context);
      const conversationManager = this.getConversationManager();
      const toolRegistry = this.getToolRegistry();
      // CAMBIO: Obtener el despachador y pasarlo al constructor.
      const dispatcher = this.getInternalEventDispatcher();

      this.appLogicService = new ApplicationLogicService(
        agentEngine,
        conversationManager,
        toolRegistry,
        dispatcher // Añadir esta línea
      );
    }
    return this.appLogicService;
  }

  public static getConversationManager(): ConversationManager {
    if (!this.conversationManagerInstance) {
      this.conversationManagerInstance = new ConversationManager(this.getInternalEventDispatcher());
    }
    return this.conversationManagerInstance;
  }


  // src/core/ComponentFactory.ts

  // ...
  public static async dispose(): Promise<void> {
    const disposeSafely = async (component: Disposable | undefined) => {
      if (component && typeof component.dispose === 'function') {
        await Promise.resolve(component.dispose());
      }
    };

    await disposeSafely(this.applicationLogicServiceInstance);
    this.applicationLogicServiceInstance = undefined as any;

    await disposeSafely(this.langGraphEngineInstance);
    this.langGraphEngineInstance = undefined as any;

    await disposeSafely(this.memoryManagerInstance);
    this.memoryManagerInstance = undefined as any;

    await disposeSafely(this.modelManagerInstance);
    this.modelManagerInstance = undefined as any;

    // Ahora usamos disposeSafely para el toolRegistry
    await disposeSafely(this.toolRegistryInstance);
    this.toolRegistryInstance = undefined as any;

    // Nota: PerformanceMonitor también podría implementar Disposable, pero por ahora su 'reset' es suficiente.
    // Si tuviera más lógica de limpieza, seguiría el mismo patrón.
    this.performanceMonitorInstance?.reset();
    this.performanceMonitorInstance = undefined as any;

    await disposeSafely(this.conversationManagerInstance);
    this.conversationManagerInstance = undefined as any;

    await disposeSafely(this.internalEventDispatcherInstance);
    this.internalEventDispatcherInstance = undefined as any;

    await disposeSafely(this.cacheManagerInstance);
    this.cacheManagerInstance = undefined as any;

    console.log('[ComponentFactory] All components disposed.');
  }

}