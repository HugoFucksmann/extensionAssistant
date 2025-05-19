// src/orchestrator/OrchestratorService.ts

import { compiledGraph, GraphDependencies } from './graph'; // Import the compiled graph and dependency interface
import { PromptService } from '../models/PromptService';
import { LangChainToolAdapter } from '../tools/core/LangChainToolAdapter';
import { TurnStateService } from '../contextServices/TurnStateService';
// No need to import ContextResolver here, it's used internally by TurnStateService
import { ValidatorService } from '../validation/ValidatorService'; // Needed to pass to graph dependencies
import { TraceService } from '../observability/TraceService'; // Needed to manage traces
import { EventEmitterService } from '../events/EventEmitterService'; // Needed to pass to graph dependencies

/**
 * Orchestrates the execution of a single turn using the LangGraph workflow.
 * Manages the lifecycle of the turn state and trace.
 */
export class OrchestratorService {
    private graphDependencies: GraphDependencies;

    private traceService: TraceService; // Keep reference to manage traces
    private turnStateService: TurnStateService; // Keep reference to manage turn state lifecycle
    private modelManager: any; // Need model manager to get abort controller (TODO: Inject ModelManager)


    constructor(
        // Inject all services needed by the graph nodes
        promptService: PromptService,
        toolAdapter: LangChainToolAdapter,
        turnStateService: TurnStateService,
        validatorService: ValidatorService,
        traceService: TraceService,
        eventEmitterService: EventEmitterService,
        // Inject ModelManager to get the AbortController
        modelManager: any // TODO: Define a proper interface or import ModelManager class
    ) {
        // Store dependencies to pass to graph nodes
        this.graphDependencies = {
            promptService,
            toolAdapter,
            turnStateService,
            validatorService,
             // TraceService and EventEmitterService are often used directly by services,
             // but can be passed to graph dependencies if nodes need them directly
            // traceService, // Nodes use TurnStateService which uses TraceService
            // eventEmitterService, // Services used by nodes use EventEmitterService
        };

        this.traceService = traceService;
        this.turnStateService = turnStateService;
        this.modelManager = modelManager; // Store ModelManager reference
        console.log('[OrchestratorService] Initialized with graph dependencies.');
    }

    /**
     * Runs a single turn of the AI assistant workflow for a given user message.
     * @param chatId The ID of the conversation.
     * @param userMessage The user's message.
     * @param referencedFiles Files referenced in the message.
     * @returns A Promise resolving to the final assistant response.
     */
    async runTurn(chatId: string, userMessage: string, referencedFiles: string[] = []): Promise<string | any> {
        const traceId = this.traceService.startTrace(`Turn: ${chatId}`, { userMessage, referencedFiles });
        console.log(`[OrchestratorService] Starting turn for chat ${chatId}, trace ${traceId}`);

        try {
            // 1. Initialize the turn state
            const initialState = await this.turnStateService.initializeTurn(
                chatId,
                userMessage,
                referencedFiles,
                traceId // Pass trace ID to TurnStateService
            );

            // 2. Invoke the compiled LangGraph workflow
            // LangGraph's invoke method can take configuration, including signal for aborting.
            // It also takes the input state and any values needed by the nodes (like our services).
            const finalState = await compiledGraph.invoke(
                { values: initialState },  // Wrap state in a 'values' object
                {

                    // Config object for LangGraph execution
                    // thread_id: chatId, // Optional: if using LangGraph's built-in checkpointing (more complex)
                    recursionLimit: 50, // Prevent infinite loops in graph (default is usually fine, or define max planning iterations in planner prompt logic)
                    // Pass services/dependencies here so node functions can access them
                    // LangGraph's invoke takes a 'config' object, and nodes can access config.configurable
                    // Or, the graph definition itself can bind services.
                    // A simpler way is to pass the dependencies as a second argument to node functions,
                    // which requires configuring this when compiling the graph.
                    // Let's assume the node functions are defined to accept `(state, dependencies)`
                    configurable: this.graphDependencies, // Pass dependencies via configurable
                    // Pass abort signal from ModelManager
                    signal: this.modelManager.getAbortController()?.signal,
                }
            );


            // 3. Process the final state
            // The final response is expected to be stored in the state by the 'respond' node
            const finalResponse = finalState.finalResponse || "Sorry, I couldn't generate a response."; // Define a fallback


            // 4. End the turn state lifecycle
            this.turnStateService.endTurn();

            // 5. End the trace
            this.traceService.endTrace(traceId, finalResponse);
             console.log(`[OrchestratorService] Turn completed for chat ${chatId}, trace ${traceId}`);


            return finalResponse;

        } catch (error: any) {
            console.error(`[OrchestratorService] Error during turn execution for chat ${chatId}, trace ${traceId}:`, error);

            // End the turn state lifecycle (important even on error)
            this.turnStateService.endTurn();

            // End the trace with failure
            this.traceService.failTrace(traceId, error);

            // Re-throw the error or return a user-friendly error message
            // Returning a message might be better for the UI
             return `Sorry, an error occurred while processing your request: ${error.message || String(error)}`;
            // throw error; // Re-throw if calling layer handles specific errors
        }
    }

    // Method to get the AbortController from ModelManager
    // This is a temporary access for the graph invocation.
    // A cleaner approach might involve a dedicated AbortService or passing signal down.
    // For now, we'll directly call a method on ModelManager (assuming it exists).
    // Let's add getAbortController to ModelManager.

    dispose(): void {
        // LangGraph compiled graph doesn't need dispose in this usage pattern.
        // Services disposed by ServiceFactory.
        console.log('[OrchestratorService] Disposed.');
    }
}