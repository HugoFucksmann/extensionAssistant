// src/core/ComponentFactory.ts
import * as vscode from 'vscode';
import { VSCodeContext } from '../shared/types';
import { EventLogger } from '../features/events/EventLogger';
import { ModelManager } from '../features/ai/ModelManager';
/* import { PromptManager } from '../features/ai/promptManager'; */
import { ToolRegistry } from '../features/tools/ToolRegistry';
import { allToolDefinitions } from '../features/tools/definitions';
import { MemoryManager } from '../features/memory/MemoryManager';
import { ConversationManager } from './ConversationManager';
import { ApplicationLogicService } from './ApplicationLogicService';
import { InternalEventDispatcher } from './events/InternalEventDispatcher';
// import { WindsurfGraph } from '../features/ai/ReActGraph'; // <-- REMOVE or COMMENT OUT
/* 
import { LanguageModelService } from './LanguageModelService'; */
/* import { ReActEngine } from './ReActEngine'; */
import { OptimizedReActEngine } from './OptimizedReActEngine';
import { OptimizedPromptManager } from '../features/ai/OptimizedPromptManager';
import { LongTermStorage } from '../features/memory/LongTermStorage';

export class ComponentFactory {
  private static applicationLogicServiceInstance: ApplicationLogicService;
  private static internalEventDispatcherInstance: InternalEventDispatcher;
  private static eventLoggerInstance: EventLogger;
  private static toolRegistryInstance: ToolRegistry;
  private static vscodeContextInstance: VSCodeContext;

  // New singletons for core AI components
  private static modelManagerInstance: ModelManager;
/*   private static promptManagerInstance: PromptManager;
  private static languageModelServiceInstance: LanguageModelService;
  private static reActEngineInstance: ReActEngine; */
  private static optimizedPromptManagerInstance: OptimizedPromptManager;
  private static optimizedReActEngineInstance: OptimizedReActEngine;
  private static longTermStorageInstance: LongTermStorage;

  public static getInternalEventDispatcher(): InternalEventDispatcher {
    if (!this.internalEventDispatcherInstance) {
      this.internalEventDispatcherInstance = new InternalEventDispatcher();
      console.log('[ComponentFactory] InternalEventDispatcher instance created.');
    }
    return this.internalEventDispatcherInstance;
  }

  private static getVSCodeContext(extensionContext: vscode.ExtensionContext): VSCodeContext {
    if (!this.vscodeContextInstance) {
        this.vscodeContextInstance = {
            extensionUri: extensionContext.extensionUri,
            extensionPath: extensionContext.extensionPath,
            subscriptions: extensionContext.subscriptions,
            outputChannel: vscode.window.createOutputChannel("Extension Assistant Log"), // Ensure this is used by EventLogger
            globalState: extensionContext.globalState,
            workspaceState: extensionContext.workspaceState,
        };
        console.log('[ComponentFactory] VSCodeContext instance created.');
    }
    return this.vscodeContextInstance;
  }

  public static getToolRegistry(extensionContext: vscode.ExtensionContext): ToolRegistry {
    if (!this.toolRegistryInstance) {
      const dispatcher = this.getInternalEventDispatcher();
      this.toolRegistryInstance = new ToolRegistry(dispatcher);
      this.toolRegistryInstance.registerTools(allToolDefinitions);
      console.log(`[ComponentFactory] ToolRegistry instance created with ${allToolDefinitions.length} tools.`);
    }
    return this.toolRegistryInstance;
  }
  
  // --- NEW SINGLETON GETTERS ---

  public static getModelManager(): ModelManager { // <-- ADDED METHOD
    if (!this.modelManagerInstance) {
      // Pass any necessary initial config if ModelManager constructor changes
      this.modelManagerInstance = new ModelManager(); 
      console.log('[ComponentFactory] ModelManager instance created.');
    }
    return this.modelManagerInstance;
  }

/*   public static getPromptManager(): PromptManager { // <-- ADDED METHOD
    if (!this.promptManagerInstance) {
      this.promptManagerInstance = new PromptManager();
      console.log('[ComponentFactory] PromptManager instance created.');
    }
    return this.promptManagerInstance;
  } */
  
 /*  public static getLanguageModelService(extensionContext: vscode.ExtensionContext): LanguageModelService { // <-- ADDED METHOD
    if (!this.languageModelServiceInstance) {
      const modelManager = this.getModelManager();
      const promptManager = this.getPromptManager();
      const dispatcher = this.getInternalEventDispatcher();
      this.languageModelServiceInstance = new LanguageModelService(modelManager, promptManager, dispatcher);
      console.log('[ComponentFactory] LanguageModelService instance created.');
    }
    return this.languageModelServiceInstance;
  } */

 /*  public static getReActEngine(extensionContext: vscode.ExtensionContext): ReActEngine {
    if (!this.reActEngineInstance) {
      const languageModelService = this.getLanguageModelService(extensionContext);
      const toolRegistry = this.getToolRegistry(extensionContext);
      const dispatcher = this.getInternalEventDispatcher();
      this.reActEngineInstance = new ReActEngine(languageModelService, toolRegistry, dispatcher);
      console.log('[ComponentFactory] ReActEngine instance created.');
    }
    return this.reActEngineInstance;
  } */
  
