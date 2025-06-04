// src/core/OptimizedReActEngine.ts
import { WindsurfState } from './types';
import { HistoryEntry } from '../features/chat/types';
import { ToolRegistry } from '../features/tools/ToolRegistry';
import { InternalEventDispatcher } from './events/InternalEventDispatcher';
import { EventType, AgentPhaseEventPayload, ResponseEventPayload, ToolExecutionEventPayload } from '../features/events/eventTypes';
import { ModelManager } from '../features/ai/ModelManager';
import { runOptimizedAnalysisChain } from '../features/ai/lcel/OptimizedAnalysisChain';
import { runOptimizedReasoningChain } from '../features/ai/lcel/OptimizedReasoningChain';
import { runOptimizedActionChain } from '../features/ai/lcel/OptimizedActionChain';
import { runOptimizedResponseChain } from '../features/ai/lcel/OptimizedResponseChain';
import { ReasoningOutput } from '../features/ai/prompts/optimized/reasoningPrompt';
import { ActionOutput } from '../features/ai/prompts/optimized/actionPrompt';
import { ResponseOutput } from '../features/ai/prompts/optimized/responsePrompt';
import { MemoryManager } from '../features/memory/MemoryManager';
import { z, ZodObject, ZodOptional, ZodEffects, ZodTypeAny } from 'zod';
import { ToolResult as InternalToolResult } from '../features/tools/types';
import { getReactConfig } from '../shared/utils/configUtils';

export class OptimizedReActEngine {
  private toolsDescriptionCache: string | null = null;
  private readonly MAX_ITERATIONS: number;

  constructor(
    private modelManager: ModelManager,
    private toolRegistry: ToolRegistry,
    private dispatcher: InternalEventDispatcher,
    private memoryManager: MemoryManager
  ) {
    this.dispatcher.systemInfo('OptimizedReActEngine initialized.', { source: 'OptimizedReActEngine' }, 'OptimizedReActEngine');
    this.MAX_ITERATIONS = getReactConfig().maxIterations;
  }

  private getToolsDescription(): string {
    if (this.toolsDescriptionCache) {
      return this.toolsDescriptionCache;
    }

    this.toolsDescriptionCache = this.toolRegistry.getAllTools()
      .map(tool => {
        const paramsDescription = tool.parametersSchema ?
          this.zodSchemaToDescription(tool.parametersSchema) :
          'No requiere parámetros';

        return `${tool.name}: ${tool.description}\nParámetros:\n${paramsDescription}`;
      })
      .join('\n\n');

    return this.toolsDescriptionCache;
  }

  private zodSchemaToDescription(schema: z.ZodTypeAny): string {
    if (!schema) return "No se definieron parámetros.";

    if (schema.description) {
      return schema.description;
    }

    try {
      if (schema instanceof ZodObject) {
        const shape = schema.shape as Record<string, ZodTypeAny>;
        if (!shape || Object.keys(shape).length === 0) return "El objeto de parámetros no tiene campos definidos.";

        return Object.entries(shape)
          .map(([key, val]: [string, ZodTypeAny]) => {
            let currentVal = val;
            let isOptional = false;

            if (currentVal instanceof ZodOptional) {
              isOptional = true;
              currentVal = currentVal._def.innerType;
            }
            if (currentVal instanceof ZodEffects) {
              currentVal = currentVal._def.schema;

              if (currentVal instanceof ZodOptional) {
                isOptional = true;
                currentVal = currentVal._def.innerType;
              }
            }

            const typeName = (currentVal._def?.typeName || 'unknown').replace('Zod', '').toLowerCase();
            const description = currentVal.description ? ` - ${currentVal.description}` : '';

            return `  - ${key}${isOptional ? ' (opcional)' : ' (requerido)'}: ${typeName}${description}`;
          })
          .join('\n');
      }
      else if (schema.description) {
        return schema.description;
      }
      else if (schema._def?.typeName) {
        return `Tipo: ${schema._def.typeName.replace('Zod', '').toLowerCase()}`;
      } else {
        return "No se pudo determinar la estructura detallada de los parámetros. Consulte la definición de la herramienta.";
      }
    } catch (error) {
      console.error('Error al convertir esquema Zod a descripción:', error);
      return "Error al procesar el esquema de parámetros. Consulte la definición de la herramienta.";
    }
  }

