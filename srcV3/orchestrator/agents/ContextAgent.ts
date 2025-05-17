// src/orchestrator/agents/ContextAgent.ts

import { ConversationContext } from "../context/conversationContext";
import { IModelService } from '../../models/interfaces';
import { buildSummarizerVariables } from "../../models/prompts/prompt.summarizer"; 
import { EventEmitter } from 'events';
import { ConfigurationManager } from "../../config/ConfigurationManager";

interface ContextAgentEvents {
    'statusChanged': (chatId: string, status: 'idle' | 'working' | 'error', task?: string, message?: string) => void;
}


export interface ContextAgent extends EventEmitter {
    on<U extends keyof ContextAgentEvents>(event: U, listener: ContextAgentEvents[U]): this;
    emit<U extends keyof ContextAgentEvents>(event: U, ...args: Parameters<ContextAgentEvents[U]>): boolean;
}

export class ContextAgent extends EventEmitter implements ContextAgent {
    private modelService: IModelService;
    private configManager: ConfigurationManager;

    constructor(modelService: IModelService, configManager: ConfigurationManager) { 
        super(); 
        this.modelService = modelService;    
        this.configManager = configManager;
        console.log('[ContextAgent] Initialized.');
    }

    /**
     * Processes the conversation context asynchronously.
     * Decides whether to summarize or identify files based on current state.
     * This method is called by AgentOrchestratorService without awaiting.
     * @param context The ConversationContext or context object to process.
     */
    public async processConversation(context: ConversationContext | any): Promise<void> {
     

        let chatId: string;
        let convContext: ConversationContext;

        if (context instanceof ConversationContext) {
            convContext = context;
            chatId = convContext.getChatId();
        } else {
           
            chatId = context.chatId;
            this.emit('statusChanged', chatId, 'working', 'Processing conversation context...');
            console.log(`[ContextAgent] Processing conversation for chat ${chatId}`);
           
            return;
        }


        
        this.emit('statusChanged', chatId, 'working', 'context_processing');

        try {
         
            await this.identifyRelevantFiles(convContext);
            await this.summarizeConversation(convContext);
            this.emit('statusChanged', chatId, 'idle', 'context_processing');
        } catch (error: any) {
            console.error(`[ContextAgent:${chatId}] Error during background processing:`, error);
            this.emit('statusChanged', chatId, 'error', 'context_processing', error.message || String(error));
            
            throw error;
        }
    }

    /**
     * Identifies relevant files mentioned in the recent history or analysis result.
     * (This method does not use any injected services directly).
     * @param convContext The ConversationContext.
     */
    private async identifyRelevantFiles(convContext: ConversationContext): Promise<void> {
        const chatId = convContext.getChatId();
        console.log(`[ContextAgent:${chatId}] Identifying relevant files...`);

        const flowContext = convContext.getCurrentFlowContext();
        const analysisResult = flowContext?.getAnalysisResult();

        let identifiedFiles: Set<string> = new Set();

        if (analysisResult?.extractedEntities?.filesMentioned) {
            analysisResult.extractedEntities.filesMentioned.forEach(file => identifiedFiles.add(file));
        }

        const existingRelevantFiles = convContext.getRelevantFiles() || [];
        existingRelevantFiles.forEach(file => identifiedFiles.add(file));

        const relevantFilesArray = Array.from(identifiedFiles);
        if (relevantFilesArray.length > 0) {
             console.log(`[ContextAgent:${chatId}] Identified files: ${relevantFilesArray.join(', ')}`);
        } else {
             console.log(`[ContextAgent:${chatId}] No new relevant files identified.`);
        }

       
        convContext.setRelevantFiles(relevantFilesArray.length > 0 ? relevantFilesArray : undefined);
    }

    /**
     * Summarizes the conversation history if the threshold is met.
     * Uses IModelService and ConfigurationManager.
     * @param convContext The ConversationContext.
     */
    private async summarizeConversation(convContext: ConversationContext): Promise<void> {
        const chatId = convContext.getChatId();
        const messages = convContext.getHistory();

        const summaryThreshold = this.configManager.getContextAgentSummaryThreshold();

      
        const shouldSummarize = messages.length >= summaryThreshold &&
                                (messages.length % summaryThreshold === 0 || convContext.getSummary() === undefined);


        if (!shouldSummarize) {
            console.log(`[ContextAgent:${chatId}] Summarization threshold not met (${messages.length}/${summaryThreshold}). Skipping.`);
            return;
        }

        console.log(`[ContextAgent:${chatId}] Summarizing conversation...`);
        this.emit('statusChanged', chatId, 'working', 'summarizing');

        try {
            
            const resolutionContextData = convContext.getCurrentFlowContext()?.getResolutionContext() || {};
         
             resolutionContextData.summary = convContext.getSummary(); 

            const variables = buildSummarizerVariables(resolutionContextData);

          
            const newSummary = await this.modelService.executePrompt<string>('summarizer', variables); 

            if (typeof newSummary === 'string' && newSummary.trim() !== '') {
                 convContext.setSummary(newSummary.trim());
                 console.log(`[ContextAgent:${chatId}] Conversation summary updated.`);
            } else {
                 console.warn(`[ContextAgent:${chatId}] Summarizer prompt returned empty or invalid response.`);
            }
            this.emit('statusChanged', chatId, 'idle', 'summarizing');

        } catch (error: any) {
            console.error(`[ContextAgent:${chatId}] Error during summarization:`, error);
            this.emit('statusChanged', chatId, 'error', 'summarizing', error.message || String(error));
            throw error; 
        }
    }

     dispose(): void {
         console.log('[ContextAgent] Disposing.');
         this.removeAllListeners(); 
       
     }
}