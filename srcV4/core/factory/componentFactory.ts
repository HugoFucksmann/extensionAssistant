// src/core/factory/componentFactory.ts

/**
 * Factory centralizada para la creación de componentes
 * Implementa el patrón singleton y facilita la inyección de dependencias
 */

import { IContainer } from '../interfaces/container.interface';
import { IToolRegistry } from '../interfaces/tool-registry.interface';
import { IModelManager } from '../interfaces/model-manager.interface';
import { IReActGraph } from '../interfaces/react-graph.interface';
import { IEventBus } from '../interfaces/event-bus.interface';

import { ToolRegistry } from '../../modules/tools';
import { ToolRegistryAdapter } from '../../modules/tools';

import { IMemoryManager, MemoryManagerAdapter } from '../../modules/memory';
import { MemoryManager } from '../../modules/memory/core';

import { ModelManager } from '../../models/modelManager';
import { ModelManagerAdapter } from '../../models/modelManagerAdapter';
import { ReActGraph } from '../../langgraph/reactGraph'; // Importación directa del grafo, si no usa adaptador
import { ReActGraphAdapter } from '../../langgraph/reactGraphAdapter';
import { EventBus } from '../../shared/events/core/eventBus'; // RUTA AJUSTADA: Importa la clase concreta EventBus

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
        const originalManager = new MemoryManager();
        const eventBus = this.getEventBus();
        this.memoryManager = new MemoryManagerAdapter(originalManager, eventBus);
      } else {
        // Crear una instancia directa (requeriría que MemoryManager implemente IMemoryManager)
        this.memoryManager = new MemoryManager() as unknown as IMemoryManager;
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
      // Para crear ReActGraph necesitamos otras dependencias
      // Estas instancias deben ser las "reales" o adaptadas, no nuevas instancias genéricas
      const modelManager = this.getModelManager(); // Obtener de la factory
      const toolRegistry = this.getToolRegistry(); // Obtener de la factory
      const promptManager = this.resolve('promptManager') || this.createPromptManager();

      // Importar la función createReActGraph para crear el grafo correctamente
      // CAMBIO CRÍTICO: La ruta a reactGraph.ts se ajusta
      const { createReActGraph } = require('../../langgraph/reactGraph'); // RUTA AJUSTADA
      const originalGraph = createReActGraph(promptManager, modelManager, toolRegistry);
      const eventBus = this.getEventBus();

      // Verificar si debemos usar el adaptador
      if (this.featureFlags.isEnabled(Feature.USE_REACT_GRAPH_ADAPTER)) {
        this.reactGraph = new ReActGraphAdapter(originalGraph, eventBus) as unknown as IReActGraph;
      } else {
        this.reactGraph = originalGraph as IReActGraph; // Directamente la implementación sin adaptador
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
      // EventBus ya implementa IEventBus, no necesitamos adaptador para este punto
      const concreteEventBus = EventBus.getInstance();
      // Aplicar debug mode basado en feature flag
      if (this.featureFlags.isEnabled(Feature.ENABLE_ADVANCED_LOGGING)) {
        concreteEventBus.setDebugMode(true);
      } else {
        concreteEventBus.setDebugMode(false);
      }
      this.eventBus = concreteEventBus;
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
    const { PromptManager } = require('../../prompts/promptManager'); // Asumiendo que prompts está en la raíz o nivel similar a core/
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