// features/memory/core/memoryManager.ts
/**
 * Gestor de memoria para la arquitectura Windsurf
 * Implementa un sistema de memoria jerárquica (corto, medio y largo plazo)
 */

import * as vscode from 'vscode';
import { WindsurfState, HistoryEntry } from '../types';
import { LongTermStorage } from './longTermStorage';

// Interfaz para entradas con tiempo de expiración
interface TimedEntry<T = any> {
  value: T;
  expiresAt?: number; // Timestamp en milisegundos
  createdAt: number;
}

/**
 * Gestor centralizado de memoria
 * Maneja diferentes niveles de memoria para el agente Windsurf
 */
export class MemoryManager {
  // Memoria a corto plazo (contexto inmediato)
  private shortTermMemory: Map<string, any>;

  // Memoria a medio plazo (contexto de la tarea actual) con soporte para TTL
  private mediumTermMemory: Map<string, TimedEntry>;

  // Memoria a largo plazo (persistente entre sesiones)
  private longTermStorage: LongTermStorage;

  // Intervalo de limpieza
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos
  private readonly SHORT_TERM_TTL = 60 * 60 * 1000; // 1 hora para memoria a corto plazo

  constructor() {
    this.shortTermMemory = new Map();
    this.mediumTermMemory = new Map();
    this.longTermStorage = new LongTermStorage();

    // Iniciar limpieza automática
    this.startCleanupInterval();

    console.log('[MemoryManager] Initialized with automatic cleanup');
  }

  /**
   * Inicia el intervalo de limpieza automática
   */
  private startCleanupInterval(): void {
    // Ejecutar limpieza inmediatamente
    this.cleanupExpiredEntries();
    
    // Configurar intervalo periódico
    this.cleanupInterval = setInterval(
      () => this.cleanupExpiredEntries(), 
      this.CLEANUP_INTERVAL_MS
    );
    
    // Asegurarse de limpiar el intervalo cuando se destruya la instancia
    if (typeof process !== 'undefined' && process.on) {
      process.on('exit', () => this.dispose());
    }
  }

