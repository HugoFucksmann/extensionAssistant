// src/core/LangGraphEngine.ts

import { StateGraph, CompiledGraph, MemorySaver, StateAnnotation } from "@langchain/langgraph";
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { ToolRegistry } from '../tools/ToolRegistry';
import { InternalEventDispatcher } from '../../core/events/InternalEventDispatcher';
import { ModelManager } from '../ModelManager';
import { MemoryManager } from '../../memory/MemoryManager';
import { WindsurfState } from '@core/types';
import { EventType } from '@features/events/eventTypes';
import { ToolResult as InternalToolResult } from '../../tools/types';

// Optimized State Structure
interface OptimizedGraphState {
  messages: BaseMessage[];
  context: {
    working: string;
    memory: string;
    iteration: number;
  };
  execution: {
    plan: string[];
    tools_used: string[];
    current_tool?: string;
    current_params?: any;
  };
  validation?: {
    errors: string[];
    corrections: string[];
  };
  metadata: {
    chatId: string;
    startTime: number;
    isCompleted: boolean;
    finalOutput?: string;
  };
}

// State annotation for LangGraph
const GraphStateAnnotation = StateAnnotation.Root({
  messages: StateAnnotation<BaseMessage[]>({
    reducer: (current, update) => [...(current || []), ...update],
    default: () => []
  }),
  context: StateAnnotation<{
    working: string;
    memory: string;
    iteration: number;
  }>({
    reducer: (current, update) => ({ ...current, ...update }),
    default: () => ({ working: "", memory: "", iteration: 0 })
  }),
  execution: StateAnnotation<{
    plan: string[];
    tools_used: string[];
    current_tool?: string;
    current_params?: any;
  }>({
    reducer: (current, update) => ({ ...current, ...update }),
    default: () => ({ plan: [], tools_used: [] })
  }),
  validation: StateAnnotation<{
    errors: string[];
    corrections: string[];
  } | undefined>({
    reducer: (current, update) => update ? { ...current, ...update } : current,
    default: () => undefined
  }),
  metadata: StateAnnotation<{
    chatId: string;
    startTime: number;
    isCompleted: boolean;
    finalOutput?: string;
  }>({
    reducer: (current, update) => ({ ...current, ...update }),
    default: () => ({ chatId: "", startTime: Date.now(), isCompleted: false })
  })
});

class HybridMemorySystem {
  constructor(private memoryManager: MemoryManager) {}

  async getRelevantContext(chatId: string, query: string): Promise<string> {
    const relevantMemories = await this.memoryManager.getRelevantMemories({
      objective: query,
      userMessage: query,
      extractedEntities: { filesMentioned: [], functionsMentioned: [] }
    }, 3);

    const recentState = this.memoryManager.getRuntime<WindsurfState>(chatId, 'lastState');
    const recentObjective = this.memoryManager.getRuntime<string>(chatId, 'lastObjective');

    let context = '';
    if (relevantMemories.length > 0) {
      context += 'Relevant experiences:\n';
      context += relevantMemories
        .map(item => `- ${typeof item.content === 'string' ? item.content : JSON.stringify(item.content)}`)
        .join('\n');
      context += '\n\n';
    }

    if (recentState && recentObjective) {
      context += `Recent context: Last objective was "${recentObjective}"\n`;
    }

    return context.trim();
  }

  updateWorkingMemory(chatId: string, info: string): void {
    this.memoryManager.setRuntime(chatId, 'workingMemory', info);
  }
}

export class LangGraphEngine {
  private graph: CompiledGraph<OptimizedGraphState>;
  private hybridMemory: HybridMemorySystem;
  private executedTools: Set<string> = new Set();

  constructor(
    private modelManager: ModelManager,
    private toolRegistry: ToolRegistry,
    private dispatcher: InternalEventDispatcher,
    private memoryManager: MemoryManager
  ) {
    this.hybridMemory = new HybridMemorySystem(memoryManager);
    this.graph = this.buildOptimizedGraph();
    
    this.dispatcher.systemInfo('LangGraphEngine initialized.', { source: 'LangGraphEngine' }, 'LangGraphEngine');
  }

