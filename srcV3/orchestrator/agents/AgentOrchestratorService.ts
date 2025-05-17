// src/orchestrator/agents/AgentOrchestratorService.ts

import { ConversationContext } from "../context/conversationContext";
import { ContextAgent } from "./ContextAgent"; 
import { FileInsightAgent } from "./FileInsightAgent"; 
import { MemoryAgent } from "./MemoryAgent"; 
import { IModelService } from '../../models/interfaces';
import { IStorageService } from '../../store'; 
import { IToolRunner } from '../../tools'; 
import { EventEmitter } from 'events';
import { ConfigurationManager } from "../../config/ConfigurationManager";
import { MemoryItem } from '../../store';
import { IAgentOrchestrator } from '../interfaces';

interface AgentOrchestratorEvents {
    'replanSuggested': (chatId: string, reason: string, newContextData?: any) => void;
    'agentStatusChanged': (chatId: string, agent: string, status: 'idle' | 'working' | 'error', task?: string, message?: string) => void;
}

export interface AgentOrchestratorService extends EventEmitter {
     on<U extends keyof AgentOrchestratorEvents>(event: U, listener: AgentOrchestratorEvents[U]): this;
     emit<U extends keyof AgentOrchestratorEvents>(event: U, ...args: Parameters<AgentOrchestratorEvents[U]>): boolean;
}

/**
 * Orchestrates background agent tasks. Manages agent lifecycles,
 * triggers processing based on events, and coordinates communication.
 *
 * EXTENSIBILITY: To add a new agent, create a class (ideally extending EventEmitter),
 * instantiate it in the constructor, add its status listener in setupAgentEventListeners,
 * and call its processing method in processConversationAsync.
 */
// Implement the new interface
export class AgentOrchestratorService extends EventEmitter implements IAgentOrchestrator {
    private contextAgent: ContextAgent;
    private fileInsightAgent: FileInsightAgent;
    private memoryAgent: MemoryAgent;

    private modelService: IModelService;
    private storageService: IStorageService;
    private toolRunner: IToolRunner; 

    private processingTasks: Map<string, Promise<void>> = new Map();
    private contextMap: Map<string, ConversationContext> = new Map();

    constructor(
        modelService: IModelService, 
        storageService: IStorageService,
        toolRunner: IToolRunner, 
        configManager: ConfigurationManager 
    ) {
        super(); 

        this.modelService = modelService; 
        this.storageService = storageService;
        this.toolRunner = toolRunner; 

      
        this.contextAgent = new ContextAgent(this.modelService, configManager); 
     
        this.fileInsightAgent = new FileInsightAgent(this.modelService, this.storageService, this.toolRunner); 
     
        this.memoryAgent = new MemoryAgent(this.modelService, this.storageService); 
    

        this.setupAgentEventListeners();

        console.log('[AgentOrchestratorService] Initialized with ModelService, StorageService, and ToolRunner.'); 
    }

    /**
     * Sets up listeners for events emitted by individual agents.
     * @private
     */
    private setupAgentEventListeners(): void {
     
        this.contextAgent.on('statusChanged', (chatId, status, task, message) => {
            this.emit('agentStatusChanged', chatId, 'contextAgent', status, task, message);
        });
        this.fileInsightAgent.on('statusChanged', (chatId, status, task, message) => {
            this.emit('agentStatusChanged', chatId, 'fileInsightAgent', status, task, message);
        });
        this.memoryAgent.on('statusChanged', (chatId, status, task, message) => {
            this.emit('agentStatusChanged', chatId, 'memoryAgent', status, task, message);
        });
 


      
        this.fileInsightAgent.on('fileInsightsReady', (chatId, insights) => {
            console.log(`[AgentOrchestratorService:${chatId}] Received 'fileInsightsReady' event.`);
            const convContext = this.contextMap.get(chatId);
            if (convContext) {
             
                 this.memoryAgent.extractAndStoreMemory(convContext).catch(err => {
                      console.error(`[AgentOrchestratorService:${chatId}] Error triggering memory extraction after file insights:`, err);
                 });
            }
        });

        this.fileInsightAgent.on('highPriorityInsight', (chatId, insight) => {
             console.log(`[AgentOrchestratorService:${chatId}] Received 'highPriorityInsight' event. Suggesting replan.`);
            
             this.emit('replanSuggested', chatId, 'High priority file insight found', { highPriorityInsight: insight });
        });

        this.memoryAgent.on('memoryItemsExtracted', (chatId, items) => {
             console.log(`[AgentOrchestratorService:${chatId}] Received 'memoryItemsExtracted' event. Stored ${items.length} items.`);
           
        });

         this.memoryAgent.on('memoryItemsRetrieved', (chatId, items) => {
             console.log(`[AgentOrchestratorService:${chatId}] Received 'memoryItemsRetrieved' event. Retrieved ${items.length} items.`);
            
         });

     
    }


