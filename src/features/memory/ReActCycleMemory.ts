// src/features/memory/ReActCycleMemory.ts

import { LongTermStorage } from './LongTermStorage';



export type ReActCycleMemoryType = 
  | 'context' 
  | 'codebase' 
  | 'user'     
  | 'tools'     
  | 'reasoning'; 

// Estructura de un elemento de memoria
export interface ReActCycleMemoryItem {
  id: string;
  type: ReActCycleMemoryType;
  content: any;
  relevance: number;  // 0-1, qué tan relevante es para el contexto actual
  timestamp: number;
  metadata?: Record<string, any>;
}

// Estado de memoria del agente durante una conversación
export interface ReActCycleMemoryState {
  chatId: string;
  shortTermMemory: ReActCycleMemoryItem[];  // Memoria de la conversación actual
  relevantLongTermMemory: ReActCycleMemoryItem[];  // Memoria relevante recuperada del almacenamiento
  currentContext: {
    userQuery: string;
    codeContext?: string;
    activeFile?: string;
    workspaceRoot?: string;
  };
  metadata: {
    lastUpdated: number;
    memorySize: number;
  };
}

export class ReActCycleMemory {
  private state: ReActCycleMemoryState;
  private static MAX_SHORT_TERM_ITEMS = 20;
  
  constructor(
    private storage: LongTermStorage,
    chatId: string,
    initialContext: { userQuery: string; codeContext?: string; activeFile?: string; workspaceRoot?: string; }
  ) {
    this.state = {
      chatId,
      shortTermMemory: [],
      relevantLongTermMemory: [],
      currentContext: initialContext,
      metadata: {
        lastUpdated: Date.now(),
        memorySize: 0
      }
    };
  }

  /**
   * Añade un elemento a la memoria a corto plazo
   */
  public addToShortTermMemory(item: Omit<ReActCycleMemoryItem, 'id' | 'timestamp'>): string {
    const id = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const memoryItem: ReActCycleMemoryItem = {
      ...item,
      id,
      timestamp: Date.now()
    };
    
    this.state.shortTermMemory.push(memoryItem);
    
    // Limitar el tamaño de la memoria a corto plazo
    if (this.state.shortTermMemory.length > ReActCycleMemory.MAX_SHORT_TERM_ITEMS) {
      // Eliminar los elementos menos relevantes primero
      this.state.shortTermMemory.sort((a, b) => b.relevance - a.relevance);
      this.state.shortTermMemory = this.state.shortTermMemory.slice(0, ReActCycleMemory.MAX_SHORT_TERM_ITEMS);
    }
    
    this.updateMetadata();
    return id;
  }

  /**
   * Recupera elementos relevantes de la memoria a largo plazo
   */
  public async retrieveRelevantMemory(query: string, limit: number = 5): Promise<ReActCycleMemoryItem[]> {
    try {
      const results = await this.storage.search(query, limit);
      
      const memoryItems: ReActCycleMemoryItem[] = results.map(result => ({
        id: result.key,
        type: result.metadata.type || 'context',
        content: result.data,
        relevance: 0.8, // Valor por defecto, se podría calcular basado en la similitud
        timestamp: new Date(result.metadata.updatedAt || Date.now()).getTime(),
        metadata: result.metadata
      }));
      
      this.state.relevantLongTermMemory = memoryItems;
      this.updateMetadata();
      
      return memoryItems;
    } catch (error) {
      console.error('Error retrieving relevant memory:', error);
      return [];
    }
  }

  /**
   * Persiste un elemento importante en la memoria a largo plazo
   */
  public async persistToLongTermMemory(item: Omit<ReActCycleMemoryItem, 'id' | 'timestamp'>): Promise<string> {
    const id = `ltm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    await this.storage.store(id, item.content, {
      type: item.type,
      relevance: item.relevance,
      ...item.metadata
    });
    
    return id;
  }

  /**
   * Actualiza el contexto actual del agente
   */
  public updateContext(context: Partial<ReActCycleMemoryState['currentContext']>): void {
    this.state.currentContext = {
      ...this.state.currentContext,
      ...context
    };
    this.updateMetadata();
  }

  /**
   * Obtiene un resumen de la memoria actual para incluir en los prompts
   */
  public getMemorySummary(): string {
    // Combinar memoria a corto y largo plazo, ordenar por relevancia
    const allMemory = [
      ...this.state.shortTermMemory,
      ...this.state.relevantLongTermMemory
    ].sort((a, b) => b.relevance - a.relevance);
    
    // Generar resumen estructurado
    const contextItems = allMemory.filter(item => item.type === 'context');
    const codebaseItems = allMemory.filter(item => item.type === 'codebase');
    const userItems = allMemory.filter(item => item.type === 'user');
    const toolItems = allMemory.filter(item => item.type === 'tools');
    
    let summary = '';
    
    if (contextItems.length > 0) {
      summary += '## Contexto\n' + contextItems.map(item => `- ${JSON.stringify(item.content)}`).join('\n') + '\n\n';
    }
    
    if (codebaseItems.length > 0) {
      summary += '## Codebase\n' + codebaseItems.map(item => `- ${JSON.stringify(item.content)}`).join('\n') + '\n\n';
    }
    
    if (userItems.length > 0) {
      summary += '## Usuario\n' + userItems.map(item => `- ${JSON.stringify(item.content)}`).join('\n') + '\n\n';
    }
    
    if (toolItems.length > 0) {
      summary += '## Herramientas\n' + toolItems.map(item => `- ${JSON.stringify(item.content)}`).join('\n') + '\n\n';
    }
    
    return summary.trim();
  }

  /**
   * Obtiene el estado completo de la memoria
   */
  public getState(): ReActCycleMemoryState {
    return this.state;
  }

  /**
   * Actualiza los metadatos de la memoria
   */
  private updateMetadata(): void {
    this.state.metadata = {
      lastUpdated: Date.now(),
      memorySize: this.state.shortTermMemory.length + this.state.relevantLongTermMemory.length
    };
  }
}
