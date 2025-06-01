// src/core/ComponentFactory.ts
import * as vscode from 'vscode';
import { VSCodeContext } from '../shared/types';

import { ModelManager } from '../features/ai/ModelManager';
import { ToolRegistry } from '../features/tools/ToolRegistry';
import { allToolDefinitions } from '../features/tools/definitions';
import { MemoryManager } from '../features/memory/MemoryManager';
import { ConversationManager } from './ConversationManager';
import { ApplicationLogicService } from './ApplicationLogicService';
import { InternalEventDispatcher } from './events/InternalEventDispatcher';
// ELIMINADO: import { OptimizedPromptManager } from '../features/ai/OptimizedPromptManager';
import { LongTermStorage } from '../features/memory/LongTermStorage';
import { LCELEngine } from './LCELEngine';
import { ChainRegistry } from '../features/ai/lcel/ChainRegistry';
import { GenericLCELChainExecutor } from '../features/ai/lcel/GenericLCELChainExecutor';
import { initializeChainRegistry } from '../features/ai/lcel/setup';

export class ComponentFactory {
  private static applicationLogicServiceInstance: ApplicationLogicService;
  private static internalEventDispatcherInstance: InternalEventDispatcher;

  private static toolRegistryInstance: ToolRegistry;
  private static vscodeContextInstance: VSCodeContext;
  private static modelManagerInstance: ModelManager;
  // ELIMINADO: private static optimizedPromptManagerInstance: OptimizedPromptManager;
  private static longTermStorageInstance: LongTermStorage;
  private static lcelEngineInstance: LCELEngine;
  private static chainRegistryInstance: ChainRegistry;
  private static genericLCELChainExecutorInstance: GenericLCELChainExecutor;


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

  // ELIMINADO: getOptimizedPromptManager
  // public static getOptimizedPromptManager(): OptimizedPromptManager {
  //   if (!this.optimizedPromptManagerInstance) {
  //     const modelManager = this.getModelManager();
  //     this.optimizedPromptManagerInstance = new OptimizedPromptManager(modelManager);
  //   }
  //   return this.optimizedPromptManagerInstance;
  // }

  private static getChainRegistry(): ChainRegistry {
    if (!this.chainRegistryInstance) {
      this.chainRegistryInstance = initializeChainRegistry();
    }
    return this.chainRegistryInstance;
  }

  private static getGenericLCELChainExecutor(): GenericLCELChainExecutor {
    if (!this.genericLCELChainExecutorInstance) {
      const chainRegistry = this.getChainRegistry();
      const modelManager = this.getModelManager();
      this.genericLCELChainExecutorInstance = new GenericLCELChainExecutor(chainRegistry, modelManager);
    }
    return this.genericLCELChainExecutorInstance;
  }

  public static getLCELEngine(extensionContext: vscode.ExtensionContext): LCELEngine {
    if (!this.lcelEngineInstance) {
      const toolRegistry = this.getToolRegistry();
      const dispatcher = this.getInternalEventDispatcher();
      const longTermStorage = this.getLongTermStorage(extensionContext);
      const chainExecutor = this.getGenericLCELChainExecutor();
      
      this.lcelEngineInstance = new LCELEngine(
        chainExecutor,
        toolRegistry,
        dispatcher,
        longTermStorage
      );
    }
    return this.lcelEngineInstance;
  }

  // ELIMINADO: getOptimizedReActEngine
  // public static getOptimizedReActEngine(extensionContext: vscode.ExtensionContext): any {
  //   console.warn('getOptimizedReActEngine is deprecated. Using getLCELEngine instead.');
  //   return this.getLCELEngine(extensionContext);
  // }

  public static getApplicationLogicService(extensionContext: vscode.ExtensionContext): ApplicationLogicService {
    if (!this.applicationLogicServiceInstance) {
      const longTermStorage = this.getLongTermStorage(extensionContext);
      const memoryManager = new MemoryManager(longTermStorage);
      const conversationManager = new ConversationManager();
      const toolRegistry = this.getToolRegistry();
      const lcelEngine = this.getLCELEngine(extensionContext);

      this.applicationLogicServiceInstance = new ApplicationLogicService(
        memoryManager,
        lcelEngine,
        conversationManager,
        toolRegistry
      );
    }
    return this.applicationLogicServiceInstance;
  }

  public static dispose(): void {
    if (this.applicationLogicServiceInstance && typeof (this.applicationLogicServiceInstance as any).dispose === 'function') {
        (this.applicationLogicServiceInstance as any).dispose();
    }
    if (this.modelManagerInstance && typeof (this.modelManagerInstance as any).dispose === 'function') {
        (this.modelManagerInstance as any).dispose();
    }
    if (this.internalEventDispatcherInstance && typeof this.internalEventDispatcherInstance.dispose === 'function') {
        this.internalEventDispatcherInstance.dispose();
    }
  }
}