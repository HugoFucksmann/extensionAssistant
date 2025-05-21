// src/core/factory/componentFactory.ts
/**
 * Factory centralizada para la creación de componentes
 * Implementa el patrón singleton y facilita la inyección de dependencias
 */

import { IContainer } from '../interfaces/container.interface';
import { IToolRegistry } from '../interfaces/tool-registry.interface';
// import { IMemoryManager } from '../interfaces/memory-manager.interface'; // <--- ELIMINADO
import { IModelManager } from '../interfaces/model-manager.interface';
import { IReActGraph } from '../interfaces/react-graph.interface';
import { IEventBus } from '../interfaces/event-bus.interface';

import { ToolRegistry } from '../../tools/toolRegistry';
import { ToolRegistryAdapter } from '../../tools/toolRegistryAdapter';

// --- CAMBIOS PARA MEMORY MODULE ---
import { IMemoryManager, MemoryManagerAdapter } from '../../features/memory'; // <--- NUEVA IMPORTACIÓN
import { MemoryManager } from '../../features/memory/core'; // <--- NUEVA IMPORTACIÓN para la clase base
// --- FIN CAMBIOS PARA MEMORY MODULE ---

import { ModelManager } from '../../models/modelManager';
import { ModelManagerAdapter } from '../../models/modelManagerAdapter';
import { ReActGraph } from '../../langgraph/reactGraph';
import { ReActGraphAdapter } from '../../langgraph/reactGraphAdapter';
import { EventBus } from '../../events/eventBus';

import { FeatureFlags, Feature } from '../featureFlags';

/**
 * Factory centralizada para la creación de componentes
 * Implementa el patrón singleton
 */
export class ComponentFactory implements IContainer {
  private static instance: ComponentFactory;
  private featureFlags: FeatureFlags;
  private registry: Map<string, any> = new Map();

  // Instancias de componentes
  private toolRegistry?: IToolRegistry;
  private memoryManager?: IMemoryManager;
  private modelManager?: IModelManager;
  private reactGraph?: IReActGraph;
  private eventBus?: IEventBus;

  /**
   * Constructor privado para implementar el patrón singleton
   */
  private constructor() {
    this.featureFlags = FeatureFlags.getInstance();
  }

  /**
   * Obtiene la instancia única de ComponentFactory
   */
  public static getInstance(): ComponentFactory {
    if (!ComponentFactory.instance) {
      ComponentFactory.instance = new ComponentFactory();
    }

    return ComponentFactory.instance;
  }

  /**
   * Obtiene el registro de herramientas
   * @returns Instancia de IToolRegistry
   */
  public getToolRegistry(): IToolRegistry {
    if (!this.toolRegistry) {
      // Verificar si debemos usar el adaptador
      if (this.featureFlags.isEnabled(Feature.USE_TOOL_REGISTRY_ADAPTER)) {
        const originalRegistry = new ToolRegistry();
        const eventBus = this.getEventBus();
        // Conversión segura a través de unknown
        this.toolRegistry = new ToolRegistryAdapter(originalRegistry, eventBus) as unknown as IToolRegistry;
      } else {
        // Crear una instancia directa (requeriría que ToolRegistry implemente IToolRegistry)
        this.toolRegistry = new ToolRegistry() as unknown as IToolRegistry;
      }
    }

    return this.toolRegistry;
  }

  /**
   * Obtiene el gestor de memoria
   * @returns Instancia de IMemoryManager
   */
  public getMemoryManager(): IMemoryManager {
    if (!this.memoryManager) {
      // Verificar si debemos usar el adaptador
      if (this.featureFlags.isEnabled(Feature.USE_MEMORY_MANAGER_ADAPTER)) {
        const originalManager = new MemoryManager(); // <--- Instancia desde la nueva ruta
        const eventBus = this.getEventBus();
        this.memoryManager = new MemoryManagerAdapter(originalManager, eventBus); // <--- Instancia desde la nueva ruta
      } else {
        // Crear una instancia directa (requeriría que MemoryManager implemente IMemoryManager)
        this.memoryManager = new MemoryManager() as unknown as IMemoryManager; // <--- Instancia desde la nueva ruta
      }
    }

    return this.memoryManager;
  }

