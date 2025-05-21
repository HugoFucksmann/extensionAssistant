// src/core/windsurfController.ts

/**
 * Controlador principal de la arquitectura Windsurf (Refactorizado)
 * Implementa el patrón singleton y delega en el ConversationManager
 */

import { VSCodeContext } from '../types';
import { IEventBus } from '../interfaces/event-bus.interface';
import { IConversationManager } from '../interfaces/conversation-manager.interface';
import { ConversationManager } from '../conversation/conversationManager';
import { EventEmitter } from 'events';

import { IMemoryManager, MemoryManagerAdapter } from '../../features/memory';
import { MemoryManager } from '../../features/memory/core';

import { IModelManager } from '../interfaces/model-manager.interface';
import { ModelManager } from '../../models/modelManager';
import { ModelManagerAdapter } from '../../models/modelManagerAdapter';

import { IReActGraph } from '../interfaces/react-graph.interface';
import { createReActGraph } from '../../langgraph/reactGraph';
import { ReActGraphAdapter } from '../../langgraph/reactGraphAdapter';

import { IToolRegistry } from '../interfaces/tool-registry.interface';
import { ToolRegistry } from '../../tools/toolRegistry';
import { ToolRegistryAdapter } from '../../tools/toolRegistryAdapter';
import { ComponentFactory } from '../factory/componentFactory';
import { EventType } from '../../shared/events';


/**
 * Controlador principal para la arquitectura Windsurf
 * Implementa el patrón singleton
 */
export class WindsurfController {
  private static instance: WindsurfController;

  private vscodeContext: VSCodeContext;
  private eventBus: IEventBus;
  private conversationManager: IConversationManager;

  /**
   * Expone el eventBus como 'events' para compatibilidad con código existente
   */
  public get events(): EventEmitter {
    return this.eventBus as unknown as EventEmitter;
  }

  // Componentes subyacentes (mantenidos para compatibilidad)
  private memoryManager: IMemoryManager;
  private modelManager: IModelManager;
  private reactGraph: IReActGraph;
  private toolRegistry: IToolRegistry;

  // Añadir una referencia a la ComponentFactory
  private componentFactory: ComponentFactory;

  /**
   * Constructor privado para implementar el patrón singleton
   */
  private constructor(context: VSCodeContext) {
    this.vscodeContext = context;

    // Obtener la instancia de ComponentFactory
    this.componentFactory = ComponentFactory.getInstance();

    // Inicializar el bus de eventos usando la factory
    this.eventBus = this.componentFactory.getEventBus();

    // Inicializar componentes base con el eventBus
    const memoryManagerBase = new MemoryManager();
    const modelManagerBase = new ModelManager();
    const toolRegistryBase = new ToolRegistry();

    // Crear adaptadores que implementan las interfaces requeridas
    // Si la factory se encarga completamente de inyectar los ADAPTADORES, esta parte podría cambiar.
    // Pero para asegurar que el controlador tenga instancias válidas, los inicializamos aquí.
    this.memoryManager = new MemoryManagerAdapter(memoryManagerBase, this.eventBus);
    this.modelManager = new ModelManagerAdapter(modelManagerBase, this.eventBus);
    this.toolRegistry = new ToolRegistryAdapter(toolRegistryBase, this.eventBus);

    // Inicializar el grafo ReAct
    const defaultModel = 'gemini-pro';
    // Usamos require para obtener el EventBus original sin importarlo directamente
    // CAMBIO CRÍTICO: La ruta a eventBus.ts se ajusta para Shared/events/core/
    const originalEventBus = require('../../shared/events/core/eventBus').EventBus.getInstance(); // RUTA AJUSTADA
    const reactGraphBase = createReActGraph(defaultModel, originalEventBus);

    // Crear el adaptador para el grafo ReAct
    this.reactGraph = new ReActGraphAdapter(reactGraphBase, this.eventBus);

    // Pasar el toolRegistry al grafo ReAct
    if ('setToolRegistry' in this.reactGraph) {
      (this.reactGraph as any).setToolRegistry(this.toolRegistry);
    }

    // Inicializar el gestor de conversaciones
    this.conversationManager = new ConversationManager(
      this.memoryManager,
      this.reactGraph,
      this.eventBus,
      this.toolRegistry
    );

    this.eventBus.debug('[WindsurfController] Initialized with refactored architecture');
  }

  /**
   * Obtiene la instancia única del controlador
   */
  public static getInstance(context?: VSCodeContext): WindsurfController {
    if (!WindsurfController.instance) {
      if (!context) {
        throw new Error('VSCodeContext is required for initialization');
      }
      WindsurfController.instance = new WindsurfController(context);
    }
    return WindsurfController.instance;
  }

  /**
   * Procesa un mensaje del usuario
   * @param chatId Identificador único de la conversación
   * @param userMessage Mensaje del usuario
   * @param contextData Datos adicionales de contexto
   * @returns Respuesta generada por el agente
   */
  public async processUserMessage(
    chatId: string,
    userMessage: string,
    contextData: Record<string, any> = {}
  ): Promise<string> {
    try {
      // Delegar en el gestor de conversaciones
      return await this.conversationManager.processUserMessage(chatId, userMessage, contextData);
    } catch (error: any) {
      // Capturar errores no manejados
      this.eventBus.emit(EventType.ERROR_OCCURRED, {
        chatId,
        error: error.message || 'Unknown error',
        stack: error.stack,
        source: 'WindsurfController'
      });

      return 'Lo siento, ha ocurrido un error inesperado. Por favor, inténtalo de nuevo.';
    }
  }

  /**
   * Finaliza una conversación y libera recursos
   * @param chatId Identificador único de la conversación
   */
  public async clearConversation(chatId: string): Promise<void> {
    await this.conversationManager.endConversation(chatId);
  }

  /**
   * Cancela la ejecución actual de una conversación
   * @param chatId Identificador único de la conversación
   */
  public async cancelExecution(chatId: string): Promise<void> {
    await this.conversationManager.cancelExecution(chatId);
  }

  /**
   * Libera todos los recursos al desactivar la extensión
   */
  public dispose(): void {
    // Liberar recursos
    this.eventBus.debug('[WindsurfController] Disposing resources');
  }

  /**
   * Obtiene el bus de eventos
   * @returns Bus de eventos
   */
  public getEventBus(): IEventBus {
    return this.eventBus;
  }

  /**
   * Obtiene el gestor de conversaciones
   * @returns Gestor de conversaciones
   */
  public getConversationManager(): IConversationManager {
    return this.conversationManager;
  }
}