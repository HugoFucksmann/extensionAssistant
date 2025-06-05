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

  public static getInternalEventDispatcher(): InternalEventDispatcher {
    if (!this.internalEventDispatcherInstance) {
      this.internalEventDispatcherInstance = new InternalEventDispatcher();
    }
    return this.internalEventDispatcherInstance;
  }

  public static getToolRegistry(): ToolRegistry {
    if (!this.toolRegistryInstance) {
      const dispatcher = this.getInternalEventDispatcher();
      this.toolRegistryInstance = new ToolRegistry(dispatcher);
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

  public static getAgentExecutionEngine(extensionContext: vscode.ExtensionContext): LangGraphEngine {
    if (!this.langGraphEngineInstance) {
      const modelManager = this.getModelManager();
      const toolRegistry = this.getToolRegistry();
      const dispatcher = this.getInternalEventDispatcher();
      const memoryManager = this.getMemoryManager(extensionContext);
      const performanceMonitor = this.getPerformanceMonitor();

      this.langGraphEngineInstance = new LangGraphEngine(
        modelManager,
        toolRegistry,
        dispatcher,
        memoryManager,
        performanceMonitor
      );
    }
    return this.langGraphEngineInstance;
  }

  public static getApplicationLogicService(extensionContext: vscode.ExtensionContext): ApplicationLogicService {
    if (!this.applicationLogicServiceInstance) {
      const agentEngine = this.getAgentExecutionEngine(extensionContext);
      const toolRegistry = this.getToolRegistry();
      const conversationManager = this.getConversationManager();
      const memoryManager = this.getMemoryManager(extensionContext);

      this.applicationLogicServiceInstance = new ApplicationLogicService(
        memoryManager,
        agentEngine,
        conversationManager,
        toolRegistry
      );
    }
    return this.applicationLogicServiceInstance;
  }

  public static getConversationManager(): ConversationManager {
    if (!this.conversationManagerInstance) {
      this.conversationManagerInstance = new ConversationManager();
    }
    return this.conversationManagerInstance;
  }

  public static async dispose(): Promise<void> {
    if (this.langGraphEngineInstance && typeof this.langGraphEngineInstance.dispose === 'function') {
      this.langGraphEngineInstance.dispose();
      (this.langGraphEngineInstance as any) = null;
    }

    if (this.performanceMonitorInstance && typeof (this.performanceMonitorInstance as any).reset === 'function') {
      (this.performanceMonitorInstance as any).reset();
      (this.performanceMonitorInstance as any) = null;
    }

    if (this.memoryManagerInstance && typeof this.memoryManagerInstance.dispose === 'function') {
      await this.memoryManagerInstance.dispose();
      (this.memoryManagerInstance as any) = null;
    }

    if (this.modelManagerInstance && typeof this.modelManagerInstance.dispose === 'function') {
      this.modelManagerInstance.dispose();
      (this.modelManagerInstance as any) = null;
    }

    if (this.toolRegistryInstance) {
      (this.toolRegistryInstance as any) = null;
    }

    if (this.internalEventDispatcherInstance && typeof this.internalEventDispatcherInstance.dispose === 'function') {
      this.internalEventDispatcherInstance.dispose();
      (this.internalEventDispatcherInstance as any) = null;
    }

    if (this.applicationLogicServiceInstance && typeof this.applicationLogicServiceInstance.dispose === 'function') {
      this.applicationLogicServiceInstance.dispose();
      (this.applicationLogicServiceInstance as any) = null;
    }

    if (this.conversationManagerInstance) {
      if (typeof this.conversationManagerInstance.dispose === 'function') {
        this.conversationManagerInstance.dispose();
      }
      (this.conversationManagerInstance as any) = null;
    }
  }
}