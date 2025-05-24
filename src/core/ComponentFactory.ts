// src/core/ComponentFactory.ts
import * as vscode from 'vscode';
import { VSCodeContext } from '../shared/types';
// import { eventBus } from '../features/events/EventBus'; // Ya no usaremos el EventBus global directamente aquí para el flujo principal
import { EventLogger } from '../features/events/EventLogger';
import { ModelManager } from '../features/ai/ModelManager';
import { PromptManager } from '../features/ai/promptManager';
import { ToolRegistry } from '../features/tools/ToolRegistry';
import { WindsurfGraph } from '../features/ai/ReActGraph'; // Asumiendo que este es el nombre correcto
import { MemoryManager } from '../features/memory/MemoryManager';
import { ConversationManager } from './ConversationManager';
// Nuevas importaciones
import { ApplicationLogicService } from './ApplicationLogicService';
import { InternalEventDispatcher } from './events/InternalEventDispatcher'; // Asegúrate que la ruta sea correcta

export class ComponentFactory {
  private static applicationLogicServiceInstance: ApplicationLogicService;
  private static internalEventDispatcherInstance: InternalEventDispatcher;
  private static eventLoggerInstance: EventLogger; // Para asegurar que se cree una sola vez

  // Método para obtener el InternalEventDispatcher (singleton)
  public static getInternalEventDispatcher(): InternalEventDispatcher {
    if (!this.internalEventDispatcherInstance) {
      this.internalEventDispatcherInstance = new InternalEventDispatcher();
      console.log('[ComponentFactory] InternalEventDispatcher instance created.');
    }
    return this.internalEventDispatcherInstance;
  }

  // Método para obtener el ApplicationLogicService (singleton)
  public static getApplicationLogicService(extensionContext: vscode.ExtensionContext): ApplicationLogicService {
    if (!this.applicationLogicServiceInstance) {
      const customVSCodeContext: VSCodeContext = {
        extensionUri: extensionContext.extensionUri,
        extensionPath: extensionContext.extensionPath,
        subscriptions: extensionContext.subscriptions,
        outputChannel: vscode.window.createOutputChannel("Extension Assistant Log"), // Crear o reutilizar
        state: extensionContext.globalState,
      };

      // Obtener el dispatcher (se crea si no existe)
      const dispatcher = this.getInternalEventDispatcher();

      // EventLogger se suscribe al InternalEventDispatcher
      // Solo crear si no existe para evitar múltiples suscripciones
      if (!this.eventLoggerInstance) {
        this.eventLoggerInstance = new EventLogger(customVSCodeContext, dispatcher); // EventLogger ahora toma el dispatcher
        console.log('[ComponentFactory] EventLogger instance created and subscribed to InternalEventDispatcher.');
      }


      const memoryManager = new MemoryManager(extensionContext);
      const modelManager = new ModelManager(/* config */);
      const promptManager = new PromptManager();
      const toolRegistry = new ToolRegistry(/* extensionContext si es necesario */);
      const conversationManager = new ConversationManager();
      const reactGraph = new WindsurfGraph(modelManager, toolRegistry, promptManager, dispatcher); // ReActGraph podría usar el dispatcher para eventos internos

      this.applicationLogicServiceInstance = new ApplicationLogicService(
        customVSCodeContext,
        memoryManager,
        reactGraph,
        conversationManager,
        toolRegistry
      );
      console.log('[ComponentFactory] ApplicationLogicService instance created.');
    }
    return this.applicationLogicServiceInstance;
  }

  // Método para limpiar instancias si es necesario durante la desactivación
  public static dispose(): void {
    if (this.applicationLogicServiceInstance && typeof (this.applicationLogicServiceInstance as any).dispose === 'function') {
        (this.applicationLogicServiceInstance as any).dispose();
    }
    if (this.internalEventDispatcherInstance && typeof this.internalEventDispatcherInstance.dispose === 'function') {
        this.internalEventDispatcherInstance.dispose();
    }
    if (this.eventLoggerInstance && typeof (this.eventLoggerInstance as any).dispose === 'function') {
        (this.eventLoggerInstance as any).dispose();
    }
    // @ts-ignore // Para permitir reasignación a undefined
    this.applicationLogicServiceInstance = undefined;
    // @ts-ignore
    this.internalEventDispatcherInstance = undefined;
    // @ts-ignore
    this.eventLoggerInstance = undefined;
    console.log('[ComponentFactory] All instances disposed.');
  }
}