  private addHistoryEntry(
    state: WindsurfState,
    phase: HistoryEntry['phase'],
    content: string | Record<string, any>,
    metadata: Partial<HistoryEntry['metadata']> = {}
  ): void {
    const entry: HistoryEntry = {
      timestamp: Date.now(),
      phase: phase,
      content: typeof content === 'string' ? content : JSON.stringify(content),
      metadata: {
        status: 'success',
        ...metadata,
        iteration: state.iterationCount,
      }
    };
    state.history.push(entry);
  }

  private async getMemoryContext(chatId: string, userMessage: string): Promise<string> {
    // Get relevant memories from persistent storage
    const relevantMemories = await this.memoryManager.getRelevantMemories({
      objective: userMessage,
      userMessage,
      extractedEntities: { filesMentioned: [], functionsMentioned: [] }
    }, 5);

    // Get recent conversation context from runtime
    const recentState = this.memoryManager.getRuntime<WindsurfState>(chatId, 'lastState');
    const recentObjective = this.memoryManager.getRuntime<string>(chatId, 'lastObjective');

    let memoryContext = '';

    if (relevantMemories.length > 0) {
      memoryContext += 'Relevant past experiences:\n';
      memoryContext += relevantMemories
        .map(item => `- ${JSON.stringify(item.content)}`)
        .join('\n');
      memoryContext += '\n\n';
    }

    if (recentState && recentObjective) {
      memoryContext += `Recent context: Last objective was "${recentObjective}"\n`;
    }

    return memoryContext.trim();
  }

