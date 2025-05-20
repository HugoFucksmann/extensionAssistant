/**
 * Gestor de conversaciones para la arquitectura Windsurf
 * Implementa la lógica de gestión de conversaciones y delega en los componentes especializados
 */

import { IConversationManager } from '../interfaces/conversation-manager.interface';
import { IEventBus } from '../interfaces/event-bus.interface';
import { IMemoryManager } from '../interfaces/memory-manager.interface';
import { IReActGraph } from '../interfaces/react-graph.interface';
import { IToolRegistry } from '../interfaces/tool-registry.interface';
import { AgentState, createInitialAgentState, updateAgentState, addMessage } from '../state/agent-state';
import { EventType } from '../../events/eventTypes';

/**
 * Implementación del gestor de conversaciones
 */
export class ConversationManager implements IConversationManager {
  // Mapa de conversaciones activas
  private activeConversations: Map<string, AgentState> = new Map();
  
  /**
   * Constructor del gestor de conversaciones
   * @param memoryManager Gestor de memoria
   * @param reactGraph Grafo ReAct
   * @param eventBus Bus de eventos
   * @param toolRegistry Registro de herramientas
   */
  constructor(
    private memoryManager: IMemoryManager,
    private reactGraph: IReActGraph,
    private eventBus: IEventBus,
    private toolRegistry: IToolRegistry
  ) {
    this.eventBus.debug('[ConversationManager] Initialized');
  }
  
  /**
   * Procesa un mensaje del usuario y ejecuta el ciclo ReAct
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
    this.eventBus.debug(`[ConversationManager:${chatId}] Processing message: "${userMessage.substring(0, 50)}..."`);
    
    // Emitir evento de inicio de conversación
    this.eventBus.emit(EventType.CONVERSATION_STARTED, { 
      chatId, 
      userMessage 
    });
    
    // Enriquecer los datos de contexto con información del proyecto si está disponible
    try {
      if (!contextData.projectContext && this.toolRegistry) {
        const projectInfo = await this.toolRegistry.executeTool('getProjectInfo', {});
        if (projectInfo.success) {
          contextData.projectContext = projectInfo.data;
        }
      }
    } catch (error) {
      this.eventBus.debug(`[ConversationManager:${chatId}] Error getting project info:`, error);
      // No interrumpir el flujo si falla la obtención de información del proyecto
    }
    
    // Inicializar o recuperar el estado de la conversación
    let state = await this.getOrCreateConversationState(chatId, userMessage, contextData);
    
    try {
      // Adaptar el estado al formato esperado por el grafo ReAct
      // Nota: Esta adaptación es temporal hasta que se refactorice completamente el grafo ReAct
      const reactState = this.adaptToReActState(state);
      
      // Ejecutar el grafo ReAct
      const result = await this.reactGraph.runGraph(reactState);
      
      // Actualizar el estado con el resultado
      state = this.updateStateFromResult(state, result);
      
      // Guardar el estado actualizado
      this.activeConversations.set(chatId, state);
      
      // Guardar en memoria persistente
      await this.memoryManager.storeConversation(chatId, state);
      
      // Extraer la respuesta final
      const finalResponse = result.output || 'No se pudo generar una respuesta.';
      
      // Emitir evento de fin de conversación
      this.eventBus.emit(EventType.CONVERSATION_ENDED, { 
        chatId, 
        success: true,
        response: finalResponse,
        duration: (state.lastUpdateTime || 0) - (state.startTime || 0)
      });
      
      return finalResponse;
    } catch (error: any) {
      this.eventBus.debug(`[ConversationManager:${chatId}] Error processing message:`, error);
      
      // Emitir evento de error
      this.eventBus.emit(EventType.ERROR_OCCURRED, { 
        chatId, 
        error: error.message || 'Unknown error',
        stack: error.stack,
        source: 'ConversationManager'
      });
      
      // Devolver un mensaje de error amigable
      return 'Lo siento, ha ocurrido un error al procesar tu mensaje. Por favor, inténtalo de nuevo.';
    }
  }
  
  /**
   * Obtiene el estado actual de una conversación
   * @param chatId Identificador único de la conversación
   * @returns Estado actual de la conversación o null si no existe
   */
  public async getConversationState(chatId: string): Promise<AgentState | null> {
    // Primero intentar obtener de la memoria activa
    let state = this.activeConversations.get(chatId);
    
    // Si no existe en memoria activa, intentar cargar desde memoria persistente
    if (!state) {
      const loadedState = await this.memoryManager.loadConversation(chatId);
      state = loadedState || undefined;
    }
    
    return state || null;
  }
  