  public static getLongTermStorage(extensionContext: vscode.ExtensionContext): LongTermStorage {
    if (!this.longTermStorageInstance) {
      this.longTermStorageInstance = new LongTermStorage(extensionContext);
      console.log('[ComponentFactory] LongTermStorage instance created.');
    }
    return this.longTermStorageInstance;
  }
  
  public static getOptimizedPromptManager(): OptimizedPromptManager {
    if (!this.optimizedPromptManagerInstance) {
      const modelManager = this.getModelManager();
      this.optimizedPromptManagerInstance = new OptimizedPromptManager(modelManager);
      console.log('[ComponentFactory] OptimizedPromptManager instance created.');
    }
    return this.optimizedPromptManagerInstance;
  }
  
  public static getOptimizedReActEngine(extensionContext: vscode.ExtensionContext): OptimizedReActEngine {
    if (!this.optimizedReActEngineInstance) {
      const modelManager = this.getModelManager();
      const toolRegistry = this.getToolRegistry(extensionContext);
      const dispatcher = this.getInternalEventDispatcher();
      const longTermStorage = this.getLongTermStorage(extensionContext);
      this.optimizedReActEngineInstance = new OptimizedReActEngine(
        modelManager,
        toolRegistry,
        dispatcher,
        longTermStorage
      );
      console.log('[ComponentFactory] OptimizedReActEngine instance created.');
    }
    return this.optimizedReActEngineInstance;
  }
  
  // --- UPDATED getApplicationLogicService ---
  public static getApplicationLogicService(extensionContext: vscode.ExtensionContext): ApplicationLogicService {
    if (!this.applicationLogicServiceInstance) {
      const vscodeContext = this.getVSCodeContext(extensionContext);
      const dispatcher = this.getInternalEventDispatcher();

      if (!this.eventLoggerInstance) {
        // Ensure EventLogger uses the outputChannel from vscodeContext
        this.eventLoggerInstance = new EventLogger(vscodeContext, dispatcher);
        console.log('[ComponentFactory] EventLogger instance created and subscribed.');
      }

      const longTermStorage = this.getLongTermStorage(extensionContext); // Obtener singleton
      const memoryManager = new MemoryManager(longTermStorage); // Inyectar
      const toolRegistry = this.getToolRegistry(extensionContext);
      const conversationManager = new ConversationManager();
      
      // Usar el motor ReAct optimizado en lugar del estándar
      const reActEngine = this.getOptimizedReActEngine(extensionContext);

      this.applicationLogicServiceInstance = new ApplicationLogicService(
        vscodeContext,
        memoryManager,
        reActEngine,
        conversationManager,
        toolRegistry
      );
      console.log('[ComponentFactory] ApplicationLogicService instance created.');
    }
    return this.applicationLogicServiceInstance;
  }

  public static dispose(): void {
    if (this.applicationLogicServiceInstance && typeof (this.applicationLogicServiceInstance as any).dispose === 'function') {
        (this.applicationLogicServiceInstance as any).dispose();
    }
    // Dispose new singletons if they have dispose methods
    if (this.modelManagerInstance && typeof (this.modelManagerInstance as any).dispose === 'function') {
        (this.modelManagerInstance as any).dispose(); // ModelManager has a dispose
    }
    // PromptManager, LanguageModelService, ReActEngine currently don't have dispose methods.
    // ToolRegistry also doesn't have one.
    if (this.internalEventDispatcherInstance && typeof this.internalEventDispatcherInstance.dispose === 'function') {
        this.internalEventDispatcherInstance.dispose();
    }
    if (this.eventLoggerInstance && typeof (this.eventLoggerInstance as any).dispose === 'function') {
        (this.eventLoggerInstance as any).dispose();
    }

    // Clear instance references
    // @ts-ignore 
    this.applicationLogicServiceInstance = undefined;
    // @ts-ignore
    this.internalEventDispatcherInstance = undefined;
    // @ts-ignore
    this.eventLoggerInstance = undefined;
    // @ts-ignore
    this.toolRegistryInstance = undefined;
    // @ts-ignore
    this.vscodeContextInstance = undefined;
    // @ts-ignore
    this.modelManagerInstance = undefined; // <-- ADD
    // @ts-ignore
    this.promptManagerInstance = undefined; // <-- ADD
    // @ts-ignore
    this.languageModelServiceInstance = undefined; // <-- ADD
    // @ts-ignore
    this.reActEngineInstance = undefined;
    // @ts-ignore
    this.optimizedPromptManagerInstance = undefined;
    // @ts-ignore
    this.optimizedReActEngineInstance = undefined;
    // @ts-ignore
    this.longTermStorageInstance = undefined;
    console.log('[ComponentFactory] All instances disposed.');
  }
}