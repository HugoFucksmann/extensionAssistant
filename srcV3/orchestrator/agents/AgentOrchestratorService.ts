// src/orchestrator/agents/AgentOrchestratorService.ts

import * as vscode from 'vscode';
import { ConversationContext } from "../context/conversationContext";
import { ContextAgent } from "./ContextAgent";
import { FileInsightAgent } from "./FileInsightAgent";
import { MemoryAgent } from "./MemoryAgent";
import { executeModelInteraction, getPromptDefinitions } from "../../models/promptSystem";
import { DatabaseManager } from "../../store/database/DatabaseManager";
import { EventEmitter } from 'events';
import { ConfigurationManager } from "../../config/ConfigurationManager";
import { MemoryItem } from '../../store';


// Define the interface for the prompt system functions we need
interface PromptSystemFunctions {
    executeModelInteraction: typeof executeModelInteraction;
    getPromptDefinitions: typeof getPromptDefinitions;
}

// Define internal events for AgentOrchestratorService
interface AgentOrchestratorEvents {
    'replanSuggested': (chatId: string, reason: string, newContextData?: any) => void;
    'agentStatusChanged': (chatId: string, agent: string, status: 'idle' | 'working' | 'error', task?: string, message?: string) => void;
}

// Augment EventEmitter to be typed
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
export class AgentOrchestratorService extends EventEmitter {
    private contextAgent: ContextAgent;
    private fileInsightAgent: FileInsightAgent;
    private memoryAgent: MemoryAgent;
    // Add new agent instances here

    private processingTasks: Map<string, Promise<void>> = new Map();
    private contextMap: Map<string, ConversationContext> = new Map();

    constructor(context: vscode.ExtensionContext, promptSystemFunctions: PromptSystemFunctions, dbManager: DatabaseManager, configManager: ConfigurationManager) {
        super();
        this.contextAgent = new ContextAgent(promptSystemFunctions as any, dbManager, configManager);
        this.fileInsightAgent = new FileInsightAgent(context, promptSystemFunctions);
        this.memoryAgent = new MemoryAgent(context, promptSystemFunctions);
        // Instantiate new agents here

        this.setupAgentEventListeners();

        console.log('[AgentOrchestratorService] Initialized.');
    }

    /**
     * Sets up listeners for events emitted by individual agents.
     * @private
     */
    private setupAgentEventListeners(): void {
        // Listen to status changes from all agents and re-emit
        this.contextAgent.on('statusChanged', (chatId, status, task, message) => {
            this.emit('agentStatusChanged', chatId, 'contextAgent', status, task, message);
        });
        this.fileInsightAgent.on('statusChanged', (chatId, status, task, message) => {
            this.emit('agentStatusChanged', chatId, 'fileInsightAgent', status, task, message);
        });
        this.memoryAgent.on('statusChanged', (chatId, status, task, message) => {
            this.emit('agentStatusChanged', chatId, 'memoryAgent', status, task, message);
        });
        // Add status listeners for new agents here


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
             console.log(`[AgentOrchestratorService:${chatId}] Received 'highPriorityInsight' event.`);
             this.emit('replanSuggested', chatId, 'High priority file insight found', { highPriorityInsight: insight });
        });

        this.memoryAgent.on('memoryItemsExtracted', (chatId, items) => {
             console.log(`[AgentOrchestratorService:${chatId}] Received 'memoryItemsExtracted' event. Stored ${items.length} items.`);
        });

        // Add other event listeners for new agents here
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
     * @param convContext The ConversationContext to process.
     * @private
     */
    private async processConversationAsync(convContext: ConversationContext): Promise<void> {
        // Coordinate agent tasks here. Order and dependencies matter.
        // For Stage 5, run them mostly sequentially for simplicity.

        // 1. Retrieve relevant memory (needed for other agents/next turn)
        await this.memoryAgent.retrieveMemory(convContext).catch(err => console.error("Error in background memory retrieval:", err));

        // 2. Context Agent processing (summarization, initial file identification)
        await this.contextAgent.processConversation(convContext).catch(err => console.error("Error in background context processing:", err));

        // 3. File Insight Agent processing (depends on files identified by ContextAgent)
        const relevantFiles = convContext.getRelevantFiles();
        if (relevantFiles && relevantFiles.length > 0) {
            await this.fileInsightAgent.processFiles(relevantFiles, convContext).catch(err => console.error("Error in background file processing:", err));
        } else {
             console.log(`[AgentOrchestratorService:${convContext.getChatId()}] No relevant files identified for processing.`);
        }

        // Memory Extraction is triggered by FileInsightAgent event currently.
        // If it wasn't event-driven, you'd call it here after relevant data is ready:
        // await this.memoryAgent.extractAndStoreMemory(convContext).catch(...);

        // Add calls to process methods of new agents here
        // Example: await this.newAgent.process(convContext).catch(...);
    }

    /**
     * Retrieves relevant memory for a conversation for immediate use (e.g., by the planner).
     * Called by the main orchestration flow (ChatService or Orchestrator).
     * @param convContext The ConversationContext.
     * @returns A promise that resolves with relevant memory items.
     */
    public async getMemoryForTurn(convContext: ConversationContext): Promise<MemoryItem[]> {
         console.log(`[AgentOrchestratorService:${convContext.getChatId()}] Retrieving memory for current turn...`);
         // For Stage 5, still call the retrieve logic directly for simplicity.
         // A more advanced approach might check freshness or read from a dedicated in-memory cache.
         try {
             const retrievedMemory = await this.memoryAgent.retrieveMemory(convContext);
             convContext.setRetrievedMemory(retrievedMemory); // Ensure context is updated
             return retrievedMemory;
         } catch (error) {
             console.error('[AgentOrchestratorService] Error retrieving memory for turn:', error);
             convContext.setRetrievedMemory(undefined); // Clear potentially stale memory on error
             return []; // Return empty on error
         }
    }


    dispose(): void {
        console.log('[AgentOrchestratorService] Disposing.');
        this.contextAgent.dispose();
        this.fileInsightAgent.dispose();
        this.memoryAgent.dispose();
        // Dispose new agents here
        this.processingTasks.clear();
        this.contextMap.clear();
        this.removeAllListeners();
    }
}