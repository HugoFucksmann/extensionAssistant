// features/memory/adapters/memoryManagerAdapter.ts
/**
 * Adaptador para el MemoryManager que implementa la interfaz IMemoryManager
 * Permite utilizar el MemoryManager existente a través de la interfaz definida
 */

import { IMemoryManager, ConversationSummary, WindsurfState, HistoryEntry } from '../types'; // <--- CAMBIO: Importar desde tipos del módulo

import { MemoryManager } from '../core/memoryManager'; // <--- CAMBIO: Ruta de importación para MemoryManager
import { IEventBus } from '../../../core/adapters';
import { AgentState } from '../../../core/state/agent-state';


/**
 * Adaptador para el MemoryManager que implementa la interfaz IMemoryManager
 */
export class MemoryManagerAdapter implements IMemoryManager {
  private memoryManager: MemoryManager;
  private eventBus: IEventBus;

  /**
   * Constructor del adaptador
   * @param memoryManager Instancia del MemoryManager original
   * @param eventBus Bus de eventos para notificaciones
   */
  constructor(memoryManager: MemoryManager, eventBus: IEventBus) {
    this.memoryManager = memoryManager;
    this.eventBus = eventBus;
  }

  /**
   * Almacena un valor en la memoria a corto plazo
   * @param key Clave para almacenar el valor
   * @param value Valor a almacenar
   * @param chatId ID de la conversación
   */
  public storeShortTerm(key: string, value: any, chatId: string): void {
    this.memoryManager.storeShortTerm(key, value, chatId);
  }

  /**
   * Recupera un valor de la memoria a corto plazo
   * @param key Clave del valor a recuperar
   * @param chatId ID de la conversación
   * @returns El valor almacenado o undefined si no existe
   */
  public getShortTerm<T = any>(key: string, chatId: string): T | undefined {
    return this.memoryManager.getShortTerm<T>(key, chatId);
  }

  /**
   * Almacena un valor en la memoria a medio plazo
   * @param key Clave para almacenar el valor
   * @param value Valor a almacenar
   * @param chatId ID de la conversación
   * @param ttl Tiempo de vida en milisegundos (opcional)
   */
  public storeMediumTerm(key: string, value: any, chatId: string, ttl?: number): void {
    this.memoryManager.storeMediumTerm(key, value, chatId);
    // Nota: El MemoryManager actual no soporta TTL, se podría implementar en el futuro
  }

  /**
   * Recupera un valor de la memoria a medio plazo
   * @param key Clave del valor a recuperar
   * @param chatId ID de la conversación
   * @returns El valor almacenado o undefined si no existe o ha expirado
   */
  public getMediumTerm<T = any>(key: string, chatId: string): T | undefined {
    return this.memoryManager.getMediumTerm<T>(key, chatId);
  }

  /**
   * Almacena una conversación completa
   * @param chatId ID de la conversación
   * @param state Estado de la conversación
   */
  public async storeConversation(chatId: string, state: AgentState): Promise<void> {
    // Convertir el AgentState al formato WindsurfState que espera el MemoryManager actual
    const windsurfState: WindsurfState = this.convertToWindsurfState(state);

    // Almacenar usando el MemoryManager original
    await this.memoryManager.storeConversation(chatId, windsurfState);

    this.eventBus.debug(`[MemoryManagerAdapter] Stored conversation for chat ${chatId}`);
  }

  /**
   * Recupera una conversación completa
   * @param chatId ID de la conversación
   * @returns Estado de la conversación o null si no existe
   */
  public async loadConversation(chatId: string): Promise<AgentState | null> {
    // Intentar recuperar el estado de la conversación de la memoria a corto plazo
    const windsurfState = this.memoryManager.getShortTerm<WindsurfState>('lastState', chatId);

    if (!windsurfState) {
      return null;
    }

    // Convertir el WindsurfState al formato AgentState
    return this.convertToAgentState(windsurfState, chatId);
  }

  /**
   * Genera un resumen de la conversación
   * @param chatId ID de la conversación
   * @returns Resumen de la conversación
   */
  public async summarizeConversation(chatId: string): Promise<ConversationSummary> {
    // Recuperar el estado de la conversación
    const windsurfState = this.memoryManager.getShortTerm<WindsurfState>('lastState', chatId);

    if (!windsurfState) {
      return {
        objective: '',
        keyPoints: [],
        relevantContext: '',
        timestamp: Date.now()
      };
    }

    // Extraer insights del estado
    const insights = this.extractInsightsFromState(windsurfState);

    return {
      objective: windsurfState.objective || '',
      keyPoints: insights,
      relevantContext: JSON.stringify(windsurfState.extractedEntities || {}),
      timestamp: Date.now()
    };
  }