  /**
   * Obtiene el gestor de modelos
   * @returns Instancia de IModelManager
   */
  public getModelManager(): IModelManager {
    if (!this.modelManager) {
      // Verificar si debemos usar el adaptador
      if (this.featureFlags.isEnabled(Feature.USE_MODEL_MANAGER_ADAPTER)) {
        const originalManager = new ModelManager();
        const eventBus = this.getEventBus();
        this.modelManager = new ModelManagerAdapter(originalManager, eventBus);
      } else {
        // Crear una instancia directa (requeriría que ModelManager implemente IModelManager)
        this.modelManager = new ModelManager() as unknown as IModelManager;
      }
    }

    return this.modelManager;
  }

  /**
   * Obtiene el grafo ReAct
   * @returns Instancia de IReActGraph
   */
  public getReActGraph(): IReActGraph {
    if (!this.reactGraph) {
      // Verificar si debemos usar el adaptador
      if (this.featureFlags.isEnabled(Feature.USE_REACT_GRAPH_ADAPTER)) {
        // Para crear ReActGraph necesitamos otras dependencias
        const modelManager = new ModelManager();
        const toolRegistry = new ToolRegistry();
        const promptManager = this.resolve('promptManager') || this.createPromptManager();

        // Importar la función createReActGraph para crear el grafo correctamente
        const { createReActGraph } = require('../../langgraph/reactGraph');
        const originalGraph = createReActGraph(promptManager, modelManager, toolRegistry);
        const eventBus = this.getEventBus();

        this.reactGraph = new ReActGraphAdapter(originalGraph, eventBus) as unknown as IReActGraph;
      } else {
        // Crear una instancia directa (requeriría que ReActGraph implemente IReActGraph)
        const modelManager = new ModelManager();
        const toolRegistry = new ToolRegistry();
        const promptManager = this.resolve('promptManager') || this.createPromptManager();

        // Importar la función createReActGraph para crear el grafo correctamente
        const { createReActGraph } = require('../../langgraph/reactGraph');
        this.reactGraph = createReActGraph(promptManager, modelManager, toolRegistry) as IReActGraph;
      }
    }

    return this.reactGraph;
  }

  /**
   * Obtiene el bus de eventos
   * @returns Instancia de IEventBus
   */
  public getEventBus(): IEventBus {
    if (!this.eventBus) {
      // EventBus ya implementa IEventBus, no necesitamos adaptador
      this.eventBus = EventBus.getInstance();
    }

    return this.eventBus;
  }

  /**
   * Registra una implementación personalizada para una dependencia
   * @param key Identificador de la dependencia
   * @param implementation Implementación de la dependencia
   */
  public register<T>(key: string, implementation: T): void {
    this.registry.set(key, implementation);
  }

  /**
   * Obtiene una implementación personalizada
   * @param key Identificador de la dependencia
   * @returns Implementación de la dependencia o undefined si no existe
   */
  public resolve<T>(key: string): T | undefined {
    return this.registry.get(key) as T | undefined;
  }

  /**
   * Crea una instancia del PromptManager
   * @returns Instancia del PromptManager
   */
  private createPromptManager() {
    // Importación dinámica para evitar dependencias circulares
    const { PromptManager } = require('../../prompts/promptManager');
    return new PromptManager();
  }

  /**
   * Restablece todas las instancias
   * Útil para testing o cuando cambian los feature flags
   */
  public reset(): void {
    this.toolRegistry = undefined;
    this.memoryManager = undefined;
    this.modelManager = undefined;
    this.reactGraph = undefined;
    this.eventBus = undefined;
    this.registry.clear();
  }
}