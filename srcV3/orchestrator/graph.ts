// src/orchestrator/graph.ts
// MODIFIED: Pass state.traceId to promptService.executePrompt calls.

import { StateGraph, StateGraphArgs, END } from '@langchain/langgraph';
import { IFlowContextState } from './context/flowContext'; // Import our state interface
import { PromptService } from '../models/PromptService'; // Import PromptService
import { LangChainToolAdapter } from '../tools/core/LangChainToolAdapter'; // Import ToolAdapter
import { TurnStateService } from '../contextServices/TurnStateService'; // Import TurnStateService
import { ContextResolver } from '../contextServices/ContextResolver'; // Import ContextResolver
import { PlannerResponse } from './execution/types'; // Import PlannerResponse type
import { ValidatorService } from '../validation/ValidatorService'; // Import ValidatorService for sanity checks
import { ExecutionStepEntity } from '../store/interfaces/IStepRepository'; // Import for typing step data
import { listTools } from '../tools/core'; // Import listTools for planner variables
import { getPromptMetadata, getAllPromptMetadata } from '../models/prompts/promptMetadata'; // Import prompt metadata accessors
import { PromptType } from './types';


// Define the structure of the graph's state.
// LangGraph requires state to be a simple object or a class with serializable properties.
// Our IFlowContextState is designed for this.
const graphState: StateGraphArgs<IFlowContextState>['channels'] = {
    // Map IFlowContextState properties to LangGraph channels if needed,
    // but often, you can just use the state object directly.
    // Let's use the state object directly for simplicity, treating it as a single channel.
    // The nodes will receive the full state object.
};

// Define the nodes and edges of the graph.
// The actual services (PromptService, ToolAdapter, etc.) are dependencies
// that will be provided to the node functions, typically via closure or an argument.
// We will define the node functions here, assuming they receive an object
// containing the necessary services.

interface GraphDependencies {
    promptService: PromptService;
    toolAdapter: LangChainToolAdapter;
    turnStateService: TurnStateService;
    // ContextResolver is static, no need to inject instance
    validatorService: ValidatorService;
    // TraceService is used within PromptService/ToolAdapter, maybe not needed directly in nodes
    // EventEmitterService is used by lower level services
}

// --- Node Functions ---

/**
 * Node: Analyze user input to determine intent and extract entities.
 */
