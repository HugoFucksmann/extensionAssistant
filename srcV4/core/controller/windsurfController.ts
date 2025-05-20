/**
 * Controlador principal de la arquitectura Windsurf (Refactorizado)
 * Implementa el patrón singleton y delega en el ConversationManager
 */

import * as vscode from 'vscode';
import { VSCodeContext } from '../types';
import { IEventBus } from '../interfaces/event-bus.interface';
import { IConversationManager } from '../interfaces/conversation-manager.interface';
import { EventType } from '../../events/eventTypes';
import { EventBusAdapter } from '../../events/eventBusAdapter';
import { ConversationManager } from '../conversation/conversationManager';
import { IMemoryManager } from '../interfaces/memory-manager.interface';
import { IModelManager } from '../interfaces/model-manager.interface';
import { IReActGraph } from '../interfaces/react-graph.interface';
import { IToolRegistry } from '../interfaces/tool-registry.interface';
import { MemoryManager } from '../../memory/memoryManager';
import { ModelManager } from '../../models/modelManager';
import { ReActGraph, createReActGraph } from '../../langgraph/reactGraph';
import { ToolRegistry } from '../../tools/toolRegistry';

/**
 * Controlador principal para la arquitectura Windsurf
 * Implementa el patrón singleton
 */
export class WindsurfController {
  private static instance: WindsurfController;
  
  private vscodeContext: VSCodeContext;
  private eventBus: IEventBus;
  private conversationManager: IConversationManager;
  
  // Componentes subyacentes (mantenidos para compatibilidad)
  private memoryManager: IMemoryManager;
  private modelManager: IModelManager;
  private reactGraph: IReActGraph;
  private toolRegistry: IToolRegistry;
  
  /**
   * Constructor privado para implementar el patrón singleton
   */
  private constructor(context: VSCodeContext) {
    this.vscodeContext = context;
    
    // Inicializar el bus de eventos usando el adaptador
    this.eventBus = EventBusAdapter.getInstance();
    
    // Inicializar componentes
    this.memoryManager = new MemoryManager();
    this.modelManager = new ModelManager();
    this.toolRegistry = new ToolRegistry();
    
    // Inicializar el grafo ReAct
    // Nota: Temporalmente usamos el EventBus original hasta que se refactorice completamente el grafo ReAct
    const defaultModel = 'gemini-pro';
    // Usamos require para obtener el EventBus original sin importarlo directamente
    const originalEventBus = require('../../events/eventBus').EventBus.getInstance();
    this.reactGraph = createReActGraph(defaultModel, originalEventBus);
    
    // Pasar el toolRegistry al grafo ReAct
    // Usamos casting explícito a unknown primero para evitar errores de tipo
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
