// src/orchestrator/agents/FileInsightAgent.ts

import * as vscode from 'vscode';
import { ConversationContext } from "../context/conversationContext";
import { IModelService } from '../../models/interfaces'; 
import { IStorageService } from '../../store'; 
import { IToolRunner } from '../../tools';
import { CacheAgent } from "./CacheAgent"; 
import { buildCodeAnalyzerVariables, buildCodeFragmenterVariables } from "../../models/prompts";
import { EventEmitter } from 'events';

interface FileInsightAgentEvents {
    'statusChanged': (chatId: string, status: 'idle' | 'working' | 'error', task?: string, message?: string) => void;
    'fileInsightsReady': (chatId: string, insights: any) => void;
    'highPriorityInsight': (chatId: string, insight: any) => void;
}


export interface FileInsightAgent extends EventEmitter {
    on<U extends keyof FileInsightAgentEvents>(event: U, listener: FileInsightAgentEvents[U]): this;
    emit<U extends keyof FileInsightAgentEvents>(event: U, ...args: Parameters<FileInsightAgentEvents[U]>): boolean;
}

export class FileInsightAgent extends EventEmitter {
    private cacheAgent: CacheAgent; 
    private modelService: IModelService; 
    private toolRunner: IToolRunner; 

    constructor(modelService: IModelService, storageService: IStorageService, toolRunner: IToolRunner) { // <-- Updated dependencies
        super();
        this.modelService = modelService;
        this.toolRunner = toolRunner;
        this.cacheAgent = new CacheAgent(storageService);
    }

    /**
     * Processes a list of file paths asynchronously.
     * Gets content, checks cache, analyzes/fragments if needed, and updates cache.
     * Stores results in ConversationContext.
     * Uses IModelService, IToolRunner, and CacheAgent (which uses IStorageService).
     * @param filePaths Array of file paths relative to workspace.
     * @param convContext The ConversationContext.
     * @returns A promise that resolves when processing is complete.
     */
    public async processFiles(filePaths: string[], convContext: ConversationContext): Promise<void> {
        const chatId = convContext.getChatId();
        console.log(`[FileInsightAgent:${chatId}] Starting file processing for ${filePaths.length} files...`);
        this.emit('statusChanged', chatId, 'working', 'file_processing');

        const results: { [filePath: string]: { analysis?: any, fragments?: any, error?: string } } = {};
        let highPriorityFound = false;

        const existingInsights = convContext.getAnalyzedFileInsights() || {};

        for (const filePath of filePaths) {
             this.emit('statusChanged', chatId, 'working', `processing:${filePath}`);

            try {
              
                const fileContent = await this.toolRunner.runTool('filesystem.getFileContents', { filePath }); 

                if (fileContent === 'file not found') { 
                     console.warn(`[FileInsightAgent:${chatId}] File not found, skipping: ${filePath}`);
                     results[filePath] = { error: 'File not found' };
                     this.emit('statusChanged', chatId, 'idle', `processing:${filePath}`);
                     continue; 
                }

              
                const document = vscode.workspace.textDocuments.find(doc => doc.uri.fsPath === filePath);
                const languageId = document?.languageId || filePath.split('.').pop() || 'plaintext';
                const flowContext = convContext.getCurrentFlowContext();
                const objective = flowContext?.getObjective(); 

           
                const analysisCacheKey = `fileAnalysis:${filePath}`;
              
                let analysis = await this.cacheAgent.get(analysisCacheKey, fileContent); 

                if (!analysis) {
                    console.log(`[FileInsightAgent:${chatId}] Cache miss for analysis: ${filePath}. Running analysis prompt.`);
                    try {
                      
                        const analysisVariables = buildCodeAnalyzerVariables({
                             fileContent, filePath, languageId,
                             ...flowContext?.getResolutionContext() 
                        });
                       
                        analysis = await this.modelService.executePrompt('codeAnalyzer', analysisVariables); 
                      
                        await this.cacheAgent.put(analysisCacheKey, fileContent, analysis);
                        console.log(`[FileInsightAgent:${chatId}] Analysis cached for ${filePath}.`);

                    
                        if (analysis?.notes?.toLowerCase().includes('error') || analysis?.purpose?.toLowerCase().includes('critical')) {
                             highPriorityFound = true;
                             console.log(`[FileInsightAgent:${chatId}] High priority finding in analysis for ${filePath}.`);
                        }

                    } catch (promptError: any) {
                        console.error(`[FileInsightAgent:${chatId}] Error running code analysis prompt for ${filePath}:`, promptError);
                        analysis = { error: `Analysis failed: ${promptError.message || promptError}` };
                    }
                } else {
                     console.log(`[FileInsightAgent:${chatId}] Analysis found in cache for ${filePath}.`);
                }
            
                results[filePath] = { analysis };


              
                 if (objective) { 
                     const fragmentCacheKey = `fileFragments:${filePath}`;
                
                     let fragments = await this.cacheAgent.get(fragmentCacheKey, fileContent + ':' + objective);

                     if (!fragments) {
                         console.log(`[FileInsightAgent:${chatId}] Cache miss for fragments: ${filePath}. Running fragmentation prompt.`);
                         try {
                          
                             const fragmentVariables = buildCodeFragmenterVariables({
                                 fileContent, filePath, languageId, query: objective, objective,
                                 ...flowContext?.getResolutionContext() 
                             });
                            
                             fragments = await this.modelService.executePrompt('codeFragmenter', fragmentVariables); 
                         
                             await this.cacheAgent.put(fragmentCacheKey, fileContent + ':' + objective, fragments); 
                             console.log(`[FileInsightAgent:${chatId}] Fragments cached for ${filePath}.`);

                          
                             if (fragments?.fragments?.some((f: any) => f.reason?.toLowerCase().includes('critical'))) {
                                 highPriorityFound = true;
                                 console.log(`[FileInsightAgent:${chatId}] High priority fragment found for ${filePath}.`);
                             }

                         } catch (promptError: any) {
                             console.error(`[FileInsightAgent:${chatId}] Error running code fragmentation prompt for ${filePath}:`, promptError);
                             fragments = { error: `Fragmentation failed: ${promptError.message || promptError}` };
                         }
                     } else {
                          console.log(`[FileInsightAgent:${chatId}] Fragments found in cache for ${filePath}.`);
                     }
                   
                     results[filePath].fragments = fragments;
                 }

                 this.emit('statusChanged', chatId, 'idle', `processing:${filePath}`);

            } catch (error: any) {
               
                console.error(`[FileInsightAgent:${chatId}] Unexpected error processing file ${filePath}:`, error);
                results[filePath] = { error: error.message || String(error) };
                 this.emit('statusChanged', chatId, 'error', `processing:${filePath}`, error.message || String(error)); 
            }
        }

      
        const mergedInsights = { ...existingInsights, ...results };
        convContext.setAnalyzedFileInsights(mergedInsights);
        console.log(`[FileInsightAgent:${chatId}] File processing complete. Results stored in ConversationContext.`);

      
        this.emit('fileInsightsReady', chatId, mergedInsights);
        if (highPriorityFound) {
          
             this.emit('highPriorityInsight', chatId, mergedInsights); 
        }
        this.emit('statusChanged', chatId, 'idle', 'file_processing'); 
    }

    dispose(): void {
        console.log('[FileInsightAgent] Disposing.');
        this.cacheAgent.dispose(); 
        this.removeAllListeners();
      
    }
}