  public async run(initialState: WindsurfState): Promise<WindsurfState> {
    const currentState = { ...initialState };
    currentState.iterationCount = currentState.iterationCount || 0;
    currentState.history = currentState.history || [];

    // Get memory context
    const memoryContext = await this.getMemoryContext(currentState.chatId, currentState.userMessage || '');

    const agentPhaseDispatch = (
      phase: AgentPhaseEventPayload['phase'],
      status: 'started' | 'completed',
      data?: any,
      error?: string
    ): void => {
      const eventType = status === 'started'
        ? EventType.AGENT_PHASE_STARTED
        : EventType.AGENT_PHASE_COMPLETED;

      const payload: AgentPhaseEventPayload = {
        phase,
        chatId: currentState.chatId,
        data,
        error,
        source: 'OptimizedReActEngine',
        timestamp: Date.now(),
        iteration: currentState.iterationCount
      };
      this.dispatcher.dispatch(eventType, payload);
    };

    const startTime = Date.now();

    try {
      // === ANÁLISIS INICIAL ===
      agentPhaseDispatch('initialAnalysis', 'started');
      const model = this.modelManager.getActiveModel();
      console.log('[OptimizedReActEngine] --- Fase de análisis inicial ---');

      const analysisResult = await runOptimizedAnalysisChain({
        userQuery: currentState.userMessage || '',
        availableTools: this.toolRegistry.getToolNames(),
        codeContext: JSON.stringify(currentState.editorContext || currentState.projectContext || {}),
        memoryContext,
        model
      });

      console.log('[OptimizedReActEngine] Resultado de análisis:', JSON.stringify(analysisResult, null, 2));
      this.addHistoryEntry(currentState, 'reasoning', analysisResult, { phase_details: 'initial_analysis' });
      agentPhaseDispatch('initialAnalysis', 'completed', { analysis: analysisResult });

      // Store analysis in runtime memory
      this.memoryManager.setRuntime(currentState.chatId, 'currentAnalysis', analysisResult);

      const toolResultsAccumulator: Array<{ tool: string, toolCallResult: InternalToolResult }> = [];
      let isCompleted = false;

      // === CICLO PRINCIPAL ===
      while (!isCompleted && currentState.iterationCount < this.MAX_ITERATIONS) {
        currentState.iterationCount++;
        const iterationStartTime = Date.now();
        console.log(`[OptimizedReActEngine] --- Iteración ${currentState.iterationCount} ---`);

        // === RAZONAMIENTO ===
        agentPhaseDispatch('reasoning', 'started');
        const reasoningResult: ReasoningOutput = await runOptimizedReasoningChain({
          userQuery: currentState.userMessage || '',
          analysisResult,
          toolsDescription: this.getToolsDescription(),
          previousToolResults: toolResultsAccumulator.map(tr => ({
            name: tr.tool,
            result: tr.toolCallResult.data ?? tr.toolCallResult.error ?? "No data/error from tool"
          })),
          memoryContext,
          model
        });

        console.log('[OptimizedReActEngine] Resultado de razonamiento:', JSON.stringify(reasoningResult, null, 2));
        this.addHistoryEntry(currentState, 'reasoning', reasoningResult);
        agentPhaseDispatch('reasoning', 'completed', { reasoning: reasoningResult });

        // Store reasoning in runtime memory
        this.memoryManager.setRuntime(currentState.chatId, 'lastReasoning', reasoningResult);

        // Si decide responder, completar
        if (reasoningResult.nextAction === 'respond') {
          console.log('[OptimizedReActEngine] El modelo decidió responder al usuario.');
          currentState.finalOutput = reasoningResult.response || 'No specific response content provided by model.';
          isCompleted = true;
          continue;
        }

        // === DEDUPLICACIÓN ===
        if (!currentState._executedTools) {
          currentState._executedTools = new Set<string>();
        }

        const toolParamsHash = (tool: string, params: any) => {
          const ordered = (obj: any) =>
            obj && typeof obj === 'object' && !Array.isArray(obj)
              ? Object.keys(obj).sort().reduce((acc, k) => { acc[k] = ordered(obj[k]); return acc; }, {} as any)
              : obj;
          return `${tool}::${JSON.stringify(ordered(params || {}))}`;
        };

        const execKey = toolParamsHash(
          reasoningResult.tool ?? '',
          reasoningResult.parameters
        );

        if (currentState._executedTools.has(execKey)) {
          console.warn(`[OptimizedReActEngine] Tool deduplicada: ${reasoningResult.tool} con mismos parámetros ya ejecutada en este ciclo.`);
          continue;
        }
        currentState._executedTools.add(execKey);

        // === EJECUCIÓN DE HERRAMIENTA ===
        if (reasoningResult.nextAction === 'use_tool' && reasoningResult.tool) {
          const toolExecutionStartTime = Date.now();
          const operationId = `${currentState.chatId || 'nochat'}-${Date.now()}-${reasoningResult.tool}`;

          console.log(`[OptimizedReActEngine] Ejecutando herramienta: ${reasoningResult.tool} con parámetros:`, reasoningResult.parameters);

          try {
            const internalToolResult: InternalToolResult = await this.toolRegistry.executeTool(
              reasoningResult.tool!,
              reasoningResult.parameters ?? {},
              { chatId: currentState.chatId, operationId }
            );

            console.log(`[OptimizedReActEngine] Resultado de herramienta (${reasoningResult.tool}):`, JSON.stringify(internalToolResult, null, 2));

            const toolExecParams = reasoningResult.parameters === null ? undefined : reasoningResult.parameters;

            this.addHistoryEntry(currentState, 'action', {
              tool: reasoningResult.tool,
              parameters: toolExecParams,
              result_summary: internalToolResult.success ? "Success" : `Error: ${internalToolResult.error}`
            }, {
              tool_executions: [{
                name: reasoningResult.tool!,
                parameters: toolExecParams,
                status: internalToolResult.success ? 'completed' : 'error',
                result: internalToolResult.data,
                error: internalToolResult.error,
                startTime: toolExecutionStartTime,
                endTime: Date.now(),
                duration: Date.now() - toolExecutionStartTime,
              }]
            });

            toolResultsAccumulator.push({
              tool: reasoningResult.tool!,
              toolCallResult: internalToolResult
            });

            // Store tool result in runtime memory
            this.memoryManager.setRuntime(currentState.chatId, `toolResult_${reasoningResult.tool}`, {
              tool: reasoningResult.tool!,
              success: internalToolResult.success,
              data: internalToolResult.data,
              error: internalToolResult.error,
              timestamp: Date.now()
            });

            // === ANÁLISIS POST-HERRAMIENTA ===
            const actionResult: ActionOutput = await runOptimizedActionChain({
              userQuery: currentState.userMessage || '',
              lastToolName: reasoningResult.tool!,
              lastToolResult: internalToolResult.data ?? internalToolResult.error ?? "No data/error from tool",
              previousActions: toolResultsAccumulator.slice(0, -1).map(tr => ({
                tool: tr.tool,
                result: tr.toolCallResult.data ?? tr.toolCallResult.error ?? "No data/error from tool"
              })),
              memoryContext,
              model
            });

            console.log('[OptimizedReActEngine] Resultado de acción:', JSON.stringify(actionResult, null, 2));
            this.addHistoryEntry(currentState, 'action', actionResult, { phase_details: 'action_interpretation' });

            const duration = Date.now() - toolExecutionStartTime;
            const toolDescription = this.toolRegistry.getTool(reasoningResult.tool!)?.description;

            const finalToolEventPayload: ToolExecutionEventPayload = {
              toolName: reasoningResult.tool!,
              parameters: reasoningResult.parameters ?? undefined,
              toolDescription: toolDescription || '',
              rawOutput: internalToolResult.data,
              error: internalToolResult.error,
              duration,
              isProcessingStep: false,
              modelAnalysis: actionResult,
              toolSuccess: internalToolResult.success,
              chatId: currentState.chatId,
              source: 'OptimizedReActEngine',
              operationId,
              timestamp: Date.now()
            };

            // Enviar el evento apropiado según el resultado
            const eventType = internalToolResult.success
              ? EventType.TOOL_EXECUTION_COMPLETED
              : EventType.TOOL_EXECUTION_ERROR;

            this.dispatcher.dispatch(eventType, finalToolEventPayload);

            if (actionResult.nextAction === 'respond') {
              currentState.finalOutput = actionResult.response || 'No specific response content provided by model after tool use.';
              isCompleted = true;
            }

          } catch (toolError: any) {
            const errorMessage = `Error durante la ejecución o análisis de la herramienta ${reasoningResult.tool}: ${toolError.message}`;
            this.addHistoryEntry(currentState, 'system_message', errorMessage, { status: 'error' });

            const duration = Date.now() - toolExecutionStartTime;
            const toolDescription = this.toolRegistry.getTool(reasoningResult.tool!)?.description;

            this.dispatcher.dispatch(EventType.TOOL_EXECUTION_ERROR, {
              toolName: reasoningResult.tool!,
              parameters: reasoningResult.parameters ?? undefined,
              rawOutput: null,
              error: toolError.message,
              duration,
              toolDescription,
              isProcessingStep: false,
              modelAnalysis: null,
              toolSuccess: false,
              chatId: currentState.chatId,
              source: 'OptimizedReActEngine',
              operationId,
              timestamp: Date.now()
            });
          }

        } else if (reasoningResult.nextAction === 'use_tool' && !reasoningResult.tool) {
          const errorMsg = "Model decided to use a tool but did not specify which tool.";
          console.warn(`[OptimizedReActEngine] ${errorMsg}`);
          this.addHistoryEntry(currentState, 'system_message', errorMsg, { status: 'error' });
          currentState.finalOutput = "I tried to use a tool, but I'm unsure which one. Can you clarify?";
          isCompleted = true;
        }

        console.log(`[OptimizedReActEngine] Iteración ${currentState.iterationCount} completada en ${Date.now() - iterationStartTime}ms`);
      }

      // === GENERACIÓN DE RESPUESTA FINAL ===
      if (!currentState.finalOutput && !isCompleted) {
        agentPhaseDispatch('finalResponseGeneration', 'started');
        const responseResult = await runOptimizedResponseChain({
          userQuery: currentState.userMessage || '',
          toolResults: toolResultsAccumulator.map(tr => ({
            tool: tr.tool,
            result: tr.toolCallResult.data ?? tr.toolCallResult.error ?? "No data/error from tool"
          })),
          analysisResult,
          memoryContext,
          model
        }) as ResponseOutput;

        currentState.finalOutput = responseResult.response || "The process completed, but no specific final response was generated.";
        this.addHistoryEntry(currentState, 'responseGeneration', responseResult);
        agentPhaseDispatch('finalResponseGeneration', 'completed', { response: responseResult });
      }

      // Store conversation state in memory
      await this.memoryManager.storeConversation(currentState.chatId, currentState);

      currentState.completionStatus = 'completed';

    } catch (error: any) {
      console.error('[OptimizedReActEngine] Error durante la ejecución:', error);
      currentState.error = error.message;
      currentState.completionStatus = 'failed';

      this.dispatcher.dispatch(EventType.SYSTEM_ERROR, {
        message: `Error en OptimizedReActEngine: ${error.message}`,
        level: 'error',
        chatId: currentState.chatId,
        details: { error: error.stack || error.toString() },
        source: 'OptimizedReActEngine',
        timestamp: Date.now()
      });
    }

    // === EVENTO DE RESPUESTA FINAL ===
    if (currentState.finalOutput) {
      const responseContentStr = typeof currentState.finalOutput === 'string'
        ? currentState.finalOutput
        : JSON.stringify(currentState.finalOutput, null, 2);

      const responsePayload: ResponseEventPayload = {
        responseContent: responseContentStr,
        isFinal: true,
        chatId: currentState.chatId,
        source: 'OptimizedReActEngine',
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        metadata: {}
      };
      this.dispatcher.dispatch(EventType.RESPONSE_GENERATED, responsePayload);
    }

    return currentState;
  }

  public dispose(): void {
    this.toolsDescriptionCache = null;
  }
}