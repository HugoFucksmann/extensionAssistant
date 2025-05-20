/**
 * Interfaz para el gestor de conversaciones de la arquitectura Windsurf
 * Define el contrato que debe implementar cualquier gestor de conversaciones
 */

import { AgentState } from '../state/agent-state';

export interface IConversationManager {
  /**
   * Procesa un mensaje del usuario y ejecuta el ciclo ReAct
   * @param chatId Identificador único de la conversación
   * @param userMessage Mensaje del usuario
   * @param contextData Datos adicionales de contexto
   * @returns Respuesta generada por el agente
   */
  processUserMessage(
    chatId: string,
    userMessage: string,
    contextData?: Record<string, any>
  ): Promise<string>;

  /**
   * Obtiene el estado actual de una conversación
   * @param chatId Identificador único de la conversación
   * @returns Estado actual de la conversación o null si no existe
   */
  getConversationState(chatId: string): Promise<AgentState | null>;

  /**
   * Finaliza una conversación y libera recursos
   * @param chatId Identificador único de la conversación
   */
  endConversation(chatId: string): Promise<void>;

  /**
   * Cancela la ejecución actual de una conversación
   * @param chatId Identificador único de la conversación
   */
  cancelExecution(chatId: string): Promise<void>;
}