const analyze_input_node = async (state: IFlowContextState, options?: Record<string, any>): Promise<Partial<IFlowContextState>> => {
    const dependencies = options?.configurable?.dependencies as GraphDependencies;
    console.log('[Graph] Executing node: analyze_input');
    const { promptService, turnStateService } = dependencies;

    // Build the context snapshot for this step
    const contextSnapshot = turnStateService.buildResolutionContextSnapshot();

    // Execute the input analyzer prompt
    // MODIFIED: Pass state.traceId to executePrompt
    const analysisResult = await promptService.executePrompt('inputAnalyzer', contextSnapshot, state.traceId!); // Pass traceId


    // Update state with the analysis result.
    // Use TurnStateService.updateTurnState to also persist the step details.
    // Note: Step persistence is handled *inside* PromptService/ToolAdapter now,
    // called by the service methods *before* they return.
    // The node's responsibility is to update the *in-memory* state object
    // with the result returned by the service.

    const stateUpdates: Partial<IFlowContextState> = {
         analysisResult: analysisResult, // Store the analysis result in state
         // Any other state updates based on analysis
     };

    // TurnStateService.updateTurnState is primarily for persisting the step entity
    // and adding to planning history. It also applies the state updates.
    // The step entity data is built *inside* PromptService/ToolAdapter now.
    // We just need to call updateTurnState with the result to update the in-memory state
    // and add the step to planning history.
    // Let's refine updateTurnState: it should receive the *completed* step entity
    // data from the service (or infer it from the state update and result)
    // and the state updates.

    // Re-thinking TurnStateService.updateTurnState:
    // It receives stepEntityData (partial or complete) AND stateUpdates.
    // It saves/updates the step entity in DB.
    // It adds the step result/info to planningHistory in the state.
    // It applies stateUpdates to the in-memory state.
    // The service (PromptService/ToolAdapter) should return the result, NOT call updateTurnState.
    // The NODE should call updateTurnState *after* the service returns.

    // Let's revert the change where PromptService/ToolAdapter call updateTurnState.
    // They should only call TraceService and EventEmitterService.
    // The node calls the service, gets the result, builds the step entity data,
    // and calls TurnStateService.updateTurnState.

    // --- REVISED PLAN FOR updateTurnState CALLS ---
    // PromptService/ToolAdapter: Call TraceService (addStep, endLastStep, failLastStep) and EventEmitterService. Return result or throw error.
    // Node: Call Service, get result. Build step entity data. Call TurnStateService.updateTurnState(stepData, stateUpdates).

    // Let's revert the changes in PromptService and LangChainToolAdapter regarding TurnStateService calls.
    // And update the nodes here to call TurnStateService.updateTurnState.

    // --- Reverting PromptService and LangChainToolAdapter ---
    // (This requires going back and removing the TurnStateService calls from those files)
    // Assuming that's done...

    // --- Node logic now ---
    // The result is returned by promptService.executePrompt
    // Build the step entity data based on the result and state
     const stepEntityData: Partial<ExecutionStepEntity> = {
         // id will be generated by persistence service
         traceId: state.traceId!, // traceId is in state
         chatId: state.chatId!, // chatId is in state
         stepName: 'AnalyzeInput',
         stepType: 'prompt' as const,
         stepExecute: 'inputAnalyzer',
         stepParams: contextSnapshot, // Store the context snapshot used
         startTime: Date.now(), // Start time captured before prompt call (ideally) or use a timestamp from promptService if it tracks duration
         endTime: Date.now(), // End time captured after prompt call
         status: 'completed' as const,
         result: analysisResult, // Store the result
         planningIteration: state.planningIteration,
     };

     // Update state and persist step via TurnStateService
     const finalState = await turnStateService.updateTurnState(stepEntityData, stateUpdates);

    return finalState; // Return the updated state
}


/**
 * Node: Plan the next action based on the current state and objective.
 */
const plan_node = async (state: IFlowContextState, options?: Record<string, any>): Promise<Partial<IFlowContextState>> => {
    const dependencies = options?.configurable?.dependencies as GraphDependencies;
    console.log('[Graph] Executing node: plan');
    const { promptService, turnStateService } = dependencies;

    // Build the context snapshot for this step (includes previous step results)
    const contextSnapshot = turnStateService.buildResolutionContextSnapshot();

    // Execute the planner prompt
    // MODIFIED: Pass state.traceId to executePrompt
    const plannerResponse = await promptService.executePrompt<PlannerResponse>('planner', contextSnapshot, state.traceId!); // Pass traceId


    // Build step entity data
    const stepEntityData: Partial<ExecutionStepEntity> = {
        traceId: state.traceId!,
        chatId: state.chatId!,
        stepName: `Plan:${state.planningIteration || 1}`,
        stepType: 'prompt' as const,
        stepExecute: 'planner',
        stepParams: contextSnapshot,
        startTime: Date.now(), // Capture start time
        endTime: Date.now(), // Capture end time
        status: 'completed' as const,
        result: plannerResponse,
         planningIteration: state.planningIteration,
    };

     const stateUpdates: Partial<IFlowContextState> = {
         // Store the planner response itself or relevant parts in state
          // Storing the full response might be useful for the next planning iteration
         plannerResponse: plannerResponse, // Store planner output
          // Increment planning iteration for the next loop
         planningIteration: (state.planningIteration || 1) + 1,
     };

     // Update state and persist step via TurnStateService
     const finalState = await turnStateService.updateTurnState(stepEntityData, stateUpdates);


    return finalState; // Return the updated state, including plannerResponse
}

/**
 * Node: Execute a tool call decided by the planner.
 */
