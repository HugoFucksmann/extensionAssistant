// src/orchestrator/agents/FileInsightAgent.ts

import * as vscode from 'vscode';
import { ConversationContext } from "../context/conversationContext";
import { CacheAgent } from "./CacheAgent";
import { ToolRunner } from "../../tools/core/toolRunner";
import { executeModelInteraction, getPromptDefinitions } from "../../models/promptSystem";
import { buildCodeAnalyzerVariables, buildCodeFragmenterVariables } from "../../models/prompts";
import { EventEmitter } from 'events';

// Define the interface for the prompt system functions we need
interface PromptSystemFunctions {
    executeModelInteraction: typeof executeModelInteraction;
    getPromptDefinitions: typeof getPromptDefinitions;
}

// Define events emitted by FileInsightAgent
interface FileInsightAgentEvents {
    'statusChanged': (chatId: string, status: 'idle' | 'working' | 'error', task?: string, message?: string) => void; // <-- Add status event
    'fileInsightsReady': (chatId: string, insights: any) => void;
    'highPriorityInsight': (chatId: string, insight: any) => void;
}

// Augment EventEmitter to be typed
export interface FileInsightAgent extends EventEmitter {
    on<U extends keyof FileInsightAgentEvents>(event: U, listener: FileInsightAgentEvents[U]): this;
    emit<U extends keyof FileInsightAgentEvents>(event: U, ...args: Parameters<FileInsightAgentEvents[U]>): boolean;
}


export class FileInsightAgent extends EventEmitter {
    private cacheAgent: CacheAgent;
    private promptSystemFunctions: PromptSystemFunctions;
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext, promptSystemFunctions: PromptSystemFunctions) {
        super();
        this.context = context;
        this.cacheAgent = new CacheAgent(context);
        this.promptSystemFunctions = promptSystemFunctions;
        console.log('[FileInsightAgent] Initialized.');
    }

    /**
     * Processes a list of file paths asynchronously.
     * Gets content, checks cache, analyzes/fragments if needed, and updates cache.
     * Stores results in ConversationContext.
     * @param filePaths Array of file paths relative to workspace.
     * @param convContext The ConversationContext.
     * @returns A promise that resolves when processing is complete.
     */
    public async processFiles(filePaths: string[], convContext: ConversationContext): Promise<void> {
        const chatId = convContext.getChatId();
        console.log(`[FileInsightAgent:${chatId}] Starting file processing for ${filePaths.length} files...`);
        this.emit('statusChanged', chatId, 'working', 'file_processing'); // <-- Emit status

        const results: { [filePath: string]: { analysis?: any, fragments?: any, error?: string } } = {};
        let highPriorityFound = false;

        const existingInsights = convContext.getAnalyzedFileInsights() || {};

        for (const filePath of filePaths) {
            // Check if this file has already been processed and cached with the current content/objective
            // This check is now handled *inside* the loop per file, using the cache agent.
            // The outer loop just ensures we attempt to process each file in the list.

             this.emit('statusChanged', chatId, 'working', `processing:${filePath}`); // <-- Emit status per file

            try {
                const fileContent = await ToolRunner.runTool('filesystem.getFileContents', { filePath });

                if (fileContent === 'file not found') {
                     console.warn(`[FileInsightAgent:${chatId}] File not found, skipping: ${filePath}`);
                     results[filePath] = { error: 'File not found' };
                     this.emit('statusChanged', chatId, 'idle', `processing:${filePath}`); // <-- Emit status per file
                     continue;
                }

                // Get the document from the workspace if it's already open
                const document = vscode.workspace.textDocuments.find(doc => doc.uri.fsPath === filePath);
                // Use the document's language ID if available, otherwise infer from file extension
                const languageId = document?.languageId || filePath.split('.').pop() || 'plaintext';
                const flowContext = convContext.getCurrentFlowContext();
                const objective = flowContext?.getObjective();


                // --- Process Analysis ---
                const analysisCacheKey = `fileAnalysis:${filePath}`;
                let analysis = await this.cacheAgent.get(analysisCacheKey, fileContent);

                if (!analysis) {
                    console.log(`[FileInsightAgent:${chatId}] Cache miss for analysis: ${filePath}. Running analysis prompt.`);
                    try {
                        const analysisVariables = buildCodeAnalyzerVariables({
                             fileContent, filePath, languageId,
                             ...flowContext?.getResolutionContext()
                        });
                        analysis = await this.promptSystemFunctions.executeModelInteraction('codeAnalyzer', analysisVariables);
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


                // --- Process Fragments ---
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
                             fragments = await this.promptSystemFunctions.executeModelInteraction('codeFragmenter', fragmentVariables);
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

                 this.emit('statusChanged', chatId, 'idle', `processing:${filePath}`); // <-- Emit status per file

            } catch (error: any) {
                console.error(`[FileInsightAgent:${chatId}] Unexpected error processing file ${filePath}:`, error);
                results[filePath] = { error: error.message || String(error) };
                 this.emit('statusChanged', chatId, 'error', `processing:${filePath}`, error.message || String(error)); // <-- Emit status per file
            }
        }

        // Store results in ConversationContext state
        const mergedInsights = { ...existingInsights, ...results };
        convContext.setAnalyzedFileInsights(mergedInsights);
        console.log(`[FileInsightAgent:${chatId}] File processing complete. Results stored in ConversationContext.`);

        // Emit event indicating completion and potential high priority
        this.emit('fileInsightsReady', chatId, mergedInsights);
        if (highPriorityFound) {
             this.emit('highPriorityInsight', chatId, mergedInsights);
        }
        this.emit('statusChanged', chatId, 'idle', 'file_processing'); // <-- Emit status
    }

    dispose(): void {
        console.log('[FileInsightAgent] Disposing.');
        this.cacheAgent.dispose();
        this.removeAllListeners();
    }
}