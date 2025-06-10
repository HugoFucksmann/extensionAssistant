import * as vscode from 'vscode';

import { ModelManager } from '../features/ai/ModelManager';
import { ToolRegistry } from '../features/tools/ToolRegistry';
import { allToolDefinitions } from '../features/tools/definitions';
import { ConversationManager } from './ConversationManager';
import { ApplicationLogicService } from './ApplicationLogicService';
import { InternalEventDispatcher } from './events/InternalEventDispatcher';
import { MemoryManager } from '../features/memory/MemoryManager';
import { PerformanceMonitor } from './monitoring/PerformanceMonitor';
import { CacheManager } from './utils/CacheManager';
import { ParallelExecutionService } from './utils/ParallelExecutionService';
import { Disposable } from './interfaces/Disposable';

// CAMBIO CLAVE: Importar el nuevo motor de ejecución y sus dependencias.
// El LangGraphEngine y SystemInitializer ya no son necesarios.
import { ExecutionEngine } from './execution/ExecutionEngine';
import { ConcreteExecutionEngine } from './execution/ConcreteExecutionEngine';
// ExecutionStateManager y CheckpointManager son gestionados internamente por ConcreteExecutionEngine,
// por lo que no necesitamos importarlos aquí directamente.

export class ComponentFactory {
  // CAMBIO CLAVE: Renombrado para mayor claridad, pero la instancia sigue siendo la misma.
  private static applicationLogicServiceInstance: ApplicationLogicService;
  private static internalEventDispatcherInstance: InternalEventDispatcher;
  private static toolRegistryInstance: ToolRegistry;
  private static modelManagerInstance: ModelManager;
  private static conversationManagerInstance: ConversationManager;
  private static memoryManagerInstance: MemoryManager;
  private static performanceMonitorInstance: PerformanceMonitor;
  private static cacheManagerInstance: CacheManager;
  private static parallelExecutionServiceInstance: ParallelExecutionService;

  // CAMBIO CLAVE: La instancia del nuevo motor de ejecución.
  private static executionEngineInstance: ExecutionEngine;

  // CAMBIO CLAVE: Las instancias de LangGraphEngine y sus dependencias directas se eliminan.
  // private static langGraphEngineInstance: LangGraphEngine;
  // private static appLogicService: ApplicationLogicService; // Redundante

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

  // CAMBIO CLAVE: El método getLangGraphEngine se elimina por completo. Es obsoleto.
  /*
  public static async getLangGraphEngine(extensionContext: vscode.ExtensionContext): Promise<LangGraphEngine> {
    // ...código eliminado...
  }
  */

  // CAMBIO CLAVE: Este es el método principal que se modifica para usar el nuevo motor.
  public static async getApplicationLogicService(context: vscode.ExtensionContext): Promise<ApplicationLogicService> {
    if (!this.applicationLogicServiceInstance) {
      // 1. Obtener el nuevo motor de ejecución en lugar del antiguo.
      const executionEngine = this.getExecutionEngine(context);

      // 2. Obtener las demás dependencias como antes.
      const conversationManager = this.getConversationManager();
      const toolRegistry = this.getToolRegistry();
      const dispatcher = this.getInternalEventDispatcher();

      // 3. Instanciar ApplicationLogicService con el nuevo motor.
      this.applicationLogicServiceInstance = new ApplicationLogicService(
        executionEngine, // <-- Se pasa el nuevo motor
        conversationManager,
        toolRegistry,
        dispatcher
      );
    }
    return this.applicationLogicServiceInstance;
  }

  public static getConversationManager(): ConversationManager {
    if (!this.conversationManagerInstance) {
      this.conversationManagerInstance = new ConversationManager(this.getInternalEventDispatcher());
    }
    return this.conversationManagerInstance;
  }

  // --- NUEVOS MÉTODOS DEL MOTOR DE EJECUCIÓN (ETAPA 1 COMPLETADA) ---

  /**
   * CAMBIO CLAVE: Implementación completa del getter para el nuevo motor de ejecución.
   * Crea y devuelve una instancia singleton de ConcreteExecutionEngine.
   * Este es el corazón de la nueva arquitectura.
   */
  public static getExecutionEngine(extensionContext: vscode.ExtensionContext): ExecutionEngine {
    if (!this.executionEngineInstance) {
      console.log('[ComponentFactory] Creating new ConcreteExecutionEngine instance...');
      const memoryManager = this.getMemoryManager(extensionContext);
      // ConcreteExecutionEngine se encarga de crear su propio StateManager y CheckpointManager.
      this.executionEngineInstance = new ConcreteExecutionEngine(memoryManager);
    }
    return this.executionEngineInstance;
  }

  /**
   * CAMBIO CLAVE: El nuevo sistema ya está disponible.
   */
  public static isExecutionEngineAvailable(): boolean {
    return true; // ¡El nuevo motor está vivo!
  }

  // CAMBIO CLAVE: Los getters para ExecutionStateManager y CheckpointManager se eliminan
  // porque son detalles de implementación interna del ConcreteExecutionEngine.
  // Esto simplifica la API de la fábrica.

  public static async dispose(): Promise<void> {
    const disposeSafely = async (component: Disposable | undefined) => {
      if (component && typeof component.dispose === 'function') {
        await Promise.resolve(component.dispose());
      }
    };

    // CAMBIO CLAVE: Asegurarse de que el nuevo motor se deseche correctamente.
    await disposeSafely(this.executionEngineInstance);
    this.executionEngineInstance = undefined as any;

    // Lógica de desecho existente
    await disposeSafely(this.applicationLogicServiceInstance);
    this.applicationLogicServiceInstance = undefined as any;

    // El langGraphEngineInstance ya no existe, por lo que se elimina de aquí.
    // await disposeSafely(this.langGraphEngineInstance);
    // this.langGraphEngineInstance = undefined as any;

    await disposeSafely(this.memoryManagerInstance);
    this.memoryManagerInstance = undefined as any;

    await disposeSafely(this.modelManagerInstance);
    this.modelManagerInstance = undefined as any;

    await disposeSafely(this.toolRegistryInstance);
    this.toolRegistryInstance = undefined as any;

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