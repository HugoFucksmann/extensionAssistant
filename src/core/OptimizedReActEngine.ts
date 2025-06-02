// src/core/OptimizedReActEngine.ts
import { WindsurfState, HistoryEntry } from '../shared/types'; 
import { ToolRegistry } from '../features/tools/ToolRegistry';
import { InternalEventDispatcher } from './events/InternalEventDispatcher';
import { EventType, AgentPhaseEventPayload, ResponseEventPayload } from '../features/events/eventTypes';
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
      
      while (!isCompleted && currentState.iterationCount < this.MAX_ITERATIONS) {
        currentState.iterationCount++;
        const iterationStartTime = Date.now();
        console.log(`[OptimizedReActEngine] --- Iteración ${currentState.iterationCount} ---`);

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
        console.log('[OptimizedReActEngine] Decisión nextAction:', reasoningResult.nextAction);

        this.addHistoryEntry(currentState, 'reasoning', reasoningResult);
        agentPhaseDispatch('reasoning', 'completed', { reasoning: reasoningResult });

        if (reasoningResult.nextAction === 'respond') {
          console.log('[OptimizedReActEngine] El modelo decidió responder al usuario.');
          currentState.finalOutput = reasoningResult.response || 'No specific response content provided by model.';
          isCompleted = true;
          continue;
        }

        // --- DEDUPLICACIÓN DE EJECUCIÓN DE HERRAMIENTAS POR CICLO ---
        if (!currentState._executedTools) {
          currentState._executedTools = new Set<string>();
        }
        // Hash estable por tool+params+chatId
        const toolParamsHash = (tool: string, params: any, chatId: string | null) => {
          // Ordena las claves para evitar falsos positivos
          const ordered = (obj: any) =>
            obj && typeof obj === 'object' && !Array.isArray(obj)
              ? Object.keys(obj).sort().reduce((acc, k) => { acc[k] = ordered(obj[k]); return acc; }, {} as any)
              : obj;
          return `${chatId || 'nochat'}::${tool}::${JSON.stringify(ordered(params||{}))}`;
        };
        const execKey = toolParamsHash(reasoningResult.tool, reasoningResult.parameters, currentState.chatId);
        if (currentState._executedTools.has(execKey)) {
          // Ya se ejecutó esta tool+input en el ciclo actual, saltar ejecución y eventos
          console.warn(`[OptimizedReActEngine] Tool deduplicada: ${reasoningResult.tool} con mismos parámetros ya ejecutada en este ciclo.`);
          continue;
        }
        currentState._executedTools.add(execKey);
        // --- FIN DEDUPLICACIÓN ---

        if (reasoningResult.nextAction === 'use_tool' && reasoningResult.tool) {
          const toolExecutionStartTime = Date.now();
          const operationId = `${currentState.chatId || 'nochat'}-${Date.now()}-${reasoningResult.tool}`;
          this.dispatcher.dispatch(EventType.TOOL_EXECUTION_STARTED, {
            toolName: reasoningResult.tool!,
            parameters: reasoningResult.parameters,
            chatId: currentState.chatId,
            source: 'OptimizedReActEngine',
            operationId,
            timestamp: Date.now(),
          });

          console.log(`[OptimizedReActEngine] Ejecutando herramienta: ${reasoningResult.tool} con parámetros:`, reasoningResult.parameters);

          try {
            const internalToolResult: InternalToolResult = await this.toolRegistry.executeTool(
              reasoningResult.tool!,
              reasoningResult.parameters || {},
              { chatId: currentState.chatId }
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

  // 2. Análisis/reflexión del modelo sobre el resultado de la tool
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

  // 3. Emitir TOOL_EXECUTION_COMPLETED agrupando output de tool + análisis del modelo
  this.dispatcher.dispatch(EventType.TOOL_EXECUTION_COMPLETED, {
    toolName: reasoningResult.tool!,
    parameters: reasoningResult.parameters,
    chatId: currentState.chatId,
    source: 'OptimizedReActEngine',
    operationId,
    timestamp: Date.now(),
    result: internalToolResult.mappedOutput,
    duration: Date.now() - toolExecutionStartTime,
    toolDescription: this.toolRegistry.getTool(reasoningResult.tool!)?.description,
    toolParams: reasoningResult.parameters,
    isProcessingStep: false,
    // --- feedback enriquecido ---
    modelAnalysis: actionResult, // Nuevo campo: output/reflexión del modelo
    rawToolOutput: internalToolResult.data, // Campo crudo opcional
    toolSuccess: internalToolResult.success,
    toolError: internalToolResult.error,
  });

  if (actionResult.nextAction === 'respond') {
    currentState.finalOutput = actionResult.response || 'No specific response content provided by model after tool use.';
    isCompleted = true;
  }

} catch (toolError: any) {
  const errorMessage = `Error al ejecutar herramienta ${reasoningResult.tool}: ${toolError.message}`;
  this.addHistoryEntry(currentState, 'system_message', errorMessage, { status: 'error' });
  // Emitir TOOL_EXECUTION_ERROR solo tras el análisis fallido
  this.dispatcher.dispatch(EventType.TOOL_EXECUTION_ERROR, {
    toolName: reasoningResult.tool!,
    parameters: reasoningResult.parameters,
    chatId: currentState.chatId,
    source: 'OptimizedReActEngine',
    operationId,
    timestamp: Date.now(),
    error: toolError.message,
    duration: Date.now() - toolExecutionStartTime,
    toolDescription: this.toolRegistry.getTool(reasoningResult.tool!)?.description,
    toolParams: reasoningResult.parameters,
    isProcessingStep: false,
    // No hay análisis/reflexión del modelo porque falló la tool
    modelAnalysis: null,
    rawToolOutput: null,
    toolSuccess: false,
    toolError: toolError.message,
  });
}
// --- FIN NUEVO FLUJO DE FEEDBACK DE HERRAMIENTAS ---

        } else if (reasoningResult.nextAction === 'use_tool' && !reasoningResult.tool) {
            const errorMsg = "Model decided to use a tool but did not specify which tool.";
            console.warn(`[OptimizedReActEngine] ${errorMsg}`);
            this.addHistoryEntry(currentState, 'system_message', errorMsg, { status: 'error' });
            currentState.finalOutput = "I tried to use a tool, but I'm unsure which one. Can you clarify?";
            isCompleted = true;
        }
        console.log(`[OptimizedReActEngine] Iteración ${currentState.iterationCount} completada en ${Date.now() - iterationStartTime}ms`);
      }
      
      if (!currentState.finalOutput && !isCompleted) { 
        agentPhaseDispatch('finalResponseGeneration', 'started');
         const responseResult = await runOptimizedResponseChain({
           userQuery: currentState.userMessage || '',
           // CORRECTED: Pass raw data or error to the model
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
    
    if (currentState.finalOutput) {
      const responsePayload: ResponseEventPayload = {
        responseContent: typeof currentState.finalOutput === 'string' ? 
          currentState.finalOutput : 
          JSON.stringify(currentState.finalOutput),
        isFinal: true,
        chatId: currentState.chatId,
        source: 'OptimizedReActEngine',
        timestamp: Date.now()
      };
      this.dispatcher.dispatch(EventType.RESPONSE_GENERATED, responsePayload);
    }
    
    this.dispatcher.dispatch(EventType.CONVERSATION_ENDED, {
      chatId: currentState.chatId,
      finalStatus: currentState.completionStatus,
      duration: Date.now() - (initialState.timestamp || startTime), 
      source: 'OptimizedReActEngine',
      timestamp: Date.now()
    });
    
    return currentState;
  }

  /**
   * Libera los recursos utilizados por el motor ReAct
   */
  public dispose(): void {
    // Limpiar la caché de descripción de herramientas
    this.toolsDescriptionCache = null;
    
    // No es necesario limpiar las dependencias inyectadas (toolRegistry, modelManager, etc.)
    // ya que son manejadas por el ComponentFactory
  }
}