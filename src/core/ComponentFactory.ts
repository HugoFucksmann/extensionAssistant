// src/core/ComponentFactory.ts
import * as vscode from 'vscode';
import { VSCodeContext } from '../vscode/types';

import { ModelManager } from '../features/ai/ModelManager';
import { ToolRegistry } from '../features/tools/ToolRegistry';
import { allToolDefinitions } from '../features/tools/definitions';
import { ConversationMemoryManager } from '../features/memory/ConversationMemoryManager';
import { ConversationManager } from './ConversationManager';
import { ApplicationLogicService } from './ApplicationLogicService';
import { InternalEventDispatcher } from './events/InternalEventDispatcher';
import { OptimizedReActEngine } from './OptimizedReActEngine';
import { OptimizedPromptManager } from '../features/ai/OptimizedPromptManager';
import { LongTermStorage } from '../features/memory/LongTermStorage';

export class ComponentFactory {
  private static applicationLogicServiceInstance: ApplicationLogicService;
  private static internalEventDispatcherInstance: InternalEventDispatcher;

  private static toolRegistryInstance: ToolRegistry;
  private static vscodeContextInstance: VSCodeContext;
  private static modelManagerInstance: ModelManager;
  private static optimizedPromptManagerInstance: OptimizedPromptManager;
  private static optimizedReActEngineInstance: OptimizedReActEngine;
  private static longTermStorageInstance: LongTermStorage;
  private static conversationManagerInstance: ConversationManager;

  public static getInternalEventDispatcher(): InternalEventDispatcher {
    if (!this.internalEventDispatcherInstance) {
      this.internalEventDispatcherInstance = new InternalEventDispatcher();

    }
    return this.internalEventDispatcherInstance;
  }

  private static getVSCodeContext(extensionContext: vscode.ExtensionContext): VSCodeContext {
    if (!this.vscodeContextInstance) {
      this.vscodeContextInstance = {
        extensionUri: extensionContext.extensionUri,
        extensionPath: extensionContext.extensionPath,
        subscriptions: extensionContext.subscriptions,
        outputChannel: vscode.window.createOutputChannel("Extension Assistant Log"),
        globalState: extensionContext.globalState,
        workspaceState: extensionContext.workspaceState,
      };

    }
    return this.vscodeContextInstance;
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

  public static getLongTermStorage(extensionContext: vscode.ExtensionContext): LongTermStorage {
    if (!this.longTermStorageInstance) {
      this.longTermStorageInstance = new LongTermStorage(extensionContext);

    }
    return this.longTermStorageInstance;
  }

  public static getOptimizedPromptManager(): OptimizedPromptManager {
    if (!this.optimizedPromptManagerInstance) {
      const modelManager = this.getModelManager();
      this.optimizedPromptManagerInstance = new OptimizedPromptManager(modelManager);

    }
    return this.optimizedPromptManagerInstance;
  }

  public static getOptimizedReActEngine(extensionContext: vscode.ExtensionContext): OptimizedReActEngine {
    if (!this.optimizedReActEngineInstance) {
      const modelManager = this.getModelManager();
      const dispatcher = this.getInternalEventDispatcher();
      const toolRegistry = this.getToolRegistry();
      const longTermStorage = this.getLongTermStorage(extensionContext);
      this.optimizedReActEngineInstance = new OptimizedReActEngine(
        modelManager,
        toolRegistry,
        dispatcher,
        longTermStorage
      );

    }
    return this.optimizedReActEngineInstance;
  }


  public static getApplicationLogicService(extensionContext: vscode.ExtensionContext): ApplicationLogicService {
    if (!this.applicationLogicServiceInstance) {


      const longTermStorage = this.getLongTermStorage(extensionContext);
      const conversationMemoryManager = new ConversationMemoryManager(longTermStorage);
      const conversationManager = new ConversationManager();
      const toolRegistry = this.getToolRegistry();


      const reActEngine = this.getOptimizedReActEngine(extensionContext);

      this.applicationLogicServiceInstance = new ApplicationLogicService(
        conversationMemoryManager,
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
    // Descartar instancias en orden inverso al de creación
    if (this.optimizedReActEngineInstance && typeof this.optimizedReActEngineInstance.dispose === 'function') {
      this.optimizedReActEngineInstance.dispose();
      this.optimizedReActEngineInstance = null!;
    }

    if (this.optimizedPromptManagerInstance && typeof (this.optimizedPromptManagerInstance as any).dispose === 'function') {
      (this.optimizedPromptManagerInstance as any).dispose();
      this.optimizedPromptManagerInstance = null!;
    }

    if (this.longTermStorageInstance && typeof this.longTermStorageInstance.dispose === 'function') {
      await this.longTermStorageInstance.dispose();
      this.longTermStorageInstance = null!;
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