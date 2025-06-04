// src/core/ComponentFactory.ts
import * as vscode from 'vscode';

import { ModelManager } from '../features/ai/ModelManager';
import { ToolRegistry } from '../features/tools/ToolRegistry';
import { allToolDefinitions } from '../features/tools/definitions';
import { ConversationManager } from './ConversationManager';
import { ApplicationLogicService } from './ApplicationLogicService';
import { InternalEventDispatcher } from './events/InternalEventDispatcher';
import { OptimizedReActEngine } from './OptimizedReActEngine';
import { MemoryManager } from '../features/memory/MemoryManager';

export class ComponentFactory {
  private static applicationLogicServiceInstance: ApplicationLogicService;
  private static internalEventDispatcherInstance: InternalEventDispatcher;

  private static toolRegistryInstance: ToolRegistry;

  private static modelManagerInstance: ModelManager;

  private static optimizedReActEngineInstance: OptimizedReActEngine;
  private static conversationManagerInstance: ConversationManager;
  private static memoryManagerInstance: MemoryManager;

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

  public static getOptimizedReActEngine(extensionContext: vscode.ExtensionContext): OptimizedReActEngine {
    if (!this.optimizedReActEngineInstance) {
      const modelManager = this.getModelManager();
      const dispatcher = this.getInternalEventDispatcher();
      const toolRegistry = this.getToolRegistry();
      const memoryManager = this.getMemoryManager(extensionContext);
      this.optimizedReActEngineInstance = new OptimizedReActEngine(
        modelManager,
        toolRegistry,
        dispatcher,
        memoryManager
      );
    }
    return this.optimizedReActEngineInstance;
  }


  public static getApplicationLogicService(extensionContext: vscode.ExtensionContext): ApplicationLogicService {
    if (!this.applicationLogicServiceInstance) {
      const reActEngine = this.getOptimizedReActEngine(extensionContext);
      const toolRegistry = this.getToolRegistry();
      const conversationManager = this.getConversationManager();
      const memoryManager = this.getMemoryManager(extensionContext);

      this.applicationLogicServiceInstance = new ApplicationLogicService(
        memoryManager, // Pass the memoryManager instance
        reActEngine,
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
    if (this.optimizedReActEngineInstance && typeof this.optimizedReActEngineInstance.dispose === 'function') {
      this.optimizedReActEngineInstance.dispose();
      this.optimizedReActEngineInstance = null!;
    }

    if (this.memoryManagerInstance && typeof (this.memoryManagerInstance as any).dispose === 'function') {
      await (this.memoryManagerInstance as any).dispose();
      this.memoryManagerInstance = null!;
    }

    if (this.modelManagerInstance && typeof (this.modelManagerInstance as any).dispose === 'function') {
      (this.modelManagerInstance as any).dispose();
      this.modelManagerInstance = null!;
    }

    if (this.toolRegistryInstance && typeof (this.toolRegistryInstance as any).dispose === 'function') {
      (this.toolRegistryInstance as any).dispose();
      this.toolRegistryInstance = null!;
    }

    if (this.internalEventDispatcherInstance && typeof this.internalEventDispatcherInstance.dispose === 'function') {
      this.internalEventDispatcherInstance.dispose();
      this.internalEventDispatcherInstance = null!;
    }

    if (this.applicationLogicServiceInstance && typeof (this.applicationLogicServiceInstance as any).dispose === 'function') {
      (this.applicationLogicServiceInstance as any).dispose();
      this.applicationLogicServiceInstance = null!;
    }

    if (this.conversationManagerInstance) {
      if (typeof this.conversationManagerInstance.dispose === 'function') {
        this.conversationManagerInstance.dispose();
      }
      this.conversationManagerInstance = null!;
    }
  }
}