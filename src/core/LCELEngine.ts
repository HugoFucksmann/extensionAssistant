// src/core/LCELEngine.ts

import { ToolRegistry } from '../features/tools/ToolRegistry';
import { InternalEventDispatcher } from './events/InternalEventDispatcher';
import { LongTermStorage } from '../features/memory/LongTermStorage';
import { ReasoningResult, NextAction } from '../shared/types';
import { WindsurfState } from '../shared/types'; 
import { EventType,  AgentPhaseEventPayload,  } from '../features/events/eventTypes';

import { FeedbackManager, FeedbackType,  } from '../shared/utils/FeedbackManager';
import { logger } from '../shared/utils/logger';
import { ReasoningOutput } from '@features/ai/prompts/optimized/reasoningPrompt';
import { z } from 'zod';

// Type for Zod field definition
interface ZodField {
  _def: {
    typeName: string;
    isOptional?: boolean;
    description?: string;
  };
}

// Type for Zod schema definition
interface ZodSchema {
  _def: {
    typeName: string;
  };
  shape: Record<string, ZodField>;
}
import { GenericLCELChainExecutor } from '@features/ai/lcel/GenericLCELChainExecutor';
import { AnalysisOutput } from '@features/ai/prompts/optimized/analysisPrompt';
import { ResponseOutput } from '@features/ai/prompts/optimized/responsePrompt';

export class LCELEngine {
  private maxIterations: number = 10;
  private feedbackManager: FeedbackManager;

  constructor(
    private chainExecutor: GenericLCELChainExecutor,
    private toolRegistry: ToolRegistry,
    private dispatcher: InternalEventDispatcher,
    private longTermStorage: LongTermStorage
  ) {
    this.feedbackManager = FeedbackManager.getInstance(this.dispatcher);
    logger.info('LCELEngine initialized with a centralized chain executor.', { source: 'LCELEngine' });
    this.dispatcher.systemInfo('LCELEngine initialized.', { source: 'LCELEngine' }, 'LCELEngine');
  }

