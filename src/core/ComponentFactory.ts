// src/core/ComponentFactory.ts
import * as vscode from 'vscode';

import { ModelManager } from '../features/ai/ModelManager';
import { ToolRegistry } from '../features/tools/ToolRegistry';
import { allToolDefinitions } from '../features/tools/definitions';
import { ConversationManager } from './ConversationManager';
import { ApplicationLogicService } from './ApplicationLogicService';
import { InternalEventDispatcher } from './events/InternalEventDispatcher';
import { OptimizedReActEngine } from '../features/ai/core/OptimizedReActEngine'; // Sigue siendo necesario para el Adapter
import { MemoryManager } from '../features/memory/MemoryManager';

// NUEVAS IMPORTACIONES
import { LangGraphAdapter } from './langgraph/LangGraphAdapter';
import { PerformanceMonitor } from './monitoring/PerformanceMonitor';
import { Disposable } from './interfaces/Disposable'; // Asegúrate que esta interfaz existe

// Definir un tipo para los motores que el adaptador puede manejar
// Esto es más para claridad, el adaptador ya instancia internamente
// type AgentExecutionEngine = OptimizedReActEngine /* | LangGraphEngine */; // LangGraphEngine se añadirá en Etapa 1

export class ComponentFactory {
  private static applicationLogicServiceInstance: ApplicationLogicService;
  private static internalEventDispatcherInstance: InternalEventDispatcher;
  private static toolRegistryInstance: ToolRegistry;
  private static modelManagerInstance: ModelManager;
  // private static optimizedReActEngineInstance: OptimizedReActEngine; // Ya no se gestiona como singleton principal aquí
  private static conversationManagerInstance: ConversationManager;
  private static memoryManagerInstance: MemoryManager;

  // NUEVAS INSTANCIAS
  private static performanceMonitorInstance: PerformanceMonitor;
  private static langGraphAdapterInstance: LangGraphAdapter;


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

  // NUEVO: PerformanceMonitor
  public static getPerformanceMonitor(): PerformanceMonitor {
    if (!this.performanceMonitorInstance) {
      this.performanceMonitorInstance = new PerformanceMonitor();
    }
    return this.performanceMonitorInstance;
  }

  // MODIFICADO: Este método ahora devuelve el LangGraphAdapter
  public static getAgentExecutionEngine(extensionContext: vscode.ExtensionContext): LangGraphAdapter {
    if (!this.langGraphAdapterInstance) {
      const modelManager = this.getModelManager();
      const toolRegistry = this.getToolRegistry();
      const dispatcher = this.getInternalEventDispatcher();
      const memoryManager = this.getMemoryManager(extensionContext);
      const performanceMonitor = this.getPerformanceMonitor();

      this.langGraphAdapterInstance = new LangGraphAdapter(
        modelManager,
        toolRegistry,
        dispatcher,
        memoryManager,
        performanceMonitor
      );
    }
    return this.langGraphAdapterInstance;
  }

  // OptimizedReActEngine ya no se expone directamente como el motor principal, 
  // pero el Adapter lo necesita. Si otras partes del código lo necesitan directamente,
  // se podría mantener un getter, pero idealmente no.
  // public static getOptimizedReActEngine(extensionContext: vscode.ExtensionContext): OptimizedReActEngine {
  //   // ... (lógica anterior si se necesita mantener)
  // }


  public static getApplicationLogicService(extensionContext: vscode.ExtensionContext): ApplicationLogicService {
    if (!this.applicationLogicServiceInstance) {
      // USA EL NUEVO MÉTODO getAgentExecutionEngine
      const agentEngine = this.getAgentExecutionEngine(extensionContext);
      const toolRegistry = this.getToolRegistry(); // Sigue siendo útil para invocar herramientas directamente
      const conversationManager = this.getConversationManager();
      const memoryManager = this.getMemoryManager(extensionContext);

      this.applicationLogicServiceInstance = new ApplicationLogicService(
        memoryManager,
        agentEngine, // Pasa el adaptador aquí
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
    // Eliminar OptimizedReActEngine si se gestionaba aquí
    // if (this.optimizedReActEngineInstance && typeof this.optimizedReActEngineInstance.dispose === 'function') {
    //   this.optimizedReActEngineInstance.dispose();
    //   (this.optimizedReActEngineInstance as any) = null;
    // }

    // NUEVO: Disponer LangGraphAdapter
    if (this.langGraphAdapterInstance && typeof this.langGraphAdapterInstance.dispose === 'function') {
      this.langGraphAdapterInstance.dispose();
      (this.langGraphAdapterInstance as any) = null;
    }

    // NUEVO: Disponer PerformanceMonitor (si tuviera un método dispose)
    if (this.performanceMonitorInstance && typeof (this.performanceMonitorInstance as any).reset === 'function') {
      (this.performanceMonitorInstance as any).reset(); // o dispose si se implementa
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

    if (this.toolRegistryInstance) { // ToolRegistry no tiene dispose actualmente
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