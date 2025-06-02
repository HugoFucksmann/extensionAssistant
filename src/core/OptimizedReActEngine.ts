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
import { ReActCycleMemory } from '../features/memory/ReActCycleMemory';
import { LongTermStorage } from '../features/memory/LongTermStorage';
import { z } from 'zod';
import { ToolResult as InternalToolResult } from '../features/tools/types'; 

export class OptimizedReActEngine {
  private toolsDescriptionCache: string | null = null;
  private MAX_ITERATIONS = 10;

  constructor(
    private modelManager: ModelManager,
    private toolRegistry: ToolRegistry,
    private dispatcher: InternalEventDispatcher,
    private longTermStorage: LongTermStorage
  ) {
    this.dispatcher.systemInfo('OptimizedReActEngine initialized.', { source: 'OptimizedReActEngine' }, 'OptimizedReActEngine');
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
        
        return `${tool.name}: ${tool.description}\nParámetros: ${paramsDescription}`;
      })
      .join('\n\n');
    
    return this.toolsDescriptionCache;
  }

  private zodSchemaToDescription(schema: z.ZodTypeAny): string {
    if (!schema || !schema._def) return "No se definieron parámetros.";
  
    try {
      if (schema._def.typeName === 'ZodObject') {
        const shape = schema._def.shape(); 
        if (!shape) return "Esquema de objeto sin forma definida.";
  
        return Object.entries(shape)
          .map(([key, val]: [string, any]) => {
            const isOptional = val._def?.typeName === 'ZodOptional' || val.isOptional();
            const innerType = isOptional ? (val._def.innerType || val._def.schema) : val; 
            const typeDesc = innerType._def?.typeName?.replace('Zod', '').toLowerCase() || 'unknown';
            const description = innerType.description ? ` - ${innerType.description}` : '';
            
            return `- ${key}${isOptional ? ' (opcional)' : ' (requerido)'}: ${typeDesc}${description}`;
          })
          .join('\n');
      } else if (schema.description) {
          return schema.description; 
      } else {
          return `Parámetro de tipo: ${schema._def.typeName?.replace('Zod', '').toLowerCase() || 'desconocido'}`;
      }
    } catch (error) {
      console.error('Error al convertir esquema Zod a descripción:', error);
      return "Error al procesar el esquema de parámetros.";
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

  public async run(initialState: WindsurfState): Promise<WindsurfState> {
    const currentState = { ...initialState };
    currentState.iterationCount = currentState.iterationCount || 0;
    currentState.history = currentState.history || [];
    
    const memory = new ReActCycleMemory(
      this.longTermStorage,
      currentState.chatId,
      { 
        userQuery: currentState.userMessage || '',
        activeFile: currentState.context?.activeFile, 
        workspaceRoot: currentState.context?.workspaceRoot 
      }
    );
    
    await memory.retrieveRelevantMemory(currentState.userMessage || '');
    const memorySummary = memory.getMemorySummary();
    
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
        memoryContext: memorySummary,
        model
      });
      
      console.log('[OptimizedReActEngine] Resultado de análisis:', JSON.stringify(analysisResult, null, 2));
      this.addHistoryEntry(currentState, 'reasoning', analysisResult, { phase_details: 'initial_analysis' }); 
      agentPhaseDispatch('initialAnalysis', 'completed', { analysis: analysisResult });
      
      memory.addToShortTermMemory({
        type: 'context',
        content: analysisResult.understanding,
        relevance: 1.0
      });
      
      const toolResultsAccumulator: Array<{tool: string, toolCallResult: InternalToolResult}> = []; 
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
          memoryContext: memory.getMemorySummary(),
          model
        });
        
        console.log('[OptimizedReActEngine] Resultado de razonamiento:', JSON.stringify(reasoningResult, null, 2));
        this.addHistoryEntry(currentState, 'reasoning', reasoningResult);
        agentPhaseDispatch('reasoning', 'completed', { reasoning: reasoningResult });

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
        
        const toolParamsHash = (tool: string, params: any, chatId: string | null) => {
          const ordered = (obj: any) =>
            obj && typeof obj === 'object' && !Array.isArray(obj)
              ? Object.keys(obj).sort().reduce((acc, k) => { acc[k] = ordered(obj[k]); return acc; }, {} as any)
              : obj;
          return `${chatId || 'nochat'}::${tool}::${JSON.stringify(ordered(params||{}))}`;
        };
        
        const execKey = toolParamsHash(
          reasoningResult.tool ?? '',
          reasoningResult.parameters,
          currentState.chatId ?? null
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
            // ToolRegistry emite TOOL_EXECUTION_STARTED automáticamente
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
                result: internalToolResult.mappedOutput, 
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

            memory.addToShortTermMemory({
              type: 'tools',
              content: {
                tool: reasoningResult.tool!,
                result: internalToolResult.success ?
                  (typeof internalToolResult.mappedOutput?.message === 'string' ? internalToolResult.mappedOutput.message.substring(0,200) : 
                   typeof internalToolResult.data === 'string' ? internalToolResult.data.substring(0, 200) :
                   'Datos obtenidos correctamente') :
                  `Error: ${internalToolResult.error}`
              },
              relevance: 0.9
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
              memoryContext: memory.getMemorySummary(),
              model
            });
            
            console.log('[OptimizedReActEngine] Resultado de acción:', JSON.stringify(actionResult, null, 2));
            this.addHistoryEntry(currentState, 'action', actionResult, { phase_details: 'action_interpretation' });

            // === EVENTO FINAL DE HERRAMIENTA ===
            const finalToolEventPayload: ToolExecutionEventPayload = {
              toolName: reasoningResult.tool!,
              parameters: reasoningResult.parameters ?? undefined,
              chatId: currentState.chatId,
              source: 'OptimizedReActEngine',
              operationId,
              timestamp: Date.now(),
              result: internalToolResult.mappedOutput,
              duration: Date.now() - toolExecutionStartTime,
              toolDescription: this.toolRegistry.getTool(reasoningResult.tool!)?.description,
              toolParams: reasoningResult.parameters ?? undefined,
              isProcessingStep: false,
              modelAnalysis: actionResult,
              rawToolOutput: internalToolResult.data,
              toolSuccess: internalToolResult.success,
            };

            // Emitir evento apropiado
            if (internalToolResult.success) {
              this.dispatcher.dispatch(EventType.TOOL_EXECUTION_COMPLETED, finalToolEventPayload);
            } else {
              this.dispatcher.dispatch(EventType.TOOL_EXECUTION_ERROR, {
                ...finalToolEventPayload,
                error: internalToolResult.error || "Tool execution failed post-analysis.",
                toolSuccess: false,
              });
            }

            // Verificar si el modelo decide responder después de la herramienta
            if (actionResult.nextAction === 'respond') {
              currentState.finalOutput = actionResult.response || 'No specific response content provided by model after tool use.';
              isCompleted = true;
            }

          } catch (toolError: any) {
            const errorMessage = `Error durante la ejecución o análisis de la herramienta ${reasoningResult.tool}: ${toolError.message}`;
            this.addHistoryEntry(currentState, 'system_message', errorMessage, { status: 'error' });
            
            this.dispatcher.dispatch(EventType.TOOL_EXECUTION_ERROR, {
              toolName: reasoningResult.tool!,
              parameters: reasoningResult.parameters ?? undefined,
              chatId: currentState.chatId,
              source: 'OptimizedReActEngine',
              operationId,
              timestamp: Date.now(),
              error: toolError.message,
              duration: Date.now() - toolExecutionStartTime,
              toolDescription: this.toolRegistry.getTool(reasoningResult.tool!)?.description,
              toolParams: reasoningResult.parameters ?? undefined,
              isProcessingStep: false,
              modelAnalysis: null,
              rawToolOutput: null,
              toolSuccess: false,
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
          memoryContext: memory.getMemorySummary(),
          model
        }) as ResponseOutput;
        
        currentState.finalOutput = responseResult.response || "The process completed, but no specific final response was generated.";
        this.addHistoryEntry(currentState, 'responseGeneration', responseResult);
        agentPhaseDispatch('finalResponseGeneration', 'completed', { response: responseResult });
      }
      
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