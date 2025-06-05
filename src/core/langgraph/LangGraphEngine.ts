// src/core/langgraph/LangGraphEngine.ts
import { StateGraph, CompiledStateGraph, MemorySaver, START } from "@langchain/langgraph";
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { ModelManager } from '../../features/ai/ModelManager';
import { ToolRegistry } from '../../features/tools/ToolRegistry';
import { InternalEventDispatcher } from '../events/InternalEventDispatcher';
import { MemoryManager } from '../../features/memory/MemoryManager';
import { WindsurfState } from '@core/types';
import { EventType, AgentPhaseEventPayload, ResponseEventPayload } from '@features/events/eventTypes';

import { OptimizedGraphState, GraphStateAnnotation } from './LangGraphState';
import { HybridMemorySystem } from './HybridMemorySystem';
import { PerformanceMonitor } from '../monitoring/PerformanceMonitor';

import { Disposable } from '../interfaces/Disposable';

// Import node functions
import { analyzeNodeFunc } from './nodes/analyzeNode';
import { executeNodeFunc } from './nodes/executeNode';
import { validateNodeFunc } from './nodes/validateNode';
import { respondNodeFunc } from './nodes/respondNode';
import { getConfig } from "@shared/config2";
import { HistoryEntry } from "@features/chat/types";

export class LangGraphEngine implements Disposable {
    // Using any to bypass type checking issues with LangGraph's internal types
    private graph: any;
    private hybridMemory: HybridMemorySystem;
    private executedToolsInSession: Set<string> = new Set<string>();
    private maxIterations: number;

    constructor(
        private modelManager: ModelManager,
        private toolRegistry: ToolRegistry,
        private dispatcher: InternalEventDispatcher,
        private memoryManager: MemoryManager,
        private performanceMonitor: PerformanceMonitor
    ) {
        this.hybridMemory = new HybridMemorySystem(this.memoryManager, this.modelManager);
        this.maxIterations = getConfig(process.env.NODE_ENV === 'production' ? 'production' : 'development').backend.langgraph.maxIterations;
        
        // Initialize the graph after all other properties are set
        this.graph = this.buildOptimizedGraph();

        this.dispatcher.systemInfo('LangGraphEngine initialized.', { source: 'LangGraphEngine', maxIterations: this.maxIterations }, 'LangGraphEngine');
    }

    private buildOptimizedGraph() {
        const nodeDependencies = {
            modelManager: this.modelManager,
            toolRegistry: this.toolRegistry,
            dispatcher: this.dispatcher,
            hybridMemory: this.hybridMemory,
            performanceMonitor: this.performanceMonitor,
            executedToolsInSession: this.executedToolsInSession
        };

        return new StateGraph(GraphStateAnnotation)
            // Add nodes
            .addNode("analyze", async (state: OptimizedGraphState) => {
                return await analyzeNodeFunc(state, nodeDependencies);
            })
            .addNode("execute", async (state: OptimizedGraphState) => {
                return await executeNodeFunc(state, nodeDependencies);
            })
            .addNode("validate", async (state: OptimizedGraphState) => {
                return await validateNodeFunc(state, nodeDependencies);
            })
            .addNode("respond", async (state: OptimizedGraphState) => {
                return await respondNodeFunc(state, nodeDependencies);
            })
            // Add edges
            .addEdge(START, "analyze")
            .addConditionalEdges("analyze",
                (state: OptimizedGraphState) => this.shouldExecute(state),
                {
                    "execute": "execute",
                    "respond": "respond",
                    "__end__": "__end__"
                }
            )
            .addConditionalEdges("execute",
                (state: OptimizedGraphState) => this.shouldContinue(state),
                {
                    "execute": "execute",
                    "validate": "validate",
                    "respond": "respond",
                    "__end__": "__end__"
                }
            )
            .addConditionalEdges("validate",
                (state: OptimizedGraphState) => this.shouldRetry(state),
                {
                    "execute": "execute",
                    "respond": "respond",
                    "__end__": "__end__"
                }
            )
            .addEdge("respond", "__end__")
            .compile({
                checkpointer: new MemorySaver(),
            });
    }

    // Conditional edge logic
    private shouldExecute(state: OptimizedGraphState): "execute" | "respond" | "__end__" {
        if (state.metadata.isCompleted) return "__end__";
        if (state.execution.plan && state.execution.plan.length > 0) {
            return "execute";
        }
        return "respond";
    }

    private shouldContinue(state: OptimizedGraphState): "execute" | "validate" | "respond" | "__end__" {
        if (state.metadata.isCompleted) return "__end__";

        if (state.validation && state.validation.errors && state.validation.errors.length > 0) {
            return "validate";
        }

        if (state.context.iteration >= this.maxIterations) {
            this.dispatcher.systemWarning(
                `Max iterations (${this.maxIterations}) reached for chat ${state.metadata.chatId}. Moving to respond.`,
                { chatId: state.metadata.chatId, iteration: state.context.iteration },
                'LangGraphEngine'
            );
            return "respond";
        }

        return "execute";
    }