const execute_tool_node = async (state: IFlowContextState, options?: Record<string, any>): Promise<Partial<IFlowContextState>> => {
    const dependencies = options?.configurable?.dependencies as GraphDependencies;
    console.log('[Graph] Executing node: execute_tool');
    const { toolAdapter, turnStateService } = dependencies;

    // Get the planner's decision from the state
    const plannerResponse = state.plannerResponse as PlannerResponse | undefined;

    if (!plannerResponse || plannerResponse.action !== 'tool' || !plannerResponse.toolName) {
         // This node should only be reached if action is 'tool'.
         // If state is somehow inconsistent, handle gracefully.
         console.error('[Graph] execute_tool_node reached without valid tool action in plannerResponse.');
         const errorMsg = 'execute_tool_node called without valid planner tool action';
         const stepEntityData: Partial<ExecutionStepEntity> = {
              traceId: state.traceId!,
              chatId: state.chatId!,
              stepName: `ExecuteTool:Error:${state.planningIteration || 1}`,
              stepType: 'tool' as const,
              stepExecute: plannerResponse?.toolName || 'unknown',
              stepParams: plannerResponse?.params,
              startTime: Date.now(),
              endTime: Date.now(),
              status: 'failed' as const,
              error: errorMsg,
              planningIteration: state.planningIteration,
         };
          const stateUpdates: Partial<IFlowContextState> = {
             // Maybe add an error message to state that planner or conversation responder can pick up
              executionError: errorMsg,
         };
         return turnStateService.updateTurnState(stepEntityData, stateUpdates);
    }

    const toolName = plannerResponse.toolName;
    const toolParams = plannerResponse.params || {}; // Params should be resolved by planner using placeholders
    const storeAs = plannerResponse.storeAs;

    let toolResult: any;
    let executionError: any;
    let status: ExecutionStepEntity['status'] = 'completed'; // Assume success
    let stepStartTime = Date.now(); // Capture start time


    try {
        // Execute the tool via the adapter. Pass the traceId.
        // The adapter's func wrapper will get traceId from LangChain config/state
        // when called by LangChain, but runTool can also be called directly (e.g., by UIBridge).
        // We need to ensure the traceId is passed correctly here.
        // The adapter's func wrapper calls runTool *internally*.
        // So, the node just needs to call the tool via the adapter's LangChain tool instance.
        // LangGraph's ToolNode handles calling the 'func' method of the tool instance.
        // The 'func' method in the adapter will get the traceId from the state in the config object.
        // So, the node itself doesn't call toolAdapter.runTool directly here.
        // Instead, the node's *return value* should indicate the tool call, and LangGraph handles it.

        // --- REVISED PLAN FOR TOOL EXECUTION ---
        // The planner node returns { action: 'tool', toolName, params, storeAs }.
        // The conditional edge from 'plan' routes to 'execute_tool'.
        // The 'execute_tool' node *receives* the state with the planner's decision.
        // This node's purpose is to *trigger* the tool execution.
        // LangGraph's built-in ToolNode or a custom node that calls the tool adapter is needed.
        // Our current `execute_tool_node` is defined as a standard node function, not a ToolNode.
        // It seems the original architecture intended a custom node function that *calls* the tool adapter directly.
        // Let's stick to that, but ensure tracing/persistence is handled correctly.

        // Reverting to the previous logic where this node calls toolAdapter.runTool,
        // but ensuring traceId is passed and step persistence is handled *after* the call.

        // Get the context snapshot to resolve tool parameters if the adapter doesn't do it internally
        // The adapter's `runTool` method *does* handle validation and tracing steps internally.
        // We just need to call it and get the result.

        toolResult = await toolAdapter.runTool(toolName, toolParams, state.traceId!); // Pass traceId


        // Update state with the tool result, stored under the specified key
         const stateUpdates: Partial<IFlowContextState> = {};
         if (storeAs) {
              stateUpdates[storeAs] = toolResult;
         } else {
              // If no storeAs, maybe store under a default key or warn
               console.warn(`[Graph] Tool execution for ${toolName} completed but no 'storeAs' key was specified. Result will not be stored in state.`);
         }

        // Step persistence and history update are handled *inside* toolAdapter.runTool now.
        // We just need to apply the state updates.
        // Let's simplify: TurnStateService.updateTurnState is only for planner history and state updates,
        // NOT for step persistence anymore. StepPersistenceService is called directly by ToolAdapter/PromptService.

        // --- REVISED PLAN FOR PERSISTENCE ---
        // ToolAdapter/PromptService: Call TraceService and StepPersistenceService directly.
        // TurnStateService: Only manages in-memory state and planning history array.
        // Node: Call Service, get result. Call TurnStateService.updateTurnState(stateUpdates).

        // Reverting TurnStateService.updateTurnState to only update state and history.
        // And reverting PromptService/ToolAdapter to call StepPersistenceService.

        // Assuming those reverts are done...

        // --- Node logic now ---
        // The result is returned by toolAdapter.runTool
        // Add the step result/info to planning history via TurnStateService
         const historyEntry = {
             action: `tool:${toolName}`,
             stepName: `Tool:${toolName}:${state.planningIteration || 1}`,
             result: toolResult, // Store the result in history
             status: 'completed',
             timestamp: Date.now(), // Use current time or time from toolAdapter if it returns it
         };
         if (state.planningHistory) {
             state.planningHistory.push(historyEntry);
         } else {
              state.planningHistory = [historyEntry];
         }

         // Apply state updates
         Object.assign(state, stateUpdates);


    } catch (error: any) {
        executionError = error;
        console.error(`[Graph] Tool execution failed for ${toolName}:`, error);

         // Add the error to planning history via TurnStateService
         const historyEntry = {
             action: `tool:${toolName}`,
             stepName: `Tool:${toolName}:${state.planningIteration || 1}`,
             error: error.message || String(error), // Store the error in history
             status: 'failed',
             timestamp: Date.now(),
         };
         if (state.planningHistory) {
             state.planningHistory.push(historyEntry);
         } else {
              state.planningHistory = [historyEntry];
         }

         // Also add the error to the state for the planner/responder to see
         const stateUpdates: Partial<IFlowContextState> = {
              [`${storeAs}_error`]: error.message || String(error), // Store error associated with the tool result key
              executionError: `Tool ${toolName} failed: ${error.message || String(error)}`, // General error flag
         };
         Object.assign(state, stateUpdates);

        // LangGraph nodes should usually return the updated state, not throw,
        // unless the error is critical and should halt the entire graph.
        // Let's return the state including the error, allowing the planner to decide the next step.
    }

     // The state is updated internally by Object.assign.
     // Return the current state reference or relevant updates.
     // Returning the full state is typical for LangGraph nodes.
     return state; // Return the modified state object
}