  private buildOptimizedGraph(): CompiledGraph<OptimizedGraphState> {
    const workflow = new StateGraph(GraphStateAnnotation);

    // Add nodes
    workflow.addNode("analyze", this.analyzeNode.bind(this));
    workflow.addNode("execute", this.executeNode.bind(this));
    workflow.addNode("validate", this.validateNode.bind(this));
    workflow.addNode("respond", this.respondNode.bind(this));

    // Set entry point
    workflow.setEntryPoint("analyze");

    // Add edges
    workflow.addConditionalEdges("analyze", this.shouldExecute.bind(this));
    workflow.addConditionalEdges("execute", this.shouldContinue.bind(this));
    workflow.addConditionalEdges("validate", this.shouldRetry.bind(this));
    workflow.addEdge("respond", "__end__");

    return workflow.compile({
      checkpointer: new MemorySaver(),
      interruptBefore: ["validate"]
    });
  }

  // ANALYZE NODE - Initial analysis and planning
  private async analyzeNode(state: OptimizedGraphState): Promise<Partial<OptimizedGraphState>> {
    const userQuery = this.extractUserQuery(state.messages);
    const memoryContext = await this.hybridMemory.getRelevantContext(state.metadata.chatId, userQuery);

    this.dispatcher.dispatch(EventType.AGENT_PHASE_STARTED, {
      phase: 'initialAnalysis',
      chatId: state.metadata.chatId,
      source: 'LangGraphEngine',
      timestamp: Date.now(),
      iteration: state.context.iteration
    });

    try {
      const model = this.modelManager.getActiveModel();
      const availableTools = this.toolRegistry.getToolNames();
      
      const analysisPrompt = this.createAnalysisPrompt(userQuery, availableTools, memoryContext);
      const response = await model.invoke([new SystemMessage(analysisPrompt)]);
      
      const analysisResult = this.parseAnalysisResponse(response.content as string);
      
      return {
        context: {
          ...state.context,
          memory: memoryContext,
          working: analysisResult.understanding,
          iteration: state.context.iteration + 1
        },
        execution: {
          ...state.execution,
          plan: analysisResult.initialPlan
        },
        messages: [new AIMessage(`Analysis: ${analysisResult.understanding}`)]
      };
    } catch (error) {
      console.error('[LangGraphEngine] Error in analyze node:', error);
      return {
        metadata: { ...state.metadata, isCompleted: true, finalOutput: "Error during analysis phase" }
      };
    }
  }

  // EXECUTE NODE - Tool execution and reasoning
  private async executeNode(state: OptimizedGraphState): Promise<Partial<OptimizedGraphState>> {
    const userQuery = this.extractUserQuery(state.messages);
    
    try {
      const model = this.modelManager.getActiveModel();
      const reasoningPrompt = this.createReasoningPrompt(userQuery, state);
      const response = await model.invoke([new SystemMessage(reasoningPrompt)]);
      
      const reasoningResult = this.parseReasoningResponse(response.content as string);
      
      if (reasoningResult.nextAction === 'respond') {
        return {
          metadata: { 
            ...state.metadata, 
            isCompleted: true, 
            finalOutput: reasoningResult.response 
          }
        };
      }

      if (reasoningResult.nextAction === 'use_tool' && reasoningResult.tool) {
        // Check for deduplication
        const toolKey = `${reasoningResult.tool}::${JSON.stringify(reasoningResult.parameters || {})}`;
        if (this.executedTools.has(toolKey)) {
          return {
            metadata: { 
              ...state.metadata, 
              isCompleted: true, 
              finalOutput: "The required action was already performed. No additional attempts will be made." 
            }
          };
        }

        this.executedTools.add(toolKey);
        
        // Execute tool
        const toolResult = await this.executeTool(
          reasoningResult.tool, 
          reasoningResult.parameters || {}, 
          state.metadata.chatId
        );

        const newToolsUsed = [...state.execution.tools_used, reasoningResult.tool];
        
        return {
          execution: {
            ...state.execution,
            tools_used: newToolsUsed,
            current_tool: reasoningResult.tool,
            current_params: reasoningResult.parameters
          },
          messages: [new AIMessage(`Tool executed: ${reasoningResult.tool}, Result: ${JSON.stringify(toolResult)}`)],
          context: {
            ...state.context,
            working: state.context.working + `\nTool ${reasoningResult.tool} executed with result: ${JSON.stringify(toolResult)}`
          }
        };
      }

      return {};
    } catch (error) {
      console.error('[LangGraphEngine] Error in execute node:', error);
      return {
        validation: {
          errors: [`Execution error: ${error.message}`],
          corrections: []
        }
      };
    }
  }

