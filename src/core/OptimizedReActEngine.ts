/**
 * Motor ReAct optimizado
 * Implementa el flujo ReAct con prompts optimizados y gestión de memoria
 */

import { WindsurfState, HistoryEntry } from '../shared/types';
// Los tipos de fase se manejan directamente como string en lugar de usar extensiones de tipos
import { ToolRegistry } from '../features/tools/ToolRegistry';
import { InternalEventDispatcher } from './events/InternalEventDispatcher';
import { EventType, AgentPhaseEventPayload, ResponseEventPayload, SystemEventPayload } from '../features/events/eventTypes';
import { ToolResult } from '../features/tools/types';
import { ModelManager } from '../features/ai/ModelManager';
import { runOptimizedAnalysisChain } from '../features/ai/lcel/OptimizedAnalysisChain';
import { runOptimizedReasoningChain } from '../features/ai/lcel/OptimizedReasoningChain';
import { runOptimizedActionChain } from '../features/ai/lcel/OptimizedActionChain';
import { runOptimizedResponseChain } from '../features/ai/lcel/OptimizedResponseChain';
import { AnalysisOutput } from '../features/ai/prompts/optimized/analysisPrompt';
import { ReasoningOutput } from '../features/ai/prompts/optimized/reasoningPrompt';
import { ActionOutput } from '../features/ai/prompts/optimized/actionPrompt';
import { ResponseOutput } from '../features/ai/prompts/optimized/responsePrompt';
import { AgentMemory } from '../features/memory/AgentMemory';
import { LongTermStorage } from '../features/memory/LongTermStorage';
import { formatToolResults } from '../features/ai/prompts/optimizedPromptUtils';
import { z } from 'zod';

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

  /**
   * Obtiene una descripción concisa de las herramientas disponibles
   */
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

  /**
   * Convierte un esquema Zod a una descripción legible
   */
  private zodSchemaToDescription(schema: z.ZodTypeAny): string {
    if (!schema || !schema._def) return "No se definieron parámetros.";

    try {
      const shape = (schema as any).shape;
      if (!shape) return "Esquema sin forma definida.";

      return Object.entries(shape)
        .map(([key, val]: [string, any]) => {
          const isOptional = val._def?.typeName === 'ZodOptional';
          const innerType = isOptional ? val._def.innerType : val;
          const typeDesc = innerType._def?.typeName?.replace('Zod', '').toLowerCase() || 'unknown';
          const description = innerType.description ? ` - ${innerType.description}` : '';
          
          return `- ${key}${isOptional ? ' (opcional)' : ' (requerido)'}: ${typeDesc}${description}`;
        })
        .join('\n');
    } catch (error) {
      console.error('Error al convertir esquema Zod a descripción:', error);
      return "Error al procesar el esquema de parámetros.";
    }
  }

  /**
   * Añade una entrada al historial del estado
   */
  private addHistoryEntry(
    state: WindsurfState, 
    phase: string, // Usar string en lugar de HistoryEntry['phase'] para permitir nuevos tipos
    content: string | Record<string, any>,
    metadata: Partial<HistoryEntry['metadata']> = {}
  ): void {
    // Crear entrada con los campos estándar (sin id personalizado)
    const entry: HistoryEntry = {
      timestamp: Date.now(),
      phase: phase as any, // Forzar el tipo para permitir nuevos valores
      content: typeof content === 'string' ? content : JSON.stringify(content),
      metadata: {
        ...metadata,
        iteration: state.iterationCount
      }
    };
    
    state.history.push(entry);
  }

  /**
   * Ejecuta el flujo ReAct optimizado
   */
  public async run(initialState: WindsurfState): Promise<WindsurfState> {
    // Inicializar estado y memoria
    const currentState = { ...initialState };
    currentState.iterationCount = currentState.iterationCount || 0;
    currentState.history = currentState.history || [];
    
    // Crear sistema de memoria para esta conversación
    const memory = new AgentMemory(
      this.longTermStorage,
      currentState.chatId,
      { 
        userQuery: currentState.userMessage || '',
        activeFile: currentState.context?.activeFile,
        workspaceRoot: currentState.context?.workspaceRoot
      }
    );
    
    // Recuperar memoria relevante
    await memory.retrieveRelevantMemory(currentState.userMessage || '');
    const memorySummary = memory.getMemorySummary();
    
    // Función para enviar eventos de fase del agente
    const agentPhaseDispatch = (
      phase: string,
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
        timestamp: Date.now()
      };
      
      this.dispatcher.dispatch(eventType, payload);
    };
    

    try {
      // --- Fase de análisis inicial ---
      agentPhaseDispatch('initialAnalysis', 'started');
            // --- LCEL: Fase de análisis ---
       const model = this.modelManager.getActiveModel();
       const analysisResult = await runOptimizedAnalysisChain({
         userQuery: currentState.userMessage || '',
         availableTools: this.toolRegistry.getToolNames(),
         codeContext: JSON.stringify(currentState.context || {}),
         memoryContext: memorySummary,
         model
       });
      
      this.addHistoryEntry(currentState, 'reasoning', analysisResult); // Usar 'reasoning' en lugar de 'analysis'
      agentPhaseDispatch('initialAnalysis', 'completed', { analysis: analysisResult });
      
      // Guardar comprensión en memoria
      memory.addToShortTermMemory({
        type: 'context',
        content: analysisResult.understanding,
        relevance: 1.0
      });
      
      // --- Fase de ejecución iterativa ---
      const toolResults: Array<{tool: string, result: any}> = [];
      let isCompleted = false;
      
      while (!isCompleted && currentState.iterationCount < this.MAX_ITERATIONS) {
        currentState.iterationCount++;
        
        // Fase de razonamiento
        agentPhaseDispatch('reasoning', 'started');
                // --- LCEL: Fase de razonamiento ---
         const reasoningResult: ReasoningOutput = await runOptimizedReasoningChain({
           userQuery: currentState.userMessage || '',
           analysisResult,
           toolsDescription: this.getToolsDescription(),
           previousToolResults: toolResults.map(tr => ({ name: tr.tool, result: tr.result })),
           memoryContext: memory.getMemorySummary(),
           model
         });
        
        this.addHistoryEntry(currentState, 'reasoning', reasoningResult);
        agentPhaseDispatch('reasoning', 'completed', { reasoning: reasoningResult });
        
        // Decidir siguiente acción
        if (reasoningResult.action === 'respond') {
          // Generar respuesta final
          currentState.finalOutput = reasoningResult.response || '';
          isCompleted = true;
          continue;
        }
        
        // Ejecutar herramienta
        if (reasoningResult.action === 'use_tool' && reasoningResult.tool) {
          agentPhaseDispatch('toolExecution', 'started', { 
            tool: reasoningResult.tool,
            parameters: reasoningResult.parameters 
          });
          
          try {
            const toolResult = await this.toolRegistry.executeTool(
              reasoningResult.tool,
              reasoningResult.parameters || {},
              { chatId: currentState.chatId }
            );
            
            this.addHistoryEntry(currentState, 'action', { // Usar 'action' en lugar de 'tool_execution'
              tool: reasoningResult.tool,
              parameters: reasoningResult.parameters,
              result: toolResult
            });
            
            toolResults.push({
              tool: reasoningResult.tool,
              result: toolResult
            });
            
            // Guardar resultado de herramienta en memoria
            memory.addToShortTermMemory({
              type: 'tools',
              content: {
                tool: reasoningResult.tool,
                result: toolResult.success ? 
                  (typeof toolResult.data === 'string' ? toolResult.data.substring(0, 200) : 'Datos obtenidos correctamente') : 
                  `Error: ${toolResult.error}`
              },
              relevance: 0.9
            });
            
            agentPhaseDispatch('toolExecution', 'completed', { 
              tool: reasoningResult.tool,
              result: toolResult 
            });
            
            // Fase de acción (interpretar resultado y decidir siguiente paso)
            agentPhaseDispatch('action', 'started');
                        // --- LCEL: Fase de acción ---
             const actionResult: ActionOutput = await runOptimizedActionChain({
               userQuery: currentState.userMessage || '',
               lastToolName: reasoningResult.tool!,
               lastToolResult: toolResult,
               previousActions: toolResults.slice(0, -1).map(tr => ({ tool: tr.tool, result: tr.result })),
               memoryContext: memory.getMemorySummary(),
               model
             });
            
            this.addHistoryEntry(currentState, 'action', actionResult);
            agentPhaseDispatch('action', 'completed', { action: actionResult });
            
            // Decidir siguiente acción basada en la interpretación
            if (actionResult.nextAction === 'respond') {
              currentState.finalOutput = actionResult.response || '';
              isCompleted = true;
            }
            // La opción 'reflect' se ha eliminado del esquema para simplificar el flujo
            // Si nextAction es 'use_tool', continuará con la siguiente iteración
            
          } catch (toolError: any) {
            const errorMessage = `Error al ejecutar herramienta ${reasoningResult.tool}: ${toolError.message}`;
            console.error('[OptimizedReActEngine]', errorMessage);
            
            this.addHistoryEntry(currentState, 'system_message', errorMessage); // Usar 'system_message' en lugar de 'error'
            agentPhaseDispatch('toolExecution', 'completed', null, errorMessage);
            
            // Continuar con la siguiente iteración
          }
        }
      }
      
      // --- Fase de respuesta final ---
      if (!currentState.finalOutput) {
        agentPhaseDispatch('finalResponseGeneration', 'started');
                // --- LCEL: Fase de respuesta final ---
         const responseResult = await runOptimizedResponseChain({
           userQuery: currentState.userMessage || '',
           toolResults,
           analysisResult,
           memoryContext: memory.getMemorySummary(),
           model
         }) as ResponseOutput;
        
        currentState.finalOutput = responseResult.response;
        this.addHistoryEntry(currentState, 'responseGeneration', responseResult); // Usar 'responseGeneration' en lugar de 'response_generation'
        
        // Guardar elementos de memoria identificados
        if (responseResult.memoryItems) {
          for (const item of responseResult.memoryItems) {
            const memoryId = await memory.persistToLongTermMemory({
              type: item.type,
              content: item.content,
              relevance: item.relevance,
              metadata: {
                source: 'finalResponse',
                chatId: currentState.chatId
              }
            });
            console.log(`[OptimizedReActEngine] Elemento de memoria guardado: ${memoryId}`);
          }
        }
        
        agentPhaseDispatch('finalResponseGeneration', 'completed', { response: responseResult });
      }
      
      // Marcar como completado
      currentState.completionStatus = 'completed';
      
    } catch (error: any) {
      console.error('[OptimizedReActEngine] Error durante la ejecución:', error);
      currentState.error = error.message;
      currentState.completionStatus = 'failed';
      
      // Enviar evento de error
      this.dispatcher.dispatch(EventType.SYSTEM_ERROR, {
        message: `Error en OptimizedReActEngine: ${error.message}`,
        level: 'error',
        chatId: currentState.chatId,
        details: { error: error.stack },
        source: 'OptimizedReActEngine'
      });
    }
    
    // --- Enviar eventos finales ---
    if (currentState.finalOutput) {
      const responsePayload: ResponseEventPayload = {
        responseContent: typeof currentState.finalOutput === 'string' ? 
          currentState.finalOutput : 
          JSON.stringify(currentState.finalOutput),
        isFinal: true,
        chatId: currentState.chatId,
        source: 'OptimizedReActEngine'
      };
      
      this.dispatcher.dispatch(EventType.RESPONSE_GENERATED, responsePayload);
    }
    
    // Evento de finalización de conversación
    this.dispatcher.dispatch(EventType.CONVERSATION_ENDED, {
      chatId: currentState.chatId,
      finalStatus: currentState.completionStatus,
      duration: Date.now() - (initialState.timestamp || Date.now()),
      source: 'OptimizedReActEngine'
    });
    
    return currentState;
  }
}