  /**
   * Elimina una conversación
   * @param chatId ID de la conversación
   */
  public async clearConversation(chatId: string): Promise<void> {
    this.memoryManager.clearConversationMemory(chatId);
    this.eventBus.debug(`[MemoryManagerAdapter] Cleared conversation for chat ${chatId}`);
  }

  /**
   * Convierte un AgentState al formato WindsurfState
   * @param state Estado del agente
   * @returns Estado en formato WindsurfState
   */
  private convertToWindsurfState(state: AgentState): WindsurfState {
    // Extraer el último mensaje del usuario
    const userMessage = state.messages.find(m => m.role === 'user')?.content || '';

    // Extraer la última respuesta del asistente
    const assistantMessage = state.messages.find(m => m.role === 'assistant')?.content || '';

    // Crear un historial de acciones a partir de toolExecutions
    const history: HistoryEntry[] = (state.toolExecutions || []).map(tool => {
      return {
        phase: 'action',
        timestamp: tool.timestamp,
        data: {
          input: tool.input,
          output: tool.output
        },
        iteration: 1
      };
    });

    // Añadir razonamientos si existen
    if (state.reasoning && state.reasoning.length > 0) {
      state.reasoning.forEach((reasoning, index) => {
        history.push({
          phase: 'reasoning',
          timestamp: Date.now() - (state.reasoning!.length - index) * 1000,
          data: { reasoning },
          iteration: 1
        });
      });
    }

    // Añadir reflexiones si existen
    if (state.reflections && state.reflections.length > 0) {
      state.reflections.forEach((reflection, index) => {
        history.push({
          phase: 'reflection',
          timestamp: Date.now() - (state.reflections!.length - index) * 1000,
          data: {
            insights: [reflection],
            success: true
          },
          iteration: 1
        });
      });
    }

    return {
      chatId: state.chatId,
      objective: state.context.objective || userMessage,
      userMessage,
      response: assistantMessage,
      history,
      extractedEntities: state.context.entities || {},
      completionStatus: 'completed',
      metadata: state.metadata || {},
      iterationCount: state.metadata?.iterationCount || 1,
      maxIterations: state.metadata?.maxIterations || 15
    };
  }

  /**
   * Convierte un WindsurfState al formato AgentState
   * @param state Estado en formato WindsurfState
   * @param chatId ID de la conversación
   * @returns Estado del agente
   */
  private convertToAgentState(state: WindsurfState, chatId: string): AgentState {
    // Crear mensajes a partir del historial
    const messages = [];

    // Añadir mensaje del usuario
    if (state.userMessage) {
      messages.push({
        role: 'user' as 'user',
        content: state.userMessage,
        timestamp: state.metadata.startTime || Date.now() - 60000
      });
    }

    // Añadir respuesta del asistente
    if (state.response) {
      messages.push({
        role: 'assistant' as 'assistant',
        content: state.response,
        timestamp: state.metadata.endTime || Date.now()
      });
    }

    // Extraer herramientas ejecutadas
    const toolExecutions = state.history
      .filter(entry => entry.phase === 'action')
      .map(entry => {
        return {
          toolName: entry.data.input?.tool || 'unknown',
          input: entry.data.input || {},
          output: entry.data.output || {},
          timestamp: entry.timestamp,
          success: true
        };
      });

    // Extraer razonamientos
    const reasoning = state.history
      .filter(entry => entry.phase === 'reasoning')
      .map(entry => entry.data.reasoning || '');

    // Extraer reflexiones
    const reflections = state.history
      .filter(entry => entry.phase === 'reflection')
      .flatMap(entry => entry.data.insights || []);

    return {
      chatId,
      messages,
      currentStep: 'completed',
      context: {
        objective: state.objective,
        entities: state.extractedEntities
      },
      userMessage: state.userMessage,
      finalResponse: state.response,
      toolExecutions,
      reasoning,
      reflections,
      startTime: state.metadata.startTime,
      lastUpdateTime: state.metadata.endTime || Date.now(),
      metadata: state.metadata
    };
  }

  /**
   * Extrae insights del estado de la conversación
   * @param state Estado de la conversación
   * @returns Array de insights
   */
  private extractInsightsFromState(state: WindsurfState): string[] {
    const insights: string[] = [];

    // Extraer insights de las reflexiones
    state.history
      .filter(entry => entry.phase === 'reflection')
      .forEach(entry => {
        if (entry.data.insights && Array.isArray(entry.data.insights)) {
          insights.push(...entry.data.insights);
        }
      });

    return insights;
  }
}