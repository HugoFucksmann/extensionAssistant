// src/orchestrator/agents/MemoryAgent.ts

import * as vscode from 'vscode';
import { ConversationContext } from "../context/conversationContext";
import { IMemoryRepository, MemoryItem } from "../../store/repositories/MemoryRepository";
import { MemoryRepository } from "../../store/repositories/MemoryRepository";
import { executeModelInteraction, getPromptDefinitions } from "../../models/promptSystem";
import { buildMemoryExtractorVariables } from "../../models/prompts";
import { EventEmitter } from 'events';

// Define the interface for the prompt system functions we need
interface PromptSystemFunctions {
    executeModelInteraction: typeof executeModelInteraction;
    getPromptDefinitions: typeof getPromptDefinitions;
}

// Define events emitted by MemoryAgent
interface MemoryAgentEvents {
    'statusChanged': (chatId: string, status: 'idle' | 'working' | 'error', task?: string, message?: string) => void; // <-- Add status event
    'memoryItemsExtracted': (chatId: string, items: MemoryItem[]) => void;
    'memoryItemsRetrieved': (chatId: string, items: MemoryItem[]) => void;
}

// Augment EventEmitter to be typed
export interface MemoryAgent extends EventEmitter {
    on<U extends keyof MemoryAgentEvents>(event: U, listener: MemoryAgentEvents[U]): this;
    emit<U extends keyof MemoryAgentEvents>(event: U, ...args: Parameters<MemoryAgentEvents[U]>): boolean;
}


export class MemoryAgent extends EventEmitter {
    private repository: IMemoryRepository;
    private promptSystemFunctions: PromptSystemFunctions;
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext, promptSystemFunctions: PromptSystemFunctions) {
        super();
        this.context = context;
        this.repository = new MemoryRepository(context);
        this.promptSystemFunctions = promptSystemFunctions;
        console.log('[MemoryAgent] Initialized.');
    }

    /**
     * Processes the conversation context to extract potential memory items.
     * This method is called by AgentOrchestratorService without awaiting.
     * @param convContext The ConversationContext to process.
     */
    public async extractAndStoreMemory(convContext: ConversationContext): Promise<void> {
        const chatId = convContext.getChatId();
        console.log(`[MemoryAgent:${chatId}] Starting memory extraction...`);
        this.emit('statusChanged', chatId, 'working', 'memory_extraction'); // <-- Emit status

        try {
            const resolutionContextData = convContext.getCurrentFlowContext()?.getResolutionContext() || {};
            const variables = buildMemoryExtractorVariables(resolutionContextData);

            const extractedItems = await this.promptSystemFunctions.executeModelInteraction<MemoryItem[]>('memoryExtractor', variables);

            if (!Array.isArray(extractedItems)) {
                 console.warn(`[MemoryAgent:${chatId}] Memory extractor prompt returned invalid format (not an array).`);
                 this.emit('statusChanged', chatId, 'idle', 'memory_extraction', 'Invalid response format'); // <-- Emit status
                 return;
            }

            console.log(`[MemoryAgent:${chatId}] Extracted ${extractedItems.length} potential memory items.`);

            const storedItems: MemoryItem[] = [];
            for (const item of extractedItems) {
                if (item.type && item.keyName && item.content !== undefined) {
                    try {
                        // Ensure content is serializable if not already
                        item.content = typeof item.content === 'string' ? item.content : JSON.stringify(item.content);
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
            this.emit('statusChanged', chatId, 'idle', 'memory_extraction'); // <-- Emit status

        } catch (error: any) {
            console.error(`[MemoryAgent:${chatId}] Error during memory extraction:`, error);
            this.emit('statusChanged', chatId, 'error', 'memory_extraction', error.message || String(error)); // <-- Emit status
            throw error; // Re-throw
        }
    }

    /**
     * Retrieves relevant memory items for a conversation.
     * This method is called by AgentOrchestratorService, likely at the start of a turn.
     * @param convContext The ConversationContext.
     * @returns A promise that resolves with relevant memory items.
     */
    public async retrieveMemory(convContext: ConversationContext): Promise<MemoryItem[]> {
        const chatId = convContext.getChatId();
        console.log(`[MemoryAgent:${chatId}] Retrieving relevant memory...`);
        this.emit('statusChanged', chatId, 'working', 'memory_retrieval'); // <-- Emit status

        const relevantItems: MemoryItem[] = [];
        const flowContext = convContext.getCurrentFlowContext();
        const analysisResult = flowContext?.getAnalysisResult();
        const objective = flowContext?.getObjective();
        const extractedEntities = analysisResult?.extractedEntities;

        try {
            const recentDecisions = await this.repository.findByType(convContext.getSessionContext().getWorkspacePath() || '', 'decision', 5);
            relevantItems.push(...recentDecisions);

            const recentConventions = await this.repository.findByType(convContext.getSessionContext().getWorkspacePath() || '', 'convention', 5);
            relevantItems.push(...recentConventions);

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
                 const searchResults = await this.repository.search(convContext.getSessionContext().getWorkspacePath() || '', searchQuery, 10);
                 const existingIds = new Set(relevantItems.map(item => item.id));
                 searchResults.forEach(item => {
                     if (item.id && !existingIds.has(item.id)) {
                         relevantItems.push(item);
                         existingIds.add(item.id);
                     }
                 });
            }

            console.log(`[MemoryAgent:${chatId}] Retrieved ${relevantItems.length} relevant memory items.`);
            this.emit('statusChanged', chatId, 'idle', 'memory_retrieval'); // <-- Emit status
            return relevantItems;

        } catch (error: any) {
            console.error(`[MemoryAgent:${chatId}] Error during memory retrieval:`, error);
            this.emit('statusChanged', chatId, 'error', 'memory_retrieval', error.message || String(error)); // <-- Emit status
            throw error; // Re-throw
        }
    }


    dispose(): void {
        console.log('[MemoryAgent] Disposing.');
        this.removeAllListeners();
    }
}