  /**
   * Finaliza una conversación y libera recursos
   * @param chatId Identificador único de la conversación
   */
  public async endConversation(chatId: string): Promise<void> {
    // Eliminar de la memoria activa
    this.activeConversations.delete(chatId);
    
    // Emitir evento de fin de conversación
    this.eventBus.emit(EventType.CONVERSATION_ENDED, { 
      chatId, 
      success: true
    });
    
    this.eventBus.debug(`[ConversationManager:${chatId}] Conversation ended`);
  }
  
  /**
   * Cancela la ejecución actual de una conversación
   * @param chatId Identificador único de la conversación
   */
  public async cancelExecution(chatId: string): Promise<void> {
    // Cancelar la ejecución en el grafo ReAct
    this.reactGraph.cancelExecution(chatId);
    
    // Emitir evento de cancelación
    this.eventBus.emit(EventType.CONVERSATION_ENDED, { 
      chatId, 
      success: false,
      // Usar metadata para almacenar información adicional
      metadata: { canceled: true }
    });
    
    this.eventBus.debug(`[ConversationManager:${chatId}] Execution canceled`);
  }
  
  /**
   * Obtiene o crea el estado de una conversación
   * @param chatId Identificador único de la conversación
   * @param userMessage Mensaje del usuario
   * @param contextData Datos adicionales de contexto
   * @returns Estado de la conversación
   */
  private async getOrCreateConversationState(
    chatId: string,
    userMessage: string,
    contextData: Record<string, any>
  ): Promise<AgentState> {
    // Intentar obtener el estado existente
    let state = await this.getConversationState(chatId);
    
    if (state) {
      // Actualizar el estado existente con el nuevo mensaje
      state = addMessage(state, 'user', userMessage);
      state = updateAgentState(state, {
        currentStep: 'initialAnalysis',
        context: {
          ...state.context,
          ...contextData
        }
      });
    } else {
      // Crear un nuevo estado
      state = createInitialAgentState(chatId, userMessage, contextData);
    }
    
    // Guardar en memoria activa
    this.activeConversations.set(chatId, state);
    
    return state;
  }
  
  /**
   * Adapta el estado del agente al formato esperado por el grafo ReAct
   * Esta función es temporal hasta que se refactorice completamente el grafo ReAct
   * @param state Estado del agente
   * @returns Estado en formato ReAct
   */
  private adaptToReActState(state: AgentState): any {
    // Por ahora, simplemente pasamos el estado tal cual
    // En el futuro, se implementará una conversión adecuada
    return {
      userMessage: state.currentMessage || state.messages[state.messages.length - 1].content,
      metadata: {
        chatId: state.chatId,
        userId: state.userId,
        contextData: state.context,
        startTime: state.startTime
      },
      intermediateSteps: state.intermediateSteps || [],
      currentNode: state.currentNode
    };
  }
  
  /**
   * Actualiza el estado del agente con el resultado del grafo ReAct
   * @param state Estado actual
   * @param result Resultado del grafo ReAct
   * @returns Estado actualizado
   */
  private updateStateFromResult(state: AgentState, result: any): AgentState {
    // Añadir la respuesta como mensaje del asistente
    let updatedState = addMessage(state, 'assistant', result.output || '');
    
    // Actualizar el estado con los datos del resultado
    updatedState = updateAgentState(updatedState, {
      finalResponse: result.output,
      intermediateSteps: result.intermediateSteps,
      currentStep: 'completed',
      metadata: {
        ...updatedState.metadata,
        ...result.metadata,
        executionInfo: result.executionInfo
      }
    });
    
    return updatedState;
  }
}