    /**
     * Triggers background processing for a specific conversation.
     * This method is called by ChatService after a turn.
     * It launches agent tasks without blocking the caller.
     * @param convContext The ConversationContext to process.
     */
    public triggerProcessing(convContext: ConversationContext): void {
        const chatId = convContext.getChatId();

      
        this.contextMap.set(chatId, convContext);

      
        if (this.processingTasks.has(chatId)) {
            console.log(`[AgentOrchestratorService:${chatId}] Processing already in progress. Skipping trigger.`);
            return;
        }

        console.log(`[AgentOrchestratorService:${chatId}] Triggering background processing.`);

  
        const processingPromise = this.processConversationAsync(convContext)
            .catch(error => {

                console.error(`[AgentOrchestratorService:${chatId}] Unhandled error in processing task:`, error);
              
            })
            .finally(() => {
             
                this.processingTasks.delete(chatId);
                console.log(`[AgentOrchestratorService:${chatId}] Background processing task finished.`);
 
            });

     
        this.processingTasks.set(chatId, processingPromise);
    }

    /**
     * Internal method to run the agent tasks for a conversation.
     * Calls the process methods on the individual agent instances.
     * @param convContext The ConversationContext to process.
     * @private
     */
    private async processConversationAsync(convContext: ConversationContext): Promise<void> {

        // 1. Context Agent processing (summarization, initial file identification)
        await this.contextAgent.processConversation(convContext).catch(err => console.error(`[AgentOrchestratorService:${convContext.getChatId()}] Error in background context processing:`, err));

        // 2. File Insight Agent processing (depends on files identified by ContextAgent)
        const relevantFiles = convContext.getRelevantFiles(); 
        if (relevantFiles && relevantFiles.length > 0) {
            await this.fileInsightAgent.processFiles(relevantFiles, convContext).catch(err => console.error(`[AgentOrchestratorService:${convContext.getChatId()}] Error in background file processing:`, err));
        } else {
             console.log(`[AgentOrchestratorService:${convContext.getChatId()}] No relevant files identified by ContextAgent for processing.`);
        }
    }

    /**
     * Retrieves relevant memory for a conversation for immediate use (e.g., by the planner).
     * Called by the main orchestration flow (ChatService or Orchestrator).
     * Delegates the call to the MemoryAgent instance.
     * @param convContext The ConversationContext.
     * @returns A promise that resolves with relevant memory items.
     */
    public async getMemoryForTurn(convContext: ConversationContext): Promise<MemoryItem[]> {
         console.log(`[AgentOrchestratorService:${convContext.getChatId()}] Retrieving memory for current turn...`);
         try {
             const retrievedMemory = await this.memoryAgent.retrieveMemoryForTurn(convContext);
          
             return retrievedMemory;
         } catch (error) {
             console.error('[AgentOrchestratorService] Error retrieving memory for turn:', error);

             convContext.setRetrievedMemory(undefined); 
             return []; 
         }
    }


    /**
     * Disposes of resources held by the AgentOrchestratorService and its agents.
     * Called by extension.ts on deactivation.
     */
    dispose(): void {
        console.log('[AgentOrchestratorService] Disposing.');
        this.contextAgent.dispose();
        this.fileInsightAgent.dispose();
        this.memoryAgent.dispose();
        this.processingTasks.clear();
        this.contextMap.clear();
        this.removeAllListeners();
    }
}