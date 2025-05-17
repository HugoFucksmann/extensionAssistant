// src/orchestrator/agents/MemoryAgent.ts

import { ConversationContext } from "../context/conversationContext";
import { IModelService } from '../../models/interfaces';
import { IStorageService, IMemoryRepository, MemoryItem } from '../../store'; 
import { buildMemoryExtractorVariables } from "../../models/prompts";
import { EventEmitter } from 'events';

interface MemoryAgentEvents {
    'statusChanged': (chatId: string, status: 'idle' | 'working' | 'error', task?: string, message?: string) => void;
    'memoryItemsExtracted': (chatId: string, items: MemoryItem[]) => void;
    'memoryItemsRetrieved': (chatId: string, items: MemoryItem[]) => void;
}

// Augment EventEmitter to be typed (remains the same)
export interface MemoryAgent extends EventEmitter {
    on<U extends keyof MemoryAgentEvents>(event: U, listener: MemoryAgentEvents[U]): this;
    emit<U extends keyof MemoryAgentEvents>(event: U, ...args: Parameters<MemoryAgentEvents[U]>): boolean;
}


export class MemoryAgent extends EventEmitter {
    private repository: IMemoryRepository; 
    private modelService: IModelService; 

    constructor(modelService: IModelService, storageService: IStorageService) { 
        super();
        this.modelService = modelService; 
      
        this.repository = storageService.getMemoryRepository(); 
        console.log('[MemoryAgent] Initialized.');
    }

    /**
     * Processes the conversation context to extract potential memory items.
     * Uses IModelService and IMemoryRepository.
     * This method is called by AgentOrchestratorService without awaiting.
     * @param convContext The ConversationContext to process.
     */
    public async extractAndStoreMemory(convContext: ConversationContext): Promise<void> {
        const chatId = convContext.getChatId();
        console.log(`[MemoryAgent:${chatId}] Starting memory extraction...`);
        this.emit('statusChanged', chatId, 'working', 'memory_extraction');

        try {
           
            const resolutionContextData = convContext.getCurrentFlowContext()?.getResolutionContext() || {};
            const variables = buildMemoryExtractorVariables(resolutionContextData); 

           
            const extractedItems = await this.modelService.executePrompt<MemoryItem[]>('memoryExtractor', variables); 

            if (!Array.isArray(extractedItems)) {
                 console.warn(`[MemoryAgent:${chatId}] Memory extractor prompt returned invalid format (not an array).`);
                 this.emit('statusChanged', chatId, 'idle', 'memory_extraction', 'Invalid response format');
                 return;
            }

            console.log(`[MemoryAgent:${chatId}] Extracted ${extractedItems.length} potential memory items.`);

            const storedItems: MemoryItem[] = [];
           
            for (const item of extractedItems) {
              
                if (item.type && item.keyName && item.content !== undefined) {
                    try {
                       
                        const storedItem = await this.repository.put(item); 
                        storedItems.push(storedItem);
                        console.log(`[MemoryAgent:${chatId}] Stored memory item: ${item.type}:${item.keyName}`);
                    } catch (storeError) {
                        console.error(`[MemoryAgent:${chatId}] Error storing memory item ${item.type}:${item.keyName}:`, storeError);
                    }
                } else {
                    console.warn(`[MemoryAgent:${chatId}] Skipping invalid extracted memory item:`, item);
                }
            }

            if (storedItems.length > 0) {
                this.emit('memoryItemsExtracted', chatId, storedItems);
            }

            console.log(`[MemoryAgent:${chatId}] Memory extraction finished. Stored ${storedItems.length} items.`);
            this.emit('statusChanged', chatId, 'idle', 'memory_extraction');

        } catch (error: any) {
            console.error(`[MemoryAgent:${chatId}] Error during memory extraction:`, error);
            this.emit('statusChanged', chatId, 'error', 'memory_extraction', error.message || String(error));
          
            throw error;
        }
    }

    /**
     * Retrieves relevant memory items for a conversation.
     * Uses IMemoryRepository.
     * This method is called by AgentOrchestratorService, likely at the start of a turn.
     * @param convContext The ConversationContext.
     * @returns A promise that resolves with relevant memory items.
     */
    public async retrieveMemory(convContext: ConversationContext): Promise<MemoryItem[]> {
         const chatId = convContext.getChatId();
         console.log(`[MemoryAgent:${chatId}] Retrieving relevant memory...`);
         this.emit('statusChanged', chatId, 'working', 'memory_retrieval');

      
         try {
             const relevantItems: MemoryItem[] = [];

             
             const projectId = convContext.getSessionContext().getWorkspacePath() || '';
             if (!projectId) {
                  console.warn(`[MemoryAgent:${chatId}] Could not determine project ID for memory retrieval.`);
                  this.emit('statusChanged', chatId, 'idle', 'memory_retrieval', 'No project context');
                  return []; 
             }

             const recentDecisions = await this.repository.findByType(projectId, 'decision', 5);
             relevantItems.push(...recentDecisions);

             const recentConventions = await this.repository.findByType(projectId, 'convention', 5);
             relevantItems.push(...recentConventions);

             const flowContext = convContext.getCurrentFlowContext();
             const objective = flowContext?.getObjective();
             const extractedEntities = flowContext?.getAnalysisResult()?.extractedEntities;

             let searchQuery = objective || '';
             if (extractedEntities) {
                  const entityKeywords = [
                      ...(extractedEntities.filesMentioned || []),
                      ...(extractedEntities.functionsMentioned || []),
                      ...(extractedEntities.errorsMentioned || []),
                      ...(extractedEntities.customKeywords || [])
                  ].join(' ');
                  if (entityKeywords) {
                       searchQuery = `${searchQuery} ${entityKeywords}`.trim();
                  }
             }

             if (searchQuery) {
                  const searchResults = await this.repository.search(projectId, searchQuery, 10); 
                  const existingIds = new Set(relevantItems.map(item => item.id));
                  searchResults.forEach(item => {
                      if (item.id && !existingIds.has(item.id)) {
                          relevantItems.push(item);
                          existingIds.add(item.id);
                      }
                  });
             }

             console.log(`[MemoryAgent:${chatId}] Retrieved ${relevantItems.length} relevant memory items.`);
             this.emit('statusChanged', chatId, 'idle', 'memory_retrieval');
             return relevantItems;

         } catch (error: any) {
             console.error(`[MemoryAgent:${chatId}] Error during memory retrieval:`, error);
             this.emit('statusChanged', chatId, 'error', 'memory_retrieval', error.message || String(error));
             throw error; 
         }
    }


    dispose(): void {
        console.log('[MemoryAgent] Disposing.');
        this.removeAllListeners(); // Clean up event listeners
       
    }

  
    public async retrieveMemoryForTurn(convContext: ConversationContext): Promise<MemoryItem[]> {
        const retrieved = await this.retrieveMemory(convContext); 
        convContext.setRetrievedMemory(retrieved); 
        return retrieved;
    }
}