/**
 * Node: Execute a prompt call decided by the planner.
 */
const execute_prompt_node = async (state: IFlowContextState, options?: Record<string, any>): Promise<Partial<IFlowContextState>> => {
    const dependencies = options?.configurable?.dependencies as GraphDependencies;
    console.log('[Graph] Executing node: execute_prompt');
    const { promptService, turnStateService } = dependencies;

    // Get the planner's decision from the state
    const plannerResponse = state.plannerResponse as PlannerResponse | undefined;

     if (!plannerResponse || plannerResponse.action !== 'prompt' || !plannerResponse.promptType) {
         console.error('[Graph] execute_prompt_node reached without valid prompt action in plannerResponse.');
         const errorMsg = 'execute_prompt_node called without valid planner prompt action';
         const historyEntry = {
              action: `prompt:error:${plannerResponse?.promptType || 'unknown'}`,
              stepName: `ExecutePrompt:Error:${state.planningIteration || 1}`,
              error: errorMsg,
              status: 'failed',
              timestamp: Date.now(),
         };
         if (state.planningHistory) state.planningHistory.push(historyEntry); else state.planningHistory = [historyEntry];

         const stateUpdates: Partial<IFlowContextState> = {
              executionError: errorMsg,
         };
         Object.assign(state, stateUpdates);
         return state; // Return state with error
     }


    const promptType = plannerResponse.promptType as PromptType; // Cast to PromptType
    const storeAs = plannerResponse.storeAs;
     // Prompt params are not taken from plannerResponse.params for PromptService.executePrompt.
     // PromptService's builders use the consolidated context snapshot.

    // Get the context snapshot for building prompt variables
    const contextSnapshot = turnStateService.buildResolutionContextSnapshot();

    let promptResult: any;
    let executionError: any;
    let status: ExecutionStepEntity['status'] = 'completed'; // Assume success
    let stepStartTime = Date.now(); // Capture start time


    try {
        // Execute the prompt via the service
        // MODIFIED: Pass state.traceId to executePrompt
        promptResult = await promptService.executePrompt(promptType, contextSnapshot, state.traceId!); // Pass traceId

        // Update state with the prompt result, stored under the specified key
         const stateUpdates: Partial<IFlowContextState> = {};
         if (storeAs) {
              stateUpdates[storeAs] = promptResult;
         } else {
              console.warn(`[Graph] Prompt execution for ${promptType} completed but no 'storeAs' key was specified. Result will not be stored in state.`);
         }

         // Add the step result/info to planning history via TurnStateService
         const historyEntry = {
             action: `prompt:${promptType}`,
             stepName: `Prompt:${promptType}:${state.planningIteration || 1}`,
             result: promptResult, // Store the result in history
             status: 'completed',
             timestamp: Date.now(), // Use current time or time from promptService
         };
         if (state.planningHistory) {
             state.planningHistory.push(historyEntry);
         } else {
              state.planningHistory = [historyEntry];
         }

         // Apply state updates
         Object.assign(state, stateUpdates);


    } catch (error: any) {
        executionError = error;
        console.error(`[Graph] Prompt execution failed for ${promptType}:`, error);

         // Add the error to planning history via TurnStateService
         const historyEntry = {
             action: `prompt:${promptType}`,
             stepName: `Prompt:${promptType}:${state.planningIteration || 1}`,
             error: error.message || String(error), // Store the error in history
             status: 'failed',
             timestamp: Date.now(),
         };
         if (state.planningHistory) {
             state.planningHistory.push(historyEntry);
         } else {
              state.planningHistory = [historyEntry];
         }

         // Also add the error to the state for the planner/responder to see
         const stateUpdates: Partial<IFlowContextState> = {
              [`${storeAs}_error`]: error.message || String(error), // Store error associated with the prompt result key
              executionError: `Prompt ${promptType} failed: ${error.message || String(error)}`, // General error flag
         };
         Object.assign(state, stateUpdates);
    }

    return state; // Return updated state
}

