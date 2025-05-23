// src/features/memory/ChatMemoryManager.ts

/**
 * Gestor de memoria para la arquitectura Windsurf
 * Implementa un sistema de memoria jerárquica (corto, medio y largo plazo)
 */

import * as vscode from 'vscode';
import { LongTermStorage } from './LongTermStorage';
import { WindsurfState, HistoryEntry } from '@shared/types';

/**
 * Gestor centralizado de memoria
 * Maneja diferentes niveles de memoria para el agente Windsurf
 */
export class ChatMemoryManager {
  // Memoria a corto plazo (contexto inmediato)
  private shortTermMemory: Map<string, any>;
  
  // Memoria a medio plazo (contexto de la tarea actual)
  private mediumTermMemory: Map<string, any>;
  
  // Memoria a largo plazo (persistente entre sesiones)
  private longTermStorage: LongTermStorage;
  
  constructor(private context: vscode.ExtensionContext) { // Asegurarse de que el contexto se guarda para acceder a la configuración
    this.shortTermMemory = new Map();
    this.mediumTermMemory = new Map();
    this.longTermStorage = new LongTermStorage(context);
    
    console.log('[ChatMemoryManager] Initialized');
  }
  
  /**
   * Almacena un valor en la memoria a corto plazo
   * @param key Clave para almacenar el valor
   * @param value Valor a almacenar
   * @param chatId ID de la conversación (para aislar memorias entre conversaciones)
   */
  public storeShortTerm(key: string, value: any, chatId: string): void {
    this.shortTermMemory.set(`${chatId}:${key}`, value);
  }
  
  /**
   * Recupera un valor de la memoria a corto plazo
   * @param key Clave del valor a recuperar
   * @param chatId ID de la conversación
   * @returns El valor almacenado o undefined si no existe
   */
  public getShortTerm<T = any>(key: string, chatId: string): T | undefined {
    return this.shortTermMemory.get(`${chatId}:${key}`) as T | undefined;
  }
  
  /**
   * Almacena un valor en la memoria a medio plazo
   * @param key Clave para almacenar el valor
   * @param value Valor a almacenar
   * @param chatId ID de la conversación
   */
  public storeMediumTerm(key: string, value: any, chatId: string): void {
    this.mediumTermMemory.set(`${chatId}:${key}`, value);
  }
  
  /**
   * Recupera un valor de la memoria a medio plazo
   * @param key Clave del valor a recuperar
   * @param chatId ID de la conversación
   * @returns El valor almacenado o undefined si no existe
   */
  public getMediumTerm<T = any>(key: string, chatId: string): T | undefined {
    return this.mediumTermMemory.get(`${chatId}:${key}`) as T | undefined;
  }
  
  /**
   * Almacena una conversación completa en la memoria
   * Distribuye la información en los diferentes niveles de memoria según su relevancia
   * @param chatId ID de la conversación
   * @param state Estado final de la conversación
   */
  public async storeConversation(chatId: string, state: WindsurfState): Promise<void> {
    try {
      // Verificar si la persistencia de chat está habilitada en la configuración de VS Code
      const persistChat = vscode.workspace.getConfiguration('extensionAssistant').get<boolean>('persistChat', true); // Por defecto true
      
      // 1. Almacenar en memoria a corto plazo
      this.storeShortTerm('lastState', state, chatId);
      this.storeShortTerm('lastObjective', state.objective, chatId);
      
      // 2. Almacenar en memoria a medio plazo
      this.storeMediumTerm('conversationHistory', state.history, chatId);
      
      // 3. Almacenar insights relevantes en memoria a largo plazo (solo si la persistencia está habilitada)
      if (persistChat) { // AÑADIR CONDICIONAL
        const insights = this.extractInsightsFromState(state);
        if (insights.length > 0) {
          await this.longTermStorage.storeInsights(chatId, insights, {
            objective: state.objective,
            timestamp: Date.now()
          });
        }
        console.log(`[ChatMemoryManager] Stored conversation state for chat ${chatId} (persisted: ${persistChat})`); // ACTUALIZAR LOG
      } else {
        console.log(`[ChatMemoryManager] Stored conversation state for chat ${chatId} (persistence disabled)`); // ACTUALIZAR LOG
      }
    } catch (error) {
      console.error(`[ChatMemoryManager] Error storing conversation:`, error);
      throw error;
    }
  }
  
