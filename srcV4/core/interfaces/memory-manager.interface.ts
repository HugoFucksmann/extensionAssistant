/**
 * Interfaz para el gestor de memoria de la arquitectura Windsurf
 * Define el contrato que debe implementar cualquier gestor de memoria
 */

import { AgentState } from '../state/agent-state';

export interface ConversationSummary {
  objective: string;
  keyPoints: string[];
  relevantContext: string;
  timestamp: number;
}

export interface IMemoryManager {
  /**
   * Almacena un valor en la memoria a corto plazo
   * @param key Clave para almacenar el valor
   * @param value Valor a almacenar
   * @param chatId ID de la conversación
   */
  storeShortTerm(key: string, value: any, chatId: string): void;

  /**
   * Recupera un valor de la memoria a corto plazo
   * @param key Clave del valor a recuperar
   * @param chatId ID de la conversación
   * @returns El valor almacenado o undefined si no existe
   */
  getShortTerm<T = any>(key: string, chatId: string): T | undefined;

  /**
   * Almacena un valor en la memoria a medio plazo
   * @param key Clave para almacenar el valor
   * @param value Valor a almacenar
   * @param chatId ID de la conversación
   * @param ttl Tiempo de vida en milisegundos (opcional)
   */
  storeMediumTerm(key: string, value: any, chatId: string, ttl?: number): void;

  /**
   * Recupera un valor de la memoria a medio plazo
   * @param key Clave del valor a recuperar
   * @param chatId ID de la conversación
   * @returns El valor almacenado o undefined si no existe o ha expirado
   */
  getMediumTerm<T = any>(key: string, chatId: string): T | undefined;

  /**
   * Almacena una conversación completa
   * @param chatId ID de la conversación
   * @param state Estado de la conversación
   */
  storeConversation(chatId: string, state: AgentState): Promise<void>;

  /**
   * Recupera una conversación completa
   * @param chatId ID de la conversación
   * @returns Estado de la conversación o null si no existe
   */
  loadConversation(chatId: string): Promise<AgentState | null>;

  /**
   * Genera un resumen de la conversación
   * @param chatId ID de la conversación
   * @returns Resumen de la conversación
   */
  summarizeConversation(chatId: string): Promise<ConversationSummary>;

  /**
   * Elimina una conversación
   * @param chatId ID de la conversación
   */
  clearConversation(chatId: string): Promise<void>;
}