  public async run(state: WindsurfState): Promise<WindsurfState> {
    const startTime = Date.now();
    const chatId = state.chatId;
    const userMessage = state.userMessage;
    
    const currentState = { ...state };
    currentState.iterationCount = 0;
    currentState.history = currentState.history || [];
    currentState.timestamp = Date.now();
    
    this.dispatcher.dispatch(EventType.CONVERSATION_STARTED, { /* ... */ });

    try {
      const availableTools = this.toolRegistry.getToolNames();
      
      logger.info('[LCELEngine] --- Fase de análisis inicial ---');
      this.feedbackManager.sendModelFeedback(FeedbackType.MODEL_ANALYZING, { message: 'Analizando inicial', chatId: chatId, source: 'LCELEngine', phase: 'initialAnalysis', details: { responseLength: 0, completed: false } }); // Payload como estaba
      this.dispatcher.dispatch(EventType.AGENT_PHASE_STARTED, { chatId, phase: 'initialAnalysis', timestamp: Date.now(), source: 'LCELEngine' } as AgentPhaseEventPayload);

      let memoryContext = '';
      if (this.longTermStorage && 'getRelevantMemory' in this.longTermStorage) {
        try {
          this.feedbackManager.sendModelFeedback(FeedbackType.SYSTEM_INFO, { message: 'Obteniendo memoria relevante', chatId: chatId, source: 'LCELEngine', phase: 'initialAnalysis', details: { responseLength: 0, completed: false } }); // Payload como estaba
          memoryContext = await (this.longTermStorage as any).getRelevantMemory(userMessage);
          if (memoryContext) {
            this.feedbackManager.sendModelFeedback(FeedbackType.SYSTEM_INFO, { message: 'Memoria relevante obtenida', chatId: chatId, source: 'LCELEngine', phase: 'initialAnalysis', details: { responseLength: 0, completed: false } }); // Payload como estaba
          }
        } catch (error) {
          logger.warn('[LCELEngine] Error al obtener memoria relevante:', error);
          this.feedbackManager.sendModelFeedback(FeedbackType.SYSTEM_WARNING, { message: 'Error al obtener memoria relevante', chatId: chatId, source: 'LCELEngine', phase: 'initialAnalysis', details: { responseLength: 0, completed: false } }); // Payload como estaba
        }
      }
      
      this.feedbackManager.sendModelFeedback(FeedbackType.MODEL_ANALYZING, { message: 'Analizando inicial', chatId: chatId, source: 'LCELEngine', phase: 'initialAnalysis', details: { responseLength: 0, completed: false } }); // Payload como estaba
      
      // --- LLAMADA A CADENA DE ANÁLISIS ---
      const analysisResult = await this.chainExecutor.execute<
        { userQuery: string; availableTools: string[]; codeContext?: string; memoryContext?: string; },
        AnalysisOutput // Tipo de salida final esperado de la cadena 'optimizedAnalysis'
      >('optimizedAnalysis', {
        userQuery: userMessage,
        availableTools,
        codeContext: currentState.projectContext || 'No code context available.',
        memoryContext: memoryContext || 'No relevant memory.'
      }, {
        // model: ya no se pasa aquí, el executor usa el ModelManager
        logContext: { chatId, phase: 'analysis' }
      });

      logger.info('[LCELEngine] Resultado de análisis:', analysisResult);
      // Asumimos que analysisResult ya tiene la forma de AnalysisOutput gracias al outputNormalizer de la cadena
      currentState.analysisResult = analysisResult; // Guardar el resultado tipado
      
      this.feedbackManager.sendModelFeedback(FeedbackType.MODEL_ANALYZING, {
        message: 'Análisis completado',
        chatId,
        source: 'LCELEngine',
        phase: 'initialAnalysis',
        details: { 
          needsTools: !!analysisResult?.requiredTools?.length, // Ajustar según la estructura real de AnalysisOutput
          identifiedIntent: (analysisResult as any)?.taskType || 'unknown' // Ajustar según la estructura real
        }
      });
      this.dispatcher.dispatch(EventType.AGENT_PHASE_COMPLETED, { chatId, phase: 'initialAnalysis', data: analysisResult, timestamp: Date.now(), source: 'LCELEngine' } as AgentPhaseEventPayload);

      const toolResultsAccumulator: Array<{ tool: string; result: any; }> = [];

      while (currentState.iterationCount < this.maxIterations) {
        currentState.iterationCount++;
        logger.info(`[LCELEngine] --- Iteración ${currentState.iterationCount} ---`);
        this.feedbackManager.sendModelFeedback(FeedbackType.MODEL_THINKING, { message: 'Pensando', chatId: chatId, source: 'LCELEngine', phase: 'reasoning', details: { responseLength: 0, completed: false } }); // Payload como estaba
        this.dispatcher.dispatch(EventType.AGENT_PHASE_STARTED, { chatId, phase: 'reasoning', iteration: currentState.iterationCount, timestamp: Date.now(), source: 'LCELEngine' } as AgentPhaseEventPayload);
        
        // Obtener y validar las descripciones de las herramientas
        const toolDescriptions = this.toolRegistry.getToolNames()
          .map(toolName => {
            const tool = this.toolRegistry.getTool(toolName);
            if (!tool) {
              logger.error(`Tool ${toolName} not found in registry`);
              return null;
            }
            
            // Convertir el esquema Zod a una representación más legible
            const parametersSchema = tool.parametersSchema;
            const parameters = parametersSchema ? {
              schema: parametersSchema._def.typeName,
              fields: parametersSchema.shape ? Object.entries(parametersSchema.shape).map(([name, field]) => ({
                name,
                type: (field as ZodField)._def.typeName,
                description: (field as ZodField)._def.description,
                required: !(field as ZodField)._def.isOptional
              })) : []
            } : null;

            return {
              name: tool.name,
              description: tool.description,
              parameters
            };
          })
          .filter((tool): tool is NonNullable<typeof tool> => tool !== null) // Remove null entries
          || []; // Asegurarnos de que siempre tenemos un array

        // Si no hay herramientas, registrar un warning y establecer un valor por defecto
        let toolsDescriptionStr: string;
        if (toolDescriptions.length === 0) {
          logger.warn('No se encontraron herramientas en el registro');
          toolsDescriptionStr = 'No hay herramientas disponibles en este momento.';
        } else {
          // Formatear la descripción de herramientas para que sea más legible
          toolsDescriptionStr = toolDescriptions.map(tool => {
            const paramStr = tool.parameters 
              ? `\n    Parámetros:\n      - Esquema: ${tool.parameters.schema}\n      - Campos: ${JSON.stringify(tool.parameters.fields, null, 2)}`
              : '\n    Sin parámetros';
            return `- ${tool.name}: ${tool.description}${paramStr}`;
          }).join('\n\n');
        }

        // Ejecutar el chain de razonamiento
        const chainInput = {
          userQuery: userMessage,
          analysisResult: typeof currentState.analysisResult === 'string' 
            ? currentState.analysisResult 
            : JSON.stringify(currentState.analysisResult, null, 2),
          toolsDescription: toolsDescriptionStr,
          previousToolResults: toolResultsAccumulator?.length 
            ? toolResultsAccumulator.map(tr => ({
                name: tr.tool, 
                result: typeof tr.result === 'string' ? tr.result : JSON.stringify(tr.result, null, 2)
              }))
            : [],
          memoryContext: memoryContext
        };
        
        logger.debug('[LCELEngine] Input para el chain de razonamiento:', JSON.stringify(chainInput, null, 2));

        const reasoningResult = await this.chainExecutor.execute<
          { 
            userQuery: string; 
            analysisResult: any; 
            toolsDescription: string; 
            previousToolResults?: Array<{ name: string; result: any }>;
            memoryContext?: string;
          },
          ReasoningOutput
        >('optimizedReasoning', chainInput, {
          logContext: { chatId, phase: 'reasoning', iteration: currentState.iterationCount }
        });
        
        logger.info('[LCELEngine] Resultado de razonamiento:', reasoningResult);
        // Transformar el resultado del chain para que coincida con ReasoningResult
        const transformedResult: ReasoningResult = {
          reasoning: reasoningResult.reasoning,
          plan: reasoningResult.tool 
            ? [{
                id: `step-${Date.now()}`,
                stepDescription: `Ejecutar herramienta: ${reasoningResult.tool}`,
                toolToUse: reasoningResult.tool,
                expectedOutcome: 'Resultado exitoso de la herramienta',
                status: 'pending'
              }]
            : [],
          nextAction: reasoningResult.nextAction as NextAction
        };
        currentState.reasoningResult = transformedResult; // Guardar el resultado tipado

        const nextActionDecision = reasoningResult.nextAction;
        const toolToUse = reasoningResult.tool;
        const toolParameters = reasoningResult.parameters;

        logger.info('[LCELEngine] Decisión nextAction:', nextActionDecision);
        
        this.feedbackManager.sendModelFeedback(FeedbackType.MODEL_THINKING, {
          message: `Decisión: ${nextActionDecision === 'respond' ? 'Responder al usuario' : 
                    nextActionDecision === 'use_tool' ? `Usar herramienta ${toolToUse || ''}` : 
                    'Acción desconocida'}`,
          chatId,
          source: 'LCELEngine',
          phase: 'reasoning',
          iteration: currentState.iterationCount,
          details: {
            nextAction: nextActionDecision,
            selectedTool: toolToUse,
            reasoning: reasoningResult.reasoning
          }
        });
        currentState.history.push({ phase: 'reasoning', content: JSON.stringify(reasoningResult), timestamp: Date.now(), metadata: {} });
        this.dispatcher.dispatch(EventType.AGENT_PHASE_COMPLETED, { chatId, phase: 'reasoning', data: reasoningResult, iteration: currentState.iterationCount, timestamp: Date.now(), source: 'LCELEngine' });

        if (nextActionDecision === 'respond') {
          const responseGenResult = await this.generateResponse(
            userMessage,
            toolResultsAccumulator,
            currentState.analysisResult,
            memoryContext,
            currentState.chatId
          );
          currentState.finalOutput = responseGenResult.response; // generateResponse devuelve { response: string }
          currentState.completionStatus = 'completed';
          break;
        } else if (nextActionDecision === 'use_tool' && toolToUse) {
          logger.info(`[LCELEngine] Ejecutando herramienta: ${toolToUse} con parámetros:`, toolParameters);
          const toolParams = toolParameters || {};
         
          this.feedbackManager.sendToolFeedback(FeedbackType.TOOL_EXECUTING, { 
            toolName: toolToUse,
            message: 'Ejecutando herramienta',
            chatId: chatId,
            source: 'LCELEngine',
            details: {
              responseLength: 0,
              completed: false
            }
          }); // Payload como estaba
          this.dispatcher.dispatch(EventType.TOOL_EXECUTION_STARTED, { 
            chatId,
            phase: 'toolOutputAnalysis',
            iteration: currentState.iterationCount,
            timestamp: Date.now(),
            source: 'LCELEngine'
          }); // Payload como estaba
          
          try {
            const toolResult = await this.toolRegistry.executeTool(toolToUse, toolParams, { chatId });
            logger.info(`[LCELEngine] Resultado de herramienta ${toolToUse}:`, toolResult);
            this.feedbackManager.sendToolFeedback(FeedbackType.TOOL_COMPLETED, { 
              toolName: toolToUse, 
              message: 'Herramienta completada', 
              chatId: chatId, 
              source: 'LCELEngine',
              details: { 
                responseLength: 0, 
                completed: true,
                toolOutput: toolResult.mappedOutput || toolResult.data
              }
            });
            this.dispatcher.dispatch(EventType.TOOL_EXECUTION_COMPLETED, { 
              chatId, 
              phase: 'toolOutputAnalysis',
              iteration: currentState.iterationCount,
              timestamp: Date.now(),
              source: 'LCELEngine'
            });
            currentState.history.push({
              phase: 'toolOutputAnalysis',
              content: `Resultado de la herramienta ${toolToUse}: ${JSON.stringify(toolResult)}`,
              timestamp: Date.now(),
              metadata: {
                tool_executions: [{
                  name: toolToUse,
                  status: 'completed',
                  parameters: toolParams,
                  result: toolResult.mappedOutput || toolResult.data,
                  startTime: Date.now(),
                  endTime: Date.now()
                }],
                processingTime: Date.now() - startTime,
                status: 'success'
              }
            });
            toolResultsAccumulator.push({
              tool: toolToUse,
              result: toolResult.mappedOutput || toolResult.data
            });
          } catch (error: any) {
            // ... manejo de error de herramienta como estaba ...
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(`[LCELEngine] Error al ejecutar herramienta ${toolToUse}:`, error);
            this.feedbackManager.sendToolFeedback(FeedbackType.TOOL_ERROR, { 
              toolName: toolToUse, 
              message: 'Error al ejecutar herramienta', 
              chatId: chatId, 
              source: 'LCELEngine',
              details: { 
                responseLength: 0, 
                completed: false,
                error: errorMessage
              }
            });
            this.dispatcher.dispatch(EventType.TOOL_EXECUTION_ERROR, { 
              toolName: toolToUse, 
              message: 'Error al ejecutar herramienta', 
              chatId: chatId, 
              source: 'LCELEngine',
              details: { 
                responseLength: 0, 
                completed: false,
                error: errorMessage
              }
            });
            currentState.history.push({
              phase: 'toolOutputAnalysis',
              content: `Error al ejecutar herramienta ${toolToUse}: ${errorMessage}`,
              timestamp: Date.now(),
              metadata: {
                tool_executions: [{
                  name: toolToUse,
                  status: 'error',
                  parameters: toolParams,
                  error: errorMessage,
                  startTime: Date.now(),
                  endTime: Date.now()
                }],
                processingTime: Date.now() - startTime,
                status: 'error',
                error_message: errorMessage
              }
            });
            toolResultsAccumulator.push({
              tool: toolToUse,
              result: { error: errorMessage, success: false }
            });
          }
        } else {
          logger.warn(`[LCELEngine] Acción no reconocida o herramienta no especificada: ${nextActionDecision}, Herramienta: ${toolToUse}`);
          this.feedbackManager.sendModelFeedback(FeedbackType.SYSTEM_WARNING, { chatId: chatId, message: 'Acción no reconocida o herramienta no especificada', source: 'LCELEngine', phase: 'toolExecution', details: { responseLength: 0, completed: false } }); // Payload como estaba
          // Considerar generar una respuesta de error aquí o romper el ciclo
          currentState.finalOutput = "Hubo un problema al decidir la siguiente acción.";
          currentState.completionStatus = 'failed';
          break;
        }
        
        if (currentState.iterationCount >= this.maxIterations) {
          // ... manejo de maxIterations como estaba ...
          logger.warn(`[LCELEngine] Se alcanzó el límite de iteraciones (${this.maxIterations})`);
          this.feedbackManager.sendModelFeedback(FeedbackType.SYSTEM_WARNING, { chatId: chatId, message: 'Se alcanzó el límite de iteraciones', source: 'LCELEngine', phase: 'toolExecution', details: { responseLength: 0, completed: false } });
          const responseGenResult = await this.generateResponse(
            userMessage,
            toolResultsAccumulator,
            currentState.analysisResult,
            memoryContext,
            chatId
          );
          currentState.finalOutput = responseGenResult.response;
          currentState.completionStatus = 'completed';
          break;
        }
      }
      
      if (!currentState.finalOutput) {
        // ... generación de respuesta final si no existe, como estaba ...
        const responseGenResult = await this.generateResponse(
          userMessage,
          toolResultsAccumulator,
          currentState.analysisResult,
          memoryContext,
          chatId
        );
        currentState.finalOutput = responseGenResult.response;
        currentState.completionStatus = 'completed';
      }
      
      this.dispatcher.dispatch(EventType.CONVERSATION_ENDED, { chatId: chatId, message: 'Conversación terminada', source: 'LCELEngine', phase: 'toolExecution', details: { responseLength: 0, completed: false } }); // Payload como estaba
      return currentState;

    } catch (error: any) {
      // ... manejo de error general como estaba ...
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[LCELEngine] Error general en el motor:', error);
      this.feedbackManager.sendModelFeedback(FeedbackType.SYSTEM_ERROR, { chatId: chatId, message: 'Error general en el motor', source: 'LCELEngine', phase: 'toolExecution', details: { responseLength: 0, completed: false } });
      const errorState = { ...state };
      errorState.finalOutput = `Lo siento, ocurrió un error al procesar tu solicitud: ${errorMessage}.`;
      errorState.completionStatus = 'failed';
      errorState.error = errorMessage;
      errorState.timestamp = Date.now();
      this.dispatcher.dispatch(EventType.CONVERSATION_ENDED, { /* ... */ });
      return errorState;
    }
  }