    private shouldRetry(state: OptimizedGraphState): "execute" | "respond" | "__end__" {
        if (state.metadata.isCompleted) return "__end__";

        if (state.validation && state.validation.corrections && state.validation.corrections.length > 0 &&
            (!state.validation.errors || state.validation.errors.length === 0)) {
            return "execute";
        }

        return "respond";
    }

    // State conversion methods
    private convertToGraphState(initialState: WindsurfState): OptimizedGraphState {
        const userMessageContent = initialState.userMessage || '';
        const initialMessages: BaseMessage[] = [new HumanMessage(userMessageContent)];

        return {
            messages: initialMessages,
            context: {
                working: `Initial objective: ${initialState.objective || userMessageContent}`,
                memory: "",
                iteration: 0,
            },
            execution: {
                plan: [],
                tools_used: [],
            },
            validation: undefined,
            metadata: {
                chatId: initialState.chatId,
                startTime: Date.now(),
                isCompleted: false,
                finalOutput: undefined,
            }
        };
    }

    private convertFromGraphState(graphResult: OptimizedGraphState, originalState: WindsurfState): WindsurfState {
        const newHistoryEntries: HistoryEntry[] = [];

        if (graphResult.metadata.finalOutput) {
            newHistoryEntries.push({
                phase: 'responseGeneration',
                content: graphResult.metadata.finalOutput,
                timestamp: Date.now(),
                iteration: graphResult.context.iteration,
                metadata: { status: 'success' }
            });
        }

        if (graphResult.validation?.errors && graphResult.validation.errors.length > 0) {
            newHistoryEntries.push({
                phase: 'system_message',
                content: `LangGraph execution encountered errors: ${graphResult.validation.errors.join(', ')}`,
                timestamp: Date.now(),
                iteration: graphResult.context.iteration,
                metadata: { status: 'error' }
            });
        }

        return {
            ...originalState,
            objective: graphResult.context.working || originalState.objective,
            iterationCount: originalState.iterationCount + graphResult.context.iteration,
            completionStatus: graphResult.metadata.isCompleted ?
                (graphResult.metadata.finalOutput && !graphResult.validation?.errors?.length ? 'completed' : 'failed') : 'in_progress',
            error: graphResult.validation?.errors?.join('; ') ||
                (graphResult.metadata.isCompleted && !graphResult.metadata.finalOutput ? "Processing completed without explicit output." : undefined),
            finalOutput: graphResult.metadata.finalOutput,
            history: [...(originalState.history || []), ...newHistoryEntries],
        };
    }

    public async run(initialState: WindsurfState): Promise<WindsurfState> {
        this.dispatcher.systemInfo(`LangGraphEngine run started for chat: ${initialState.chatId}`, { chatId: initialState.chatId }, 'LangGraphEngine');
        this.executedToolsInSession.clear();

        const graphInputState = this.convertToGraphState(initialState);
        let finalGraphState: OptimizedGraphState;

        try {
            const result = await this.graph.invoke(graphInputState, {
                configurable: { thread_id: initialState.chatId }
            });

            finalGraphState = result as OptimizedGraphState;

            if (!finalGraphState.metadata.isCompleted && !finalGraphState.metadata.finalOutput) {
                finalGraphState.metadata.finalOutput = "The process concluded without a specific final response.";
                finalGraphState.metadata.isCompleted = true;
            }

        } catch (error: any) {
            this.dispatcher.systemError(
                `Critical error during LangGraph graph.invoke for chat ${initialState.chatId}: ${error.message}`,
                error,
                { stack: error.stack, chatId: initialState.chatId },
                'LangGraphEngine.run'
            );

            const errorGraphState: OptimizedGraphState = {
                ...graphInputState,
                metadata: {
                    ...graphInputState.metadata,
                    isCompleted: true,
                    finalOutput: "A critical error occurred during processing."
                },
                validation: { errors: [`Graph execution failed: ${error.message}`], corrections: [] }
            };
            finalGraphState = errorGraphState;
        }

        const finalWindsurfState = this.convertFromGraphState(finalGraphState, initialState);

        if (finalWindsurfState.finalOutput) {
            const responsePayload: ResponseEventPayload = {
                responseContent: finalWindsurfState.finalOutput,
                isFinal: true,
                chatId: finalWindsurfState.chatId,
                source: 'LangGraphEngine',
                timestamp: Date.now(),
                duration: Date.now() - finalGraphState.metadata.startTime,
                metadata: { completionStatus: finalWindsurfState.completionStatus }
            };
            this.dispatcher.dispatch(EventType.RESPONSE_GENERATED, responsePayload);
        }

        this.dispatcher.systemInfo(`LangGraphEngine run finished for chat: ${finalWindsurfState.chatId}`, { chatId: finalWindsurfState.chatId, status: finalWindsurfState.completionStatus }, 'LangGraphEngine');
        return finalWindsurfState;
    }

    public dispose(): void {
        this.executedToolsInSession.clear();
        this.dispatcher.systemInfo('LangGraphEngine disposed.', {}, 'LangGraphEngine');
    }
}