/**
 * Node: Generate the final response to the user.
 * This is typically the END node or a node directly preceding END.
 */
const respond_node = async (state: IFlowContextState, options?: Record<string, any>): Promise<Partial<IFlowContextState>> => {
    const dependencies = options?.configurable?.dependencies as GraphDependencies;
     console.log('[Graph] Executing node: respond');
     const { turnStateService } = dependencies; // Need TurnStateService to update final result

     const plannerResponse = state.plannerResponse as PlannerResponse | undefined;

     if (!plannerResponse || plannerResponse.action !== 'respond' || !plannerResponse.params?.messageToUser) {
         console.error('[Graph] respond_node reached without valid respond action in plannerResponse.');
          // Fallback response if planner output is invalid
          const finalMessage = "Sorry, I couldn't generate a final response.";
          const stateUpdates: Partial<IFlowContextState> = { finalResponse: finalMessage };

           // Log this as a final step in history
          const historyEntry = {
               action: `respond:fallback`,
               stepName: `Respond:Error:${state.planningIteration || 1}`,
               result: finalMessage,
               error: 'respond_node called without valid planner respond action',
               status: 'failed', // The response itself is a fallback due to planning error
               timestamp: Date.now(),
          };
          if (state.planningHistory) state.planningHistory.push(historyEntry); else state.planningHistory = [historyEntry];

          Object.assign(state, stateUpdates);
         return state; // Return the final response in state
     }

     // The planner's `params.messageToUser` is the intended final response.
     // LangGraph state updates are merged. Set a specific key for the final response.
     const finalMessage = plannerResponse.params.messageToUser;

     // Log this as the final step in history
      const historyEntry = {
           action: `respond:final`,
           stepName: `Respond:${state.planningIteration || 1}`,
           result: finalMessage,
           status: 'completed',
           timestamp: Date.now(),
      };
      if (state.planningHistory) state.planningHistory.push(historyEntry); else state.planningHistory = [historyEntry];

      const stateUpdates: Partial<IFlowContextState> = { finalResponse: finalMessage };
      Object.assign(state, stateUpdates);


     return state; // Add final response to state
 }

