// src/features/memory/MemoryManager.ts
import { LongTermStorage } from './LongTermStorage';
import { WindsurfState, HistoryEntry } from '@shared/types';


export class MemoryManager {
 
  private shortTermMemory: Map<string, any>;

  private mediumTermMemory: Map<string, any>;

  private longTermStorage: LongTermStorage;
  
  constructor(longTermStorage: LongTermStorage) {
    this.shortTermMemory = new Map();
    this.mediumTermMemory = new Map();
    this.longTermStorage = longTermStorage;
    
   
  }
  

  public storeShortTerm(key: string, value: any, chatId: string): void {
    this.shortTermMemory.set(`${chatId}:${key}`, value);
  }
  

  public getShortTerm<T = any>(key: string, chatId: string): T | undefined {
    return this.shortTermMemory.get(`${chatId}:${key}`) as T | undefined;
  }

  public storeMediumTerm(key: string, value: any, chatId: string): void {
    this.mediumTermMemory.set(`${chatId}:${key}`, value);
  }
  

  public getMediumTerm<T = any>(key: string, chatId: string): T | undefined {
    return this.mediumTermMemory.get(`${chatId}:${key}`) as T | undefined;
  }
  

  public async storeConversation(chatId: string, state: WindsurfState): Promise<void> {
    try {
    
      this.storeShortTerm('lastState', state, chatId);
      this.storeShortTerm('lastObjective', state.objective, chatId);
      
     
      this.storeMediumTerm('conversationHistory', state.history, chatId);
      
     
      const insights = this.extractInsightsFromState(state);
      if (insights.length > 0) {
        await this.longTermStorage.storeInsights(chatId, insights, {
          objective: state.objective,
          timestamp: Date.now()
        });
      }
      
      
    } catch (error) {
      console.error(`[MemoryManager] Error storing conversation:`, error);
      throw error;
    }
  }
  

  private extractInsightsFromState(state: WindsurfState): any[] {
    const insights: any[] = [];
    
   
    state.history
      .filter((entry: HistoryEntry) => entry.phase === 'reflection')
      .forEach((entry: HistoryEntry) => {
        
        if (entry.metadata?.insights && Array.isArray(entry.metadata.insights)) {
          insights.push(...entry.metadata.insights);
        }
      });
    
    return insights;
  }

  public async retrieveRelevantMemories(context: any, limit: number = 5): Promise<any[]> {
    try {
      // Construir una query basada en el contexto
      const query = this.buildMemoryQuery(context);
      
      // Buscar en la memoria a largo plazo
      const memories = await this.longTermStorage.search(query, limit);
      
      return memories;
    } catch (error) {
      console.error(`[MemoryManager] Error retrieving memories:`, error);
      return [];
    }
  }

  private buildMemoryQuery(context: any): string {
    let query = '';
    
   
    if (context.objective) {
      query += context.objective + ' ';
    }
    
    
    if (context.userMessage) {
      query += context.userMessage + ' ';
    }
    
    
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


  public clearConversationMemory(chatId: string): void {
   
    for (const key of this.shortTermMemory.keys()) {
      if (key.startsWith(`${chatId}:`)) {
        this.shortTermMemory.delete(key);
      }
    }
    
    
    for (const key of this.mediumTermMemory.keys()) {
      if (key.startsWith(`${chatId}:`)) {
        this.mediumTermMemory.delete(key);
      }
    }
    
  
  }
  

  public async dispose(): Promise<void> {
    try {
      this.shortTermMemory.clear();
      this.mediumTermMemory.clear();
      await this.longTermStorage.dispose();
    
    } catch (error) {
      console.error('[MemoryManager] Error during disposal:', error);
      throw error;
    }
  }
}