  // VALIDATE NODE - Smart validation when needed
  private async validateNode(state: OptimizedGraphState): Promise<Partial<OptimizedGraphState>> {
    if (!state.validation || state.validation.errors.length === 0) {
      return {}; // Skip validation if no errors
    }

    try {
      const model = this.modelManager.getActiveModel();
      const validationPrompt = this.createValidationPrompt(state);
      const response = await model.invoke([new SystemMessage(validationPrompt)]);
      
      const corrections = this.parseValidationResponse(response.content as string);
      
      return {
        validation: {
          ...state.validation,
          corrections
        }
      };
    } catch (error) {
      console.error('[LangGraphEngine] Error in validate node:', error);
      return {};
    }
  }

  // RESPOND NODE - Final response generation
  private async respondNode(state: OptimizedGraphState): Promise<Partial<OptimizedGraphState>> {
    if (state.metadata.finalOutput) {
      return {}; // Already has final output
    }

    try {
      const model = this.modelManager.getActiveModel();
      const userQuery = this.extractUserQuery(state.messages);
      const responsePrompt = this.createResponsePrompt(userQuery, state);
      const response = await model.invoke([new SystemMessage(responsePrompt)]);
      
      return {
        metadata: {
          ...state.metadata,
          isCompleted: true,
          finalOutput: response.content as string
        }
      };
    } catch (error) {
      console.error('[LangGraphEngine] Error in respond node:', error);
      return {
        metadata: {
          ...state.metadata,
          isCompleted: true,
          finalOutput: "Error generating final response"
        }
      };
    }
  }

  // Conditional edge functions
  private shouldExecute(state: OptimizedGraphState): string {
    return state.execution.plan.length > 0 ? "execute" : "respond";
  }

  private shouldContinue(state: OptimizedGraphState): string {
    if (state.metadata.isCompleted) return "respond";
    if (state.validation && state.validation.errors.length > 0) return "validate";
    if (state.context.iteration >= 10) return "respond"; // Max iterations
    return "execute";
  }

  private shouldRetry(state: OptimizedGraphState): string {
    if (state.validation && state.validation.corrections.length > 0) return "execute";
    return "respond";
  }

  // Utility methods
  private extractUserQuery(messages: BaseMessage[]): string {
    const humanMessage = messages.find(m => m._getType() === 'human');
    return humanMessage ? humanMessage.content as string : '';
  }

  private async executeTool(toolName: string, parameters: any, chatId: string): Promise<InternalToolResult> {
    const operationId = `${chatId}-${Date.now()}-${toolName}`;
    return await this.toolRegistry.executeTool(toolName, parameters, { chatId, operationId });
  }

  // Prompt creation methods (simplified for this implementation)
  private createAnalysisPrompt(userQuery: string, availableTools: string[], memoryContext: string): string {
    return `Analyze the user query and create a plan.
Query: ${userQuery}
Available tools: ${availableTools.join(', ')}
Memory context: ${memoryContext}

Respond with JSON: {"understanding": "...", "initialPlan": ["step1", "step2"]}`;
  }