  private normalizeFinalResponse(response: string): string {
    // ... sin cambios ...
    if (!response) return '';
    return response
      .replace(/^(Assistant|AI|Asistente|Bot|System):\s*/i, '')
      .trim();
  }

  private getToolDescription(toolName: string, parameters: Record<string, any>): string {
    // ... sin cambios ...
    const toolInfo = this.toolRegistry.getTool(toolName);
    if (toolInfo) {
      const paramDesc = Object.keys(parameters).length > 0
        ? Object.entries(parameters)
            .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`)
            .join(', ')
        : 'sin parámetros';
      return `${toolInfo.description || toolName} (${paramDesc})`;
    }
    const readableName = toolName.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').toLowerCase().trim();
    const paramSummary = Object.keys(parameters).length > 0 ? ` con ${Object.keys(parameters).join(', ')}` : '';
    return `${readableName}${paramSummary}`;
  }

  private async generateResponse(
    userQuery: string,
    toolResults: Array<{ tool: string; result: any }>,
    analysisResult: any, // Debería ser AnalysisOutput
    memoryContext?: string,
    chatId: string = 'unknown'
  ): Promise<ResponseOutput> { // Devuelve ResponseOutput que es { response: string }
    try {
      this.feedbackManager.sendModelFeedback(FeedbackType.MODEL_GENERATING, { message: 'Generando respuesta', chatId: chatId, source: 'LCELEngine', phase: 'responseGeneration', details: { responseLength: 0, completed: false } }); // Payload como estaba
      this.dispatcher.dispatch(EventType.AGENT_PHASE_STARTED, { chatId, phase: 'responseGeneration', timestamp: Date.now(), source: 'LCELEngine' } as AgentPhaseEventPayload);
      
      // --- LLAMADA A CADENA DE RESPUESTA ---
      const responseChainOutput = await this.chainExecutor.execute<
        { userQuery: string; toolResults: Array<{ tool: string; result: any }>; analysisResult: any; memoryContext?: string; },
        ResponseOutput // Esperamos { response: string }
      >('optimizedResponse', {
        userQuery,
        toolResults,
        analysisResult,
        memoryContext: memoryContext || ''
      }, {
        logContext: { caller: 'LCELEngine.generateResponse', chatId: chatId }
      });
      
      // responseChainOutput ya debería ser { response: string } gracias al outputNormalizer de la cadena.
      // La normalización adicional con this.normalizeFinalResponse puede ser redundante si el normalizador de la cadena ya lo hace.
      // Pero para mantener la consistencia con el comportamiento anterior, lo dejamos por ahora.
      const finalResponse = this.normalizeFinalResponse(responseChainOutput.response);
      
      this.feedbackManager.sendModelFeedback(FeedbackType.MODEL_GENERATING, {
         message: 'Respuesta generada',
         chatId: chatId,
         source: 'LCELEngine',
         phase: 'responseGeneration',
         details: {
           responseLength: finalResponse.length,
           completed: true
         }
      });
      this.dispatcher.dispatch(EventType.AGENT_PHASE_COMPLETED, { chatId, phase: 'responseGeneration', data: { response: finalResponse }, timestamp: Date.now(), source: 'LCELEngine' } as AgentPhaseEventPayload);
      
      return { response: finalResponse }; // Devolver el objeto ResponseOutput

    } catch (error: any) {
      // ... manejo de error como estaba ...
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[LCELEngine] Error al generar respuesta:', error);
      this.feedbackManager.sendModelFeedback(FeedbackType.SYSTEM_ERROR, {
        message: 'Error al generar respuesta',
        });
      return {
        response: `Lo siento, ocurrió un error al generar la respuesta: ${errorMessage}. Por favor, intenta nuevamente.`
      };
    }
  }
}