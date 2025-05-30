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
      const vscodeContext = this.getVSCodeContext(extensionContext);
      const dispatcher = this.getInternalEventDispatcher();

      const longTermStorage = this.getLongTermStorage(extensionContext); 
      const memoryManager = new MemoryManager(longTermStorage); 
      const conversationManager = new ConversationManager();
      const toolRegistry = this.getToolRegistry();
      
     
      const reActEngine = this.getOptimizedReActEngine(extensionContext);

      this.applicationLogicServiceInstance = new ApplicationLogicService(
        memoryManager,
        reActEngine,
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

    // Clear instance references
    // @ts-ignore 
    this.applicationLogicServiceInstance = undefined;
    // @ts-ignore
    this.internalEventDispatcherInstance = undefined;
    // @ts-ignore

    // @ts-ignore
    this.toolRegistryInstance = undefined;
    // @ts-ignore
    this.vscodeContextInstance = undefined;
    // @ts-ignore
    this.modelManagerInstance = undefined;
    // @ts-ignore
    this.promptManagerInstance = undefined;
    // @ts-ignore
    this.languageModelServiceInstance = undefined; 
    // @ts-ignore
    this.reActEngineInstance = undefined;
    // @ts-ignore
    this.optimizedPromptManagerInstance = undefined;
    // @ts-ignore
    this.optimizedReActEngineInstance = undefined;
    // @ts-ignore
    this.longTermStorageInstance = undefined;
   
  }
}