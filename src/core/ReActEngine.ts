// src/core/ReActEngine.ts
import { WindsurfState, HistoryEntry, ActionResult, ReasoningResult } from '../shared/types'; // Added ActionResult, ReasoningResult
import { LanguageModelService } from './LanguageModelService';
import { ToolRegistry } from '../features/tools/ToolRegistry';
import { InternalEventDispatcher } from './events/InternalEventDispatcher';
import { EventType, AgentPhaseEventPayload, ResponseEventPayload, SystemEventPayload } from '../features/events/eventTypes'; // Import specific payloads
import { ToolResult } from '../features/tools/types';
import { getConfig } from '../shared/config';
import { z } from 'zod'; // For potential tool description generation

const config = getConfig(process.env.NODE_ENV === 'production' ? 'production' : 'development');

// Helper to generate a string description of tool parameters from Zod schema
// This is a simplified version. For complex schemas (e.g. nested objects, unions, etc.),
// you might need a more robust Zod to JSON Schema or Zod to string description library.
function zodSchemaToDescription(schema: z.ZodTypeAny): string {
  if (!schema || !schema._def) return "No parameters defined.";

  const def = schema._def;

  if (def.typeName === z.ZodFirstPartyTypeKind.ZodObject) {
    const shape = def.shape();
    const params = Object.entries(shape)
      .map(([key, val]: [string, any]) => {
        let typeDesc = val._def?.typeName || 'unknown';
        if (val._def?.innerType?._def?.typeName) { // For ZodOptional, ZodDefault
            typeDesc = val._def.innerType._def.typeName;
        }
        if (val._def?.typeName === z.ZodFirstPartyTypeKind.ZodEnum) {
            typeDesc = `enum: [${val._def.values.join(', ')}]`;
        }
        const description = val.description || '';
        return `  - ${key} (${typeDesc})${description ? ': ' + description : ''}`;
      })
      .join('\n');
    return params.length > 0 ? `Parameters:\n${params}` : "No parameters.";
  }
  return "Parameters schema is not a simple object.";
}


export class ReActEngine {
  private toolsDescriptionCache: string | null = null;

  constructor(
    private languageModelService: LanguageModelService,
    private toolRegistry: ToolRegistry,
    private dispatcher: InternalEventDispatcher
  ) {
    this.dispatcher.systemInfo('ReActEngine initialized.', { source: 'ReActEngine' }, 'ReActEngine');
  }

  private getToolsDescription(): string {
    if (this.toolsDescriptionCache) {
      return this.toolsDescriptionCache;
    }
    this.toolsDescriptionCache = this.toolRegistry.getAllTools()
      .map(tool => {
        const paramDesc = zodSchemaToDescription(tool.parametersSchema);
        return `Tool Name: ${tool.name}\nDescription: ${tool.description}\n${paramDesc}`;
      })
      .join('\n\n---\n\n');
    return this.toolsDescriptionCache;
  }

  private addHistoryEntry(
    state: WindsurfState, 
    phase: HistoryEntry['phase'], 
    content: string | Record<string, any>, // Allow structured content
    metadata: Partial<HistoryEntry['metadata']> = {}
  ): void {
    const entry: HistoryEntry = {
      phase,
      content: typeof content === 'string' ? content : JSON.stringify(content, null, 2), // Pretty print if object
      timestamp: Date.now(),
      iteration: state.iterationCount, // Iteration should be set before calling this
      metadata: {
        status: 'success', // Default, can be overridden by caller
        ...metadata,
      },
    };
    state.history.push(entry);
    // Log the history entry for debugging if needed
    // console.debug(`[ReActEngine:${state.chatId}] History added: Phase: ${phase}, Iteration: ${state.iterationCount}`);
  }