  /**
   * Limpia las entradas expiradas de la memoria
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let cleaned = 0;

    // Limpiar memoria a corto plazo (por antigüedad)
    for (const [key, entry] of this.shortTermMemory.entries()) {
      if (entry?.__timestamp && (now - entry.__timestamp) > this.SHORT_TERM_TTL) {
        this.shortTermMemory.delete(key);
        cleaned++;
      }
    }

    // Limpiar memoria a medio plazo (por TTL)
    for (const [key, entry] of this.mediumTermMemory.entries()) {
      if (entry.expiresAt && entry.expiresAt <= now) {
        this.mediumTermMemory.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[MemoryManager] Cleaned up ${cleaned} expired entries`);
    }
  }

  /**
   * Serializa un valor para almacenamiento
   */
  private serializeValue(value: any): any {
    // Manejar tipos especiales
    if (value === undefined) {
      return { __type: 'undefined' };
    }
    if (value === null) {
      return { __type: 'null' };
    }
    if (value instanceof Date) {
      return { __type: 'Date', value: value.toISOString() };
    }
    if (value instanceof Map) {
      return { 
        __type: 'Map', 
        value: Array.from(value.entries()) 
      };
    }
    if (value instanceof Set) {
      return { 
        __type: 'Set', 
        value: Array.from(value) 
      };
    }
    if (typeof value === 'bigint') {
      return { __type: 'bigint', value: value.toString() };
    }
    if (Array.isArray(value)) {
      return value.map(v => this.serializeValue(v));
    }
    if (typeof value === 'object') {
      const result: Record<string, any> = {};
      for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          result[key] = this.serializeValue(value[key]);
        }
      }
      return result;
    }
    return value;
  }

  /**
   * Deserializa un valor previamente serializado
   */
  private deserializeValue<T = any>(serialized: any): T {
    if (serialized === null || typeof serialized !== 'object') {
      return serialized as T;
    }

    // Manejar tipos especiales
    if ('__type' in serialized) {
      switch (serialized.__type) {
        case 'undefined': return undefined as unknown as T;
        case 'null': return null as unknown as T;
        case 'Date': return new Date(serialized.value) as unknown as T;
        case 'Map': return new Map(serialized.value) as unknown as T;
        case 'Set': return new Set(serialized.value) as unknown as T;
        case 'bigint': return BigInt(serialized.value) as unknown as T;
      }
    }

    // Manejar arrays
    if (Array.isArray(serialized)) {
      return serialized.map(v => this.deserializeValue(v)) as unknown as T;
    }

    // Manejar objetos
    const result: Record<string, any> = {};
    for (const key in serialized) {
      if (Object.prototype.hasOwnProperty.call(serialized, key)) {
        result[key] = this.deserializeValue(serialized[key]);
      }
    }
    return result as T;
  }

  /**
   * Almacena un valor en la memoria a corto plazo
   * @param key Clave para almacenar el valor
   * @param value Valor a almacenar
   * @param chatId ID de la conversación (para aislar memorias entre conversaciones)
   */
  public storeShortTerm(key: string, value: any, chatId: string, ttl?: number): void {
    const entry = {
      value: this.serializeValue(value),
      __timestamp: Date.now(),
      ...(ttl && { __expiresAt: Date.now() + ttl })
    };
    this.shortTermMemory.set(`${chatId}:${key}`, entry);
  }

  /**
   * Recupera un valor de la memoria a corto plazo
   * @param key Clave del valor a recuperar
   * @param chatId ID de la conversación
   * @returns El valor almacenado o undefined si no existe
   */
  public getShortTerm<T = any>(key: string, chatId: string): T | undefined {
    const entry = this.shortTermMemory.get(`${chatId}:${key}`);
    if (!entry) return undefined;
    
    // Verificar si la entrada ha expirado
    if (entry.__expiresAt && entry.__expiresAt < Date.now()) {
      this.shortTermMemory.delete(`${chatId}:${key}`);
      return undefined;
    }
    
    return this.deserializeValue<T>(entry.value);
  }

  /**
   * Almacena un valor en la memoria a medio plazo
   * @param key Clave para almacenar el valor
   * @param value Valor a almacenar
   * @param chatId ID de la conversación
   */
  public storeMediumTerm(key: string, value: any, chatId: string, ttl?: number): void {
    const entry: TimedEntry = {
      value: this.serializeValue(value),
      createdAt: Date.now(),
      ...(ttl && { expiresAt: Date.now() + ttl })
    };
    this.mediumTermMemory.set(`${chatId}:${key}`, entry);
  }

  /**
   * Recupera un valor de la memoria a medio plazo
   * @param key Clave del valor a recuperar
   * @param chatId ID de la conversación
   * @returns El valor almacenado o undefined si no existe
   */
  public getMediumTerm<T = any>(key: string, chatId: string): T | undefined {
    const entry = this.mediumTermMemory.get(`${chatId}:${key}`);
    if (!entry) return undefined;
    
    // Verificar si la entrada ha expirado
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.mediumTermMemory.delete(`${chatId}:${key}`);
      return undefined;
    }
    
    return this.deserializeValue<T>(entry.value);
  }

  /**
   * Almacena una conversación completa en la memoria
   * Distribuye la información en los diferentes niveles de memoria según su relevancia
   * @param chatId ID de la conversación
   * @param state Estado final de la conversación
   */
  public async storeConversation(chatId: string, state: WindsurfState): Promise<void> {
    try {
      // 1. Almacenar en memoria a corto plazo (TTL de 1 hora)
      const shortTermTtl = 60 * 60 * 1000; // 1 hora
      this.storeShortTerm('lastState', state, chatId, shortTermTtl);
      this.storeShortTerm('lastObjective', state.objective, chatId, shortTermTtl);

      // 2. Almacenar en memoria a medio plazo (TTL de 24 horas)
      const mediumTermTtl = 24 * 60 * 60 * 1000; // 24 horas
      this.storeMediumTerm('conversationHistory', state.history, chatId, mediumTermTtl);
      this.storeMediumTerm('extractedEntities', state.extractedEntities, chatId, mediumTermTtl);

      // 3. Almacenar insights relevantes en memoria a largo plazo
      const insights = this.extractInsightsFromState(state);
      if (insights.length > 0) {
        // Serializar los insights antes de almacenarlos
        const serializedInsights = insights.map(insight => ({
          ...insight,
          // Asegurarse de que los datos estén correctamente serializados
          data: this.serializeValue(insight.data),
          timestamp: insight.timestamp || Date.now()
        }));
        
        await this.longTermStorage.storeInsights(chatId, serializedInsights, {
          objective: state.objective,
          timestamp: Date.now()
        });
      }

      console.log(`[MemoryManager] Stored conversation state for chat ${chatId}`);
    } catch (error) {
      console.error(`[MemoryManager] Error storing conversation:`, error);
      // Opcional: Emitir un evento de error
      // this.eventBus.emit('memory:store:error', { chatId, error });
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
      .filter(entry => entry.phase === 'reflection')
      .forEach(entry => {
        const reflection = entry.data;
        if (reflection.insights && Array.isArray(reflection.insights)) {
          insights.push(...reflection.insights);
        }
      });

    return insights;
  }

  /**
   * Recupera memorias relevantes para un contexto específico
   * En una implementación real, esto utilizaría embeddings para búsqueda semántica
   * @param context Contexto para el que se quieren recuperar memorias
   * @param limit Número máximo de memorias a recuperar
   * @returns Memorias relevantes para el contexto
   */
  public async retrieveRelevantMemories(context: any, limit: number = 5): Promise<any[]> {
    try {
      // Construir una query basada en el contexto
      const query = this.buildMemoryQuery(context);

      // Buscar en la memoria a largo plazo
      const memories = await this.longTermStorage.search(query, limit);

      // Deserializar los datos recuperados
      return memories.map(memory => {
        try {
          // Asegurarse de que los datos estén correctamente deserializados
          if (memory.data) {
            return {
              ...memory,
              data: this.deserializeValue(memory.data)
            };
          }
          return memory;
        } catch (error) {
          console.error('[MemoryManager] Error deserializing memory:', error);
          return memory; // Devolver la memoria sin cambios en caso de error
        }
      });
    } catch (error) {
      console.error(`[MemoryManager] Error retrieving memories:`, error);
      // Opcional: Emitir un evento de error
      // this.eventBus.emit('memory:retrieve:error', { context, error });
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

      console.log(`[MemoryManager] Consolidated memories for chat ${chatId}`);
    } catch (error) {
      console.error(`[MemoryManager] Error consolidating memories:`, error);
    }
  }

  /**
   * Limpia las memorias a corto y medio plazo para una conversación
   * @param chatId ID de la conversación
   */
  public clearConversationMemory(chatId: string): void {
    let count = 0;
    
    // Eliminar todas las entradas de memoria a corto plazo para este chat
    for (const key of [...this.shortTermMemory.keys()]) {
      if (key.startsWith(`${chatId}:`)) {
        this.shortTermMemory.delete(key);
        count++;
      }
    }

    // Eliminar todas las entradas de memoria a medio plazo para este chat
    for (const key of [...this.mediumTermMemory.keys()]) {
      if (key.startsWith(`${chatId}:`)) {
        this.mediumTermMemory.delete(key);
        count++;
      }
    }

    // Intentar limpiar también en el almacenamiento a largo plazo
    try {
      this.longTermStorage.clearByChatId(chatId);
      console.log(`[MemoryManager] Cleared long-term memory for chat ${chatId}`);
    } catch (error) {
      console.error(`[MemoryManager] Error clearing long-term memory for chat ${chatId}:`, error);
    }

    console.log(`[MemoryManager] Cleared ${count} memory entries for chat ${chatId}`);
    
    // Opcional: Emitir un evento de limpieza
    // this.eventBus.emit('memory:cleared', { chatId, count });
  }

  /**
   * Libera todos los recursos al desactivar la extensión
   */
  public dispose(): void {
    // Limpiar el intervalo de limpieza si existe
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    this.shortTermMemory.clear();
    this.mediumTermMemory.clear();
    this.longTermStorage.dispose();
    console.log('[MemoryManager] Disposed');
  }
}