  private createReasoningPrompt(userQuery: string, state: OptimizedGraphState): string {
    return `Reason about the next action based on current state.
Query: ${userQuery}
Current plan: ${state.execution.plan.join(', ')}
Tools used: ${state.execution.tools_used.join(', ')}
Working context: ${state.context.working}

Respond with JSON: {"nextAction": "use_tool|respond", "tool": "...", "parameters": {...}, "response": "..."}`;
  }

  private createValidationPrompt(state: OptimizedGraphState): string {
    return `Validate and provide corrections for errors.
Errors: ${state.validation?.errors.join(', ')}
Current state: ${JSON.stringify(state.execution)}

Respond with JSON: {"corrections": ["correction1", "correction2"]}`;
  }

  private createResponsePrompt(userQuery: string, state: OptimizedGraphState): string {
    return `Generate final response based on execution results.
Query: ${userQuery}
Tools used: ${state.execution.tools_used.join(', ')}
Working context: ${state.context.working}

Provide a helpful response to the user.`;
  }

  // Response parsing methods (simplified)
  private parseAnalysisResponse(content: string): any {
    try {
      return JSON.parse(content);
    } catch {
      return { understanding: "Analysis completed", initialPlan: ["Process user request"] };
    }
  }

  private parseReasoningResponse(content: string): any {
    try {
      return JSON.parse(content);
    } catch {
      return { nextAction: "respond", response: content };
    }
  }

  private parseValidationResponse(content: string): string[] {
    try {
      const parsed = JSON.parse(content);
      return parsed.corrections || [];
    } catch {
      return [];
    }
  }

  // Main execution method
  public async run(initialState: WindsurfState): Promise<WindsurfState> {
    const startTime = Date.now();
    
    try {
      // Convert WindsurfState to OptimizedGraphState
      const graphState: OptimizedGraphState = {
        messages: [new HumanMessage(initialState.userMessage || '')],
        context: {
          working: '',
          memory: '',
          iteration: initialState.iterationCount || 0
        },
        execution: {
          plan: [],
          tools_used: []
        },
        metadata: {
          chatId: initialState.chatId,
          startTime,
          isCompleted: false
        }
      };

      // Execute graph
      const result = await this.graph.invoke(graphState, {
        configurable: { thread_id: initialState.chatId }
      });

      // Convert back to WindsurfState
      const finalState: WindsurfState = {
        ...initialState,
        iterationCount: result.context.iteration,
        finalOutput: result.metadata.finalOutput || "Process completed",
        completionStatus: result.metadata.isCompleted ? 'completed' : 'in_progress',
        history: [
          ...(initialState.history || []),
          {
            timestamp: Date.now(),
            phase: 'system_message',
            content: `LangGraph execution completed. Tools used: ${result.execution.tools_used.join(', ')}`,
            metadata: {
              status: 'success',
              iteration: result.context.iteration,
              duration: Date.now() - startTime
            }
          }
        ]
      };

      // Store conversation
      await this.memoryManager.storeConversation(initialState.chatId, finalState);

      // Dispatch final response event
      this.dispatcher.dispatch(EventType.RESPONSE_GENERATED, {
        responseContent: finalState.finalOutput || "No response generated",
        isFinal: true,
        chatId: initialState.chatId,
        source: 'LangGraphEngine',
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        metadata: { completionStatus: finalState.completionStatus }
      });

      return finalState;

    } catch (error: any) {
      console.error('[LangGraphEngine] Error during execution:', error);
      
      const errorState: WindsurfState = {
        ...initialState,
        error: error.message,
        completionStatus: 'failed',
        finalOutput: 'Error occurred during LangGraph execution'
      };

      this.dispatcher.dispatch(EventType.SYSTEM_ERROR, {
        message: `LangGraph error: ${error.message}`,
        level: 'error',
        chatId: initialState.chatId,
        details: { error: error.stack },
        source: 'LangGraphEngine',
        timestamp: Date.now()
      });

      return errorState;
    }
  }

  public dispose(): void {
    this.executedTools.clear();
  }
}