// src/core/ComponentFactory.ts
import * as vscode from 'vscode';
import { VSCodeContext } from '../shared/types';
import { EventLogger } from '../features/events/EventLogger';
import { ModelManager } from '../features/ai/ModelManager';
import { PromptManager } from '../features/ai/promptManager';
import { ToolRegistry } from '../features/tools/ToolRegistry'; // Asegúrate que la ruta sea correcta
import { allToolDefinitions } from '../features/tools/definitions'; // Importar todas las definiciones de herramientas
import { WindsurfGraph } from '../features/ai/ReActGraph'; 
import { MemoryManager } from '../features/memory/MemoryManager';
import { ConversationManager } from './ConversationManager';
import { ApplicationLogicService } from './ApplicationLogicService';
import { InternalEventDispatcher } from './events/InternalEventDispatcher';
import { ToolExecutionContext } from '../features/tools/types'; // Importar

export class ComponentFactory {
  private static applicationLogicServiceInstance: ApplicationLogicService;
  private static internalEventDispatcherInstance: InternalEventDispatcher;
  private static eventLoggerInstance: EventLogger;
  private static toolRegistryInstance: ToolRegistry; // Añadir instancia de ToolRegistry
  private static vscodeContextInstance: VSCodeContext; // Guardar el VSCodeContext

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
            outputChannel: vscode.window.createOutputChannel("Extension Assistant Log"),
            globalState: extensionContext.globalState,
            workspaceState: extensionContext.workspaceState,
            // Añadir workspaceFolders y activeTextEditor si se actualizan dinámicamente
            // o se obtienen cuando se necesitan. Por ahora, los dejamos fuera del context almacenado
            // para evitar que se queden obsoletos, a menos que se actualicen activamente.
        };
        console.log('[ComponentFactory] VSCodeContext instance created.');
    }
    return this.vscodeContextInstance;
  }


  public static getToolRegistry(extensionContext: vscode.ExtensionContext): ToolRegistry {
    if (!this.toolRegistryInstance) {
      const dispatcher = this.getInternalEventDispatcher();
      // El ToolRegistry ahora toma el dispatcher para su logging interno.
      // No necesita el VSCodeContext directamente en su constructor si el ToolExecutionContext
      // se construye y pasa en el momento de la ejecución de la herramienta.
      this.toolRegistryInstance = new ToolRegistry(dispatcher);
      
      // Registrar todas las herramientas definidas
      this.toolRegistryInstance.registerTools(allToolDefinitions);
      console.log(`[ComponentFactory] ToolRegistry instance created with ${allToolDefinitions.length} tools.`);
    }
    return this.toolRegistryInstance;
  }
  
  public static getApplicationLogicService(extensionContext: vscode.ExtensionContext): ApplicationLogicService {
    if (!this.applicationLogicServiceInstance) {
      const vscodeContext = this.getVSCodeContext(extensionContext);
      const dispatcher = this.getInternalEventDispatcher();

      if (!this.eventLoggerInstance) {
        this.eventLoggerInstance = new EventLogger(vscodeContext, dispatcher);
        console.log('[ComponentFactory] EventLogger instance created and subscribed.');
      }

      const memoryManager = new MemoryManager(extensionContext); // MemoryManager podría necesitar el dispatcher también
      const modelManager = new ModelManager(/* config */);
      const promptManager = new PromptManager();
      const toolRegistry = this.getToolRegistry(extensionContext); // Obtener la instancia
      const conversationManager = new ConversationManager();
      
      // ReActGraph podría necesitar el ToolExecutionContext base si llama directamente a herramientas
      // o si el ApplicationLogicService lo construye y lo pasa.
      const reactGraph = new WindsurfGraph(modelManager, toolRegistry, promptManager, dispatcher);

      this.applicationLogicServiceInstance = new ApplicationLogicService(
        vscodeContext,
        memoryManager,
        reactGraph,
        conversationManager,
        toolRegistry, // Pasar la instancia de ToolRegistry
        // dispatcher // ApplicationLogicService no debería usar el dispatcher directamente
      );
      console.log('[ComponentFactory] ApplicationLogicService instance created.');
    }
    return this.applicationLogicServiceInstance;
  }

  public static dispose(): void {
    if (this.applicationLogicServiceInstance && typeof (this.applicationLogicServiceInstance as any).dispose === 'function') {
        (this.applicationLogicServiceInstance as any).dispose();
    }
    // ToolRegistry no tiene un método dispose actualmente, pero si lo tuviera, se llamaría aquí.
    if (this.internalEventDispatcherInstance && typeof this.internalEventDispatcherInstance.dispose === 'function') {
        this.internalEventDispatcherInstance.dispose();
    }
    if (this.eventLoggerInstance && typeof (this.eventLoggerInstance as any).dispose === 'function') {
        (this.eventLoggerInstance as any).dispose();
    }
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
    console.log('[ComponentFactory] All instances disposed.');
  }
}