  public async run(initialState: WindsurfState): Promise<WindsurfState> {
    let currentState: WindsurfState = { 
        ...initialState,
        completionStatus: 'in_progress',
        iterationCount: 0, // Ensure iterationCount starts at 0 for this run
        error: undefined, // Clear previous errors for this run
        finalOutput: undefined, // Clear previous final output
        reasoningResult: undefined,
        actionResult: undefined,
    };

    const maxIterations = currentState.maxIterations || config.backend.react.maxIterations;
    const toolsDescription = this.getToolsDescription();

    this.dispatcher.dispatch(EventType.CONVERSATION_STARTED, { // Or a more specific AGENT_RUN_STARTED
        chatId: currentState.chatId,
        userMessage: currentState.userMessage,
        source: 'ReActEngine'
    });

    const agentPhaseDispatch = (phase: AgentPhaseEventPayload['phase'], status: 'started' | 'completed', data?: any, error?: string) => {
      const payload: AgentPhaseEventPayload = {
          phase,
          chatId: currentState.chatId,
          iteration: currentState.iterationCount,
          source: 'ReActEngine',
          ...(data && { data }),
          ...(error && { error }),
      };
      this.dispatcher.dispatch(status === 'started' ? EventType.AGENT_PHASE_STARTED : EventType.AGENT_PHASE_COMPLETED, payload);
    };

    while (currentState.iterationCount < maxIterations && currentState.completionStatus === 'in_progress') {
      currentState.iterationCount++; // Increment at the start of the iteration
      const currentIteration = currentState.iterationCount;

      // --- 1. Reason (Think) ---
      agentPhaseDispatch('reasoning', 'started');
      const reasoningOutput = await this.languageModelService.generateReasoning(currentState, toolsDescription);
      
      currentState.reasoningResult = { // Store the structured reasoning result
        reasoning: reasoningOutput.thought,
        plan: [], // Plan steps are not part of this simplified ReAct
        nextAction: { 
          toolName: reasoningOutput.toolName || '', 
          params: reasoningOutput.toolInput || {} 
        }
      };
      this.addHistoryEntry(currentState, 'reasoning', reasoningOutput, { status: reasoningOutput.error ? 'error' : 'success' });

      if (reasoningOutput.error) {
        currentState.error = `Reasoning error: ${reasoningOutput.error}`;
        agentPhaseDispatch('reasoning', 'completed', { thought: reasoningOutput.thought }, currentState.error);
        // Let the loop continue, the next reasoning step might try to recover or decide to fail.
        // Or, if critical, set completionStatus to 'failed' and break.
        // For now, we'll let it try to proceed to final response generation if no tool is picked.
        if (!reasoningOutput.toolName) { // If error and no tool, likely means it should fail or respond with error
            currentState.completionStatus = 'failed'; // Or 'error'
            break;
        }
      } else {
        agentPhaseDispatch('reasoning', 'completed', { thought: reasoningOutput.thought, action: {name: reasoningOutput.toolName, input: reasoningOutput.toolInput} });
      }
      
      // --- 2. Action (Act) ---
      const { toolName, toolInput } = reasoningOutput;

      if (toolName && toolName.trim() !== "") {
        agentPhaseDispatch('action', 'started', { toolName, toolInput });

        const toolResult: ToolResult = await this.toolRegistry.executeTool(
            toolName, 
            toolInput || {}, // Ensure toolInput is at least an empty object if undefined
            { chatId: currentState.chatId, uiOperationId: (currentState as any).uiOperationId } // Pass uiOperationId if available
        );
        
        const observation = toolResult.success ? toolResult.data : toolResult.error;
        currentState.actionResult = { // Store the structured action result
            toolName,
            params: toolInput || {},
            success: toolResult.success,
            result: toolResult.data,
            error: toolResult.error,
            timestamp: Date.now()
        };
        this.addHistoryEntry(currentState, 'action', 
          { toolName, toolInput: toolInput || {}, result: observation, success: toolResult.success }, 
          { 
            status: toolResult.success ? 'success' : 'error', 
            tool_executions: [{ 
                name: toolName, 
                parameters: toolInput || {}, 
                result: toolResult.data, 
                error: toolResult.error, 
                status: toolResult.success ? 'completed' : 'error',
                duration: toolResult.executionTime 
            }]
          }
        );

        if (!toolResult.success) {
          currentState.error = `Tool '${toolName}' failed: ${toolResult.error}`;
          agentPhaseDispatch('action', 'completed', { toolName, toolInput, result: observation }, currentState.error);
          // Decide if this is fatal. For now, let the next reasoning step handle the error.
          // If the error is from a permission denial, it might be a good point to stop.
          if (toolResult.error?.toLowerCase().includes('permission denied')) {
              currentState.completionStatus = 'failed';
              break;
          }
        } else {
          agentPhaseDispatch('action', 'completed', { toolName, toolInput, result: observation });
        }

        // Special handling for a tool that sends the response
        // Common names: "sendResponseToUser", "respond", "finalAnswer"
        const responseToolNames = ['sendResponseToUser', 'respond', 'finalAnswer']; 
        if (responseToolNames.includes(toolName)) {
          if (toolResult.success && toolResult.data) {
            // The tool's data might be a string or an object like { message: "..." }
            currentState.finalOutput = typeof toolResult.data === 'string' 
                ? toolResult.data 
                : (toolResult.data as any)?.message || JSON.stringify(toolResult.data);
            // Add a specific history entry for this type of response generation
            this.addHistoryEntry(currentState, 'responseGeneration', 
                { toolUsed: toolName, response: currentState.finalOutput }, 
                { status: 'success', toolName }
            );
          } else {
            currentState.finalOutput = `Error using tool ${toolName} to respond: ${toolResult.error}`;
            this.addHistoryEntry(currentState, 'responseGeneration', 
                { toolUsed: toolName, error: toolResult.error }, 
                { status: 'error', toolName }
            );
            currentState.error = currentState.finalOutput; // Also set top-level error
          }
          currentState.completionStatus = toolResult.success ? 'completed' : 'failed';
          break; 
        }
      } else { // No tool specified by LLM
        this.addHistoryEntry(currentState, 'system_message', "LLM decided no tool is needed. Proceeding to generate final response.", { iteration: currentIteration });
        // This implies the LLM thinks it can answer directly or the task is done.
        // The loop will break, and final response generation will occur.
        currentState.completionStatus = 'completed'; // Mark to proceed to final response generation outside loop
        break; // Exit loop to generate final response
      }
      // --- 3. Observe: Observation is part of toolResult and added to history. ---

      // --- 4. Decide: (Implicitly handled by loop condition and break statements) ---
      // More complex reflection/correction steps are omitted in this simplified version.
      // If an error occurred in action, the next reasoning step will see it in history.
    } // End of while loop

    // --- Generate Final Response (if not already done by a tool and not critically failed) ---
    if (currentState.completionStatus !== 'completed' || !currentState.finalOutput) {
      if (currentState.iterationCount >= maxIterations && currentState.completionStatus !== 'failed') {
        this.addHistoryEntry(currentState, 'system_message', "Max iterations reached.", { status: 'error', iteration: currentState.iterationCount });
        currentState.error = currentState.error ? `${currentState.error}; Max iterations reached.` : "Max iterations reached without completing the objective.";
        currentState.completionStatus = 'failed';
      }
      
      // Only generate a new final response if not already completed by a tool and not in a hard failed state
      if (currentState.completionStatus !== 'failed'  && !currentState.finalOutput) {
        agentPhaseDispatch('finalResponseGeneration', 'started');
        const finalUserResponse = await this.languageModelService.generateFinalResponse(currentState);
        currentState.finalOutput = finalUserResponse;
        this.addHistoryEntry(currentState, 'responseGeneration', finalUserResponse, { iteration: currentState.iterationCount });
        currentState.completionStatus = 'completed'; // Mark as completed after generating response
        agentPhaseDispatch('finalResponseGeneration', 'completed', { response: finalUserResponse });
      }
    }

    // --- Dispatch final events ---
    if (currentState.finalOutput && (currentState.completionStatus === 'completed' || currentState.completionStatus === 'in_progress' /* just in case */)) {
        const responsePayload: ResponseEventPayload = {
            responseContent: typeof currentState.finalOutput === 'string' ? currentState.finalOutput : JSON.stringify(currentState.finalOutput),
            isFinal: true,
            chatId: currentState.chatId,
            source: 'ReActEngine',
            // operationId: (currentState as any).uiOperationId // Pass if available
        };
        this.dispatcher.dispatch(EventType.RESPONSE_GENERATED, responsePayload);
        currentState.completionStatus = 'completed'; // Ensure it's marked completed
    } else if (currentState.error && currentState.completionStatus !== 'completed') { // If there's an error and not successfully completed
        const errorPayload: SystemEventPayload = { // Or a more specific AGENT_ERROR
            message: `Agent run failed for chat ${currentState.chatId}: ${currentState.error}`,
            level: 'error',
            chatId: currentState.chatId,
            details: { 
                lastPhase: currentState.history.slice(-1)[0]?.phase, 
                iterationCount: currentState.iterationCount,
                fullError: currentState.error
            },
            source: 'ReActEngine'
        };
        this.dispatcher.dispatch(EventType.SYSTEM_ERROR, errorPayload);
        if (currentState.completionStatus !== 'failed' ) {
            currentState.completionStatus = 'failed'; // Ensure it's marked as failed
        }
    } else if (currentState.completionStatus !== 'completed') {
        // Catch-all for cases where it didn't complete, didn't error explicitly, but has no output
        this.addHistoryEntry(currentState, 'system_message', "Agent run finished without a final output or explicit error.", { status: 'error', iteration: currentState.iterationCount });
        currentState.completionStatus = 'failed'; // Or some other status like 'unknown_outcome'
        currentState.error = currentState.error || "Agent finished without a clear outcome.";
         const errorPayload: SystemEventPayload = {
            message: `Agent run finished inconclusively for chat ${currentState.chatId}.`,
            level: 'warning',
            chatId: currentState.chatId,
            details: { lastPhase: currentState.history.slice(-1)[0]?.phase, iterationCount: currentState.iterationCount },
            source: 'ReActEngine'
        };
        this.dispatcher.dispatch(EventType.SYSTEM_WARNING, errorPayload);
    }
    
   

    this.dispatcher.dispatch(EventType.CONVERSATION_ENDED, { // Or AGENT_RUN_ENDED
        chatId: currentState.chatId,
        finalStatus: currentState.completionStatus,
        duration: Date.now() - (initialState.timestamp || Date.now()), // Requires initialState to have a start timestamp
        source: 'ReActEngine'
    });

    return currentState;
  }
}