  /**
   * Extrae insights relevantes del estado de la conversación
   * @param state Estado de la conversación
   * @returns Array de insights extraídos
   */
  private extractInsightsFromState(state: WindsurfState): any[] {
    const insights: any[] = [];
    
    // Extraer insights de las reflexiones
    state.history
      .filter((entry: HistoryEntry) => entry.phase === 'reflection')
      .forEach((entry: HistoryEntry) => {
        // Check if there are any insights in the metadata
        if (entry.metadata?.insights && Array.isArray(entry.metadata.insights)) {
          insights.push(...entry.metadata.insights);
        }
      });
    
    return insights;
  }
  
  /**
   * Recupera memorias relevantes para un contexto específico
   * @param context Contexto para el que se quieren recuperar memorias
   * @param limit Número máximo de memorias a recuperar
   * @returns Memorias relevantes para el contexto
   */
  public async retrieveRelevantMemories(context: any, limit: number = 5): Promise<any[]> {
    try {
      const persistChat = vscode.workspace.getConfiguration('extensionAssistant').get<boolean>('persistChat', true);
      if (!persistChat) { // AÑADIR CONDICIONAL
        console.log('[ChatMemoryManager] Persistence disabled. Not retrieving long-term memories.');
        return [];
      }

      // Construir una query basada en el contexto
      const query = this.buildMemoryQuery(context);
      
      // Buscar en la memoria a largo plazo
      const memories = await this.longTermStorage.search(query, limit);
      
      return memories;
    } catch (error) {
      console.error(`[ChatMemoryManager] Error retrieving memories:`, error);
      return [];
    }
  }
  
  /**
   * Construye una query para buscar memorias basada en el contexto
   * @param context Contexto para el que se quiere construir la query
   * @returns Query para buscar memorias
   */
  private buildMemoryQuery(context: any): string {
    let query = '';
    
    // Si hay un objetivo, incluirlo en la query
    if (context.objective) {
      query += context.objective + ' ';
    }
    
    // Si hay un mensaje de usuario, incluirlo en la query
    if (context.userMessage) {
      query += context.userMessage + ' ';
    }
    
    // Si hay entidades extraídas, incluirlas en la query
    if (context.extractedEntities) {
      if (context.extractedEntities.filesMentioned) {
        query += context.extractedEntities.filesMentioned.join(' ') + ' ';
      }
      if (context.extractedEntities.functionsMentioned) {
        query += context.extractedEntities.functionsMentioned.join(' ') + ' ';
      }
    }
    
    return query.trim();
  }
  
  /**
   * Consolida memorias de corto a medio plazo y de medio a largo plazo
   * Se debe llamar periódicamente para mantener la memoria organizada
   * @param chatId ID de la conversación
   */
  public async consolidateMemories(chatId: string): Promise<void> {
    try {
      // Implementación de consolidación de memorias
      // ...
      
      console.log(`[ChatMemoryManager] Consolidated memories for chat ${chatId}`);
    } catch (error) {
      console.error(`[ChatMemoryManager] Error consolidating memories:`, error);
      throw error;
    }
  }
  
  /**
   * Limpia las memorias a corto y medio plazo para una conversación
   * @param chatId ID de la conversación
   */
  public clearConversationMemory(chatId: string): void {
    // Eliminar todas las entradas de memoria a corto plazo para este chat
    for (const key of this.shortTermMemory.keys()) {
      if (key.startsWith(`${chatId}:`)) {
        this.shortTermMemory.delete(key);
      }
    }
    
    // Eliminar todas las entradas de memoria a medio plazo para este chat
    for (const key of this.mediumTermMemory.keys()) {
      if (key.startsWith(`${chatId}:`)) {
        this.mediumTermMemory.delete(key);
      }
    }
    
    console.log(`[ChatMemoryManager] Cleared memory for chat ${chatId}`);
  }
  
  /**
   * Libera todos los recursos al desactivar la extensión
   */
  public async dispose(): Promise<void> {
    try {
      this.shortTermMemory.clear();
      this.mediumTermMemory.clear();
      await this.longTermStorage.dispose();
      console.log('[ChatMemoryManager] Disposed');
    } catch (error) {
      console.error('[ChatMemoryManager] Error during disposal:', error);
      throw error;
    }
  }
}