// --- Graph Definition ---

// Definir el grafo usando el método encadenado para evitar problemas de tipado
const workflow = new StateGraph<IFlowContextState>({ channels: graphState })
    .addNode('analyze_input', analyze_input_node)
    .addNode('plan', plan_node)
    .addNode('execute_tool', execute_tool_node) // This node now calls toolAdapter.runTool directly
    .addNode('execute_prompt', execute_prompt_node) // This node now calls promptService.executePrompt directly
    .addNode('respond', respond_node) // Node to format and set the final response
    .addNode('fallback_error_response', async (state: IFlowContextState, options?: Record<string, any>) => {
        const dependencies = options?.configurable?.dependencies as GraphDependencies;
        console.log('[Graph] Executing node: fallback_error_response');
        const { turnStateService } = dependencies;

        // Get the last error or use a default message
        const errorMessage = state.executionError || state.planningHistory?.slice(-1)[0]?.error || "An unexpected error occurred during planning or execution.";
        const finalMessage = `Sorry, I encountered an issue and cannot proceed: ${errorMessage}`;

        // Log this fallback step in history
        const historyEntry = {
            action: `respond:fallback:error`,
            stepName: `Respond:Fallback:${state.planningIteration || 1}`,
            result: finalMessage,
            error: state.executionError || state.planningHistory?.slice(-1)[0]?.error, // Include underlying error
            status: 'completed', // The fallback itself completed
            timestamp: Date.now(),
        };
        if (state.planningHistory) state.planningHistory.push(historyEntry); else state.planningHistory = [historyEntry];

        state.finalResponse = finalMessage;
        return state; // Set the final response in state
    })
    .setEntryPoint('analyze_input')
    .addEdge('analyze_input', 'plan') // After analysis, always plan

    // Define conditional edges from the 'plan' node
    // The 'plan' node returns the updated state including `plannerResponse`.
    .addConditionalEdges(
        'plan', // From node 'plan'
        // The function to determine the next node based on state
        (state: IFlowContextState) => {
            const plannerResponse = state.plannerResponse as PlannerResponse | undefined;
            if (!plannerResponse) {
                console.error('[Graph] Planner did not return a valid response structure.');
                // Transition to a fallback or error handling node/state
                return 'fallback_error_response'; // Need to define this node/edge
            }
            switch (plannerResponse.action) {
                case 'tool':
                    return 'execute_tool'; // Go to tool execution node
                case 'prompt':
                    return 'execute_prompt'; // Go to prompt execution node
                case 'respond':
                    return 'respond'; // Go to the respond node
                default:
                    console.error(`[Graph] Planner returned unknown action: ${plannerResponse.action}`);
                    return 'fallback_error_response'; // Handle unknown action
            }
        }
        // Optionally map returned string keys to node names if they differ
        // For now, assume keys match node names ('execute_tool', 'execute_prompt', 'respond')
    )
    // Edges after tool/prompt execution always go back to plan (for iterative planning)
    .addEdge('execute_tool', 'plan')
    .addEdge('execute_prompt', 'plan')
    // Edge from respond node leads to END
    .addEdge('respond', END)
    // Fallback node goes to respond node which will then go to END
    .addEdge('fallback_error_response', 'respond');

// Compile the graph. This makes it ready to be invoked.
// The services (dependencies) are not part of the compiled graph structure,
// but are needed at runtime when nodes are executed. They will be passed
// during the graph invocation by the OrchestratorService.
export const compiledGraph = workflow.compile();

// Export the graph dependencies interface for the OrchestratorService
export { GraphDependencies };