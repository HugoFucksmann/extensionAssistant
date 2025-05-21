// langgraph/nodes.ts

import { ReActNodeType } from '../core/config';
import { createInitialReActState, ReActState, ReActNodeFunction } from './types';
import { PromptManager } from '../prompts/promptManager';
import { ModelManager } from '../models/modelManager';
import { ToolRegistry } from '../modules/tools';
import { RunnableLambda } from '@langchain/core/runnables';
// RUTAS AJUSTADAS: Importar tipos y la instancia de eventBus desde la nueva ubicación en shared/events
import { EventType, NodeEventPayload, ToolExecutionEventPayload } from '../shared/events/types/eventTypes';
import { eventBus } from '../shared/events/core/eventBus';

/**
 * Clase que implementa los nodos del grafo ReAct
 */
export class ReActNodes {
  private promptManager: PromptManager;
  private modelManager: ModelManager;
  private toolRegistry: ToolRegistry;

  constructor(
    promptManager: PromptManager,
    modelManager: ModelManager,
    toolRegistry: ToolRegistry
  ) {
    this.promptManager = promptManager;
    this.modelManager = modelManager;
    this.toolRegistry = toolRegistry;
  }

  /**
   * Nodo para el análisis inicial del mensaje del usuario
   */
  initialAnalysisNode(): RunnableLambda<ReActState, ReActState> {
    return new RunnableLambda({
      func: async (state: ReActState): Promise<ReActState> => {
        const startTime = Date.now();
        
        try {
          // Emitir evento de inicio del nodo
          eventBus.emit(EventType.NODE_START, { // USANDO EL EVENTBUS CANÓNICO
            nodeType: ReActNodeType.INITIAL_ANALYSIS,
            stateSnapshot: state // Usando el nuevo nombre de payload para el estado
          } as NodeEventPayload); // Casting explícito para asegurar compatibilidad con el payload unido
          
          // Obtener el prompt para el análisis inicial
          const prompt = this.promptManager.getPrompt(ReActNodeType.INITIAL_ANALYSIS);
          
          // Preparar las variables para el prompt
          const variables = {
            userMessage: state.userMessage,
            context: state.context || state.metadata.contextData || {},
            availableTools: this.toolRegistry.getToolNames().join(', ')
          };
          
          // Generar el análisis inicial
          const formattedPrompt = await prompt.format(variables);
          const response = await this.modelManager.generateText(
            formattedPrompt,
            state.metadata.modelName
          );
          
          // Procesar la respuesta
          const analysis = JSON.parse(response);
          
          // Actualizar el estado con el análisis
          const updatedState: ReActState = {
            ...state,
            initialAnalysis: {
              intent: analysis.intent,
              objectives: analysis.objectives,
              requiredTools: analysis.requiredTools || [],
              relevantContext: analysis.relevantContext || ''
            },
            currentNode: ReActNodeType.REASONING
          };
          
          const duration = Date.now() - startTime;
          
          // Emitir evento de finalización del nodo
          eventBus.emit(EventType.NODE_COMPLETE, { // USANDO EL EVENTBUS CANÓNICO
            nodeType: ReActNodeType.INITIAL_ANALYSIS, // Changed from type to nodeType
            stateSnapshot: updatedState, // Usando el nuevo nombre de payload para el estado
            duration
          } as NodeEventPayload);
          
          return updatedState;
        } catch (error) {
          const duration = Date.now() - startTime;
          
          // Emitir evento de error del nodo
          eventBus.emit(EventType.NODE_ERROR, { // USANDO EL EVENTBUS CANÓNICO
            nodeType: ReActNodeType.INITIAL_ANALYSIS, // Changed from type to nodeType
            stateSnapshot: state, // Usando el nuevo nombre de payload para el estado
            error: error as Error,
            duration
          } as NodeEventPayload);
          
          throw error;
        }
      }
    });
  }

  /**
   * Nodo para el razonamiento y planificación
   */
  reasoningNode(): RunnableLambda<ReActState, ReActState> {
    return new RunnableLambda({
      func: async (state: ReActState): Promise<ReActState> => {
        const startTime = Date.now();
        
        try {
          // Emitir evento de inicio del nodo
          eventBus.emit(EventType.NODE_START, { // USANDO EL EVENTBUS CANÓNICO
            nodeType: ReActNodeType.REASONING, // Changed from type to nodeType
            stateSnapshot: state
          } as NodeEventPayload);
          
          // Obtener el prompt para el razonamiento
          const prompt = this.promptManager.getPrompt(ReActNodeType.REASONING);
          
          // Preparar las variables para el prompt
          const variables = {
            userMessage: state.userMessage,
            initialAnalysis: state.initialAnalysis,
            context: state.context || state.metadata.contextData || {},
            availableTools: this.toolRegistry.getToolNames().join(', ')
          };
          
          // Generar el razonamiento
          const formattedPrompt = await prompt.format(variables);
          const response = await this.modelManager.generateText(
            formattedPrompt,
            state.metadata.modelName
          );
          
          // Procesar la respuesta
          const reasoning = JSON.parse(response);
          
          // Actualizar el estado con el razonamiento
          const updatedState: ReActState = {
            ...state,
            reasoning: {
              plan: reasoning.plan,
              steps: reasoning.steps,
              currentStep: 0,
              toolsToUse: reasoning.toolsToUse || []
            },
            currentNode: ReActNodeType.ACTION
          };
          
          // Actualizar el historial
          if (!updatedState.history.reasoning) {
            updatedState.history.reasoning = [];
          }
          updatedState.history.reasoning.push(reasoning.plan);
          
          const duration = Date.now() - startTime;
          
          // Emitir evento de finalización del nodo
          eventBus.emit(EventType.NODE_COMPLETE, { // USANDO EL EVENTBUS CANÓNICO
            nodeType: ReActNodeType.REASONING, // Changed from type to nodeType
            stateSnapshot: updatedState,
            duration
          } as NodeEventPayload);
          
          return updatedState;
        } catch (error) {
          const duration = Date.now() - startTime;
          
          // Emitir evento de error del nodo
          eventBus.emit(EventType.NODE_ERROR, { // USANDO EL EVENTBUS CANÓNICO
            nodeType: ReActNodeType.REASONING, // Changed from type to nodeType
            stateSnapshot: state,
            error: error as Error,
            duration
          } as NodeEventPayload);
          
          throw error;
        }
      }
    });
  }

  /**
   * Nodo para la ejecución de acciones
   */
  actionNode(): RunnableLambda<ReActState, ReActState> {
    return new RunnableLambda({
      func: async (state: ReActState): Promise<ReActState> => {
        const startTime = Date.now();
        
        try {
          // Emitir evento de inicio del nodo
          eventBus.emit(EventType.NODE_START, { // USANDO EL EVENTBUS CANÓNICO
            nodeType: ReActNodeType.ACTION, // Changed from type to nodeType
            stateSnapshot: state
          } as NodeEventPayload);
          
          // Verificar si hay un plan de razonamiento
          if (!state.reasoning || !state.reasoning.steps || state.reasoning.steps.length === 0) {
            throw new Error('No hay un plan de razonamiento definido para ejecutar acciones');
          }
          
          // Obtener el paso actual
          const currentStepIndex = state.reasoning.currentStep;
          if (currentStepIndex >= state.reasoning.steps.length) {
            throw new Error('Índice de paso actual fuera de rango');
          }
          
          const currentStep = state.reasoning.steps[currentStepIndex];
          
          // Verificar si el paso tiene una herramienta asociada
          if (!currentStep.toolName) {
            throw new Error('El paso actual no tiene una herramienta asociada');
          }
          
          // Verificar si la herramienta existe
          if (!this.toolRegistry.hasTool(currentStep.toolName)) {
            throw new Error(`La herramienta ${currentStep.toolName} no está registrada`);
          }
          
          // Preparar la acción
          const action = {
            toolName: currentStep.toolName,
            toolInput: currentStep.parameters || {},
            isComplete: false
          };
          
          // Emitir evento de inicio de ejecución de herramienta
          eventBus.emit(EventType.TOOL_EXECUTION_STARTED, { // USANDO EL EVENTBUS CANÓNICO
            toolName: action.toolName,
            parameters: action.toolInput,
            chatId: state.metadata.chatId // Añadir chatId al payload de la herramienta
          } as ToolExecutionEventPayload); // Casting explícito para el payload unido
          
          // Ejecutar la herramienta
          const toolStartTime = Date.now();
          const toolResult = await this.toolRegistry.executeTool(
            action.toolName,
            action.toolInput
          );
          const toolDuration = Date.now() - toolStartTime;
          
          // Crear un nuevo objeto de acción con el resultado
          const updatedAction = {
            toolName: action.toolName,
            toolInput: action.toolInput,
            toolOutput: toolResult,
            isComplete: true
          };
          
          // Emitir evento de finalización de ejecución de herramienta
          eventBus.emit(EventType.TOOL_EXECUTION_COMPLETED, { // USANDO EL EVENTBUS CANÓNICO
            toolName: updatedAction.toolName,
            parameters: updatedAction.toolInput,
            result: toolResult,
            duration: toolDuration,
            chatId: state.metadata.chatId
          } as ToolExecutionEventPayload);
          
          // Actualizar el estado con la acción
          const updatedState: ReActState = {
            ...state,
            action: updatedAction,
            currentNode: ReActNodeType.REFLECTION
          };
          
          // Actualizar el historial
          if (!updatedState.history.actions) {
            updatedState.history.actions = [];
          }
          updatedState.history.actions.push({
            toolName: updatedAction.toolName,
            input: updatedAction.toolInput,
            output: updatedAction.toolOutput,
            timestamp: Date.now()
          });
          
          // Actualizar los pasos intermedios
          updatedState.intermediateSteps.push({
            action: {
              tool: updatedAction.toolName,
              toolInput: updatedAction.toolInput
            },
            observation: updatedAction.toolOutput,
            timestamp: Date.now()
          });
          
          return updatedState;
        } catch (error) {
          const errorState: ReActState = {
            ...state,
            action: {
              ...(state.action || { toolName: '', toolInput: {}, isComplete: false }),
              error: (error as Error).message
            },
            currentNode: ReActNodeType.REFLECTION
          };
          
          // Emitir evento de error
          eventBus.emit(EventType.NODE_ERROR, {
            nodeType: ReActNodeType.ACTION,
            stateSnapshot: errorState,
            error: error as Error,
            duration: Date.now() - startTime
          } as NodeEventPayload);
          
          return errorState;
        }
      }
    });
  }

  /**
   * Nodo para la reflexión sobre los resultados
   */
  reflectionNode(): RunnableLambda<ReActState, ReActState> {
    return new RunnableLambda({
      func: async (state: ReActState): Promise<ReActState> => {
        const startTime = Date.now();
        
        try {
          // Emitir evento de inicio del nodo
          eventBus.emit(EventType.NODE_START, { // USANDO EL EVENTBUS CANÓNICO
            nodeType: ReActNodeType.REFLECTION, // Changed from type to nodeType
            stateSnapshot: state
          } as NodeEventPayload);
          
          // Obtener el prompt para la reflexión
          const prompt = this.promptManager.getPrompt(ReActNodeType.REFLECTION);
          
          // Preparar las variables para el prompt
          const variables = {
            userMessage: state.userMessage,
            initialAnalysis: state.initialAnalysis,
            reasoning: state.reasoning,
            action: state.action,
            intermediateSteps: state.intermediateSteps,
            context: state.context || state.metadata.contextData || {}
          };
          
          // Generar la reflexión
          const formattedPrompt = await prompt.format(variables);
          const response = await this.modelManager.generateText(
            formattedPrompt,
            state.metadata.modelName
          );
          
          // Procesar la respuesta
          const reflection = JSON.parse(response);
          
          // Actualizar el estado con la reflexión
          const updatedState: ReActState = {
            ...state,
            reflection: {
              success: reflection.success,
              insights: reflection.insights || [],
              nextSteps: reflection.nextSteps || [],
              needsCorrection: reflection.needsCorrection || false
            }
          };
          
          // Actualizar el historial
          if (!updatedState.history.reflections) {
            updatedState.history.reflections = [];
          }
          updatedState.history.reflections.push(reflection.insights.join('\n'));
          
          // Determinar el siguiente nodo
          if (reflection.needsCorrection) {
            updatedState.currentNode = ReActNodeType.CORRECTION;
          } else if (state.reasoning && 
                    state.reasoning.currentStep < state.reasoning.steps.length - 1) {
            // Si hay más pasos en el plan, incrementar el paso actual y volver a ACTION
            updatedState.reasoning = {
              ...state.reasoning,
              currentStep: state.reasoning.currentStep + 1
            };
            updatedState.currentNode = ReActNodeType.ACTION;
          } else {
            // Si no hay más pasos, generar la respuesta final
            updatedState.currentNode = ReActNodeType.RESPONSE_GENERATION;
          }
          
          const duration = Date.now() - startTime;
          
          // Emitir evento de finalización del nodo
          eventBus.emit(EventType.NODE_COMPLETE, { // USANDO EL EVENTBUS CANÓNICO
            nodeType: ReActNodeType.REFLECTION, // Changed from type to nodeType
            stateSnapshot: updatedState,
            duration
          } as NodeEventPayload);
          
          return updatedState;
        } catch (error) {
          const duration = Date.now() - startTime;
          
          // Emitir evento de error del nodo
          eventBus.emit(EventType.NODE_ERROR, { // USANDO EL EVENTBUS CANÓNICO
            nodeType: ReActNodeType.REFLECTION, // Changed from type to nodeType
            stateSnapshot: state,
            error: error as Error,
            duration
          } as NodeEventPayload);
          
          throw error;
        }
      }
    });
  }

  /**
   * Nodo para la corrección del plan
   */
  correctionNode(): RunnableLambda<ReActState, ReActState> {
    return new RunnableLambda({
      func: async (state: ReActState): Promise<ReActState> => {
        const startTime = Date.now();
        
        try {
          // Emitir evento de inicio del nodo
          eventBus.emit(EventType.NODE_START, { // USANDO EL EVENTBUS CANÓNICO
            nodeType: ReActNodeType.CORRECTION, // Changed from type to nodeType
            stateSnapshot: state
          } as NodeEventPayload);
          
          // Obtener el prompt para la corrección
          const prompt = this.promptManager.getPrompt(ReActNodeType.CORRECTION);
          
          // Preparar las variables para el prompt
          const variables = {
            userMessage: state.userMessage,
            initialAnalysis: state.initialAnalysis,
            reasoning: state.reasoning,
            action: state.action,
            reflection: state.reflection,
            intermediateSteps: state.intermediateSteps,
            context: state.context || state.metadata.contextData || {},
            availableTools: this.toolRegistry.getToolNames().join(', ')
          };
          
          // Generar la corrección
          const formattedPrompt = await prompt.format(variables);
          const response = await this.modelManager.generateText(
            formattedPrompt,
            state.metadata.modelName
          );
          
          // Procesar la respuesta
          const correction = JSON.parse(response);
          
          // Guardar el plan original para referencia
          const originalPlan = state.reasoning ? state.reasoning.plan : '';
          
          // Actualizar el estado con la corrección
          const updatedState: ReActState = {
            ...state,
            correction: {
              originalPlan,
              revisedPlan: correction.revisedPlan,
              reason: correction.reason
            },
            reasoning: {
              plan: correction.revisedPlan,
              steps: correction.steps,
              currentStep: 0,
              toolsToUse: correction.toolsToUse || []
            },
            currentNode: ReActNodeType.ACTION
          };
          
          // Actualizar el historial
          if (!updatedState.history.corrections) {
            updatedState.history.corrections = [];
          }
          updatedState.history.corrections.push(correction.reason);
          
          const duration = Date.now() - startTime;
          
          // Emitir evento de finalización del nodo
          eventBus.emit(EventType.NODE_COMPLETE, { // USANDO EL EVENTBUS CANÓNICO
            nodeType: ReActNodeType.CORRECTION, // Changed from type to nodeType
            stateSnapshot: updatedState,
            duration
          } as NodeEventPayload);
          
          return updatedState;
        } catch (error) {
          const duration = Date.now() - startTime;
          
          // Emitir evento de error del nodo
          eventBus.emit(EventType.NODE_ERROR, { // USANDO EL EVENTBUS CANÓNICO
            nodeType: ReActNodeType.CORRECTION, // Changed from type to nodeType
            stateSnapshot: state,
            error: error as Error,
            duration
          } as NodeEventPayload);
          
          throw error;
        }
      }
    });
  }

  /**
   * Nodo para la generación de la respuesta final
   */
  responseNode(): RunnableLambda<ReActState, ReActState> {
    return new RunnableLambda({
      func: async (state: ReActState): Promise<ReActState> => {
        const startTime = Date.now();
        
        try {
          // Emitir evento de inicio del nodo
          eventBus.emit(EventType.NODE_START, { // USANDO EL EVENTBUS CANÓNICO
            nodeType: ReActNodeType.RESPONSE_GENERATION, // Changed from type to nodeType
            stateSnapshot: state
          } as NodeEventPayload);
          
          // Obtener el prompt para la respuesta
          const prompt = this.promptManager.getPrompt(ReActNodeType.RESPONSE_GENERATION);
          
          // Preparar las variables para el prompt
          const variables = {
            userMessage: state.userMessage,
            initialAnalysis: state.initialAnalysis,
            reasoning: state.reasoning,
            intermediateSteps: state.intermediateSteps,
            context: state.context || state.metadata.contextData || {}
          };
          
          // Generar la respuesta
          const formattedPrompt = await prompt.format(variables);
          const response = await this.modelManager.generateText(
            formattedPrompt,
            state.metadata.modelName
          );
          
          // Actualizar el estado con la respuesta
          const updatedState: ReActState = {
            ...state,
            finalResponse: response,
            // currentNode no se cambia a RESPONSE_GENERATION aquí ya que es un estado final implícito
            metadata: {
              ...state.metadata,
              endTime: Date.now()
            }
          };
          
          const duration = Date.now() - startTime;
          
          // Emitir evento de finalización del nodo
          eventBus.emit(EventType.NODE_COMPLETE, { // USANDO EL EVENTBUS CANÓNICO
            nodeType: ReActNodeType.RESPONSE_GENERATION, // Changed from type to nodeType
            stateSnapshot: updatedState,
            duration
          } as NodeEventPayload);

          // Emitir el evento de respuesta generada (que ya existía en reactGraph.ts)
          // Esto puede ser un duplicado si reactGraph.ts también lo emite.
          // Decide si quieres que el nodo lo emita o el grafo después de la ejecución.
          eventBus.emit(EventType.RESPONSE_GENERATED, {
              chatId: updatedState.metadata.chatId,
              response: updatedState.finalResponse,
              success: true, // Asumiendo éxito si la respuesta se generó
              duration: duration
          });
          
          return updatedState;
        } catch (error) {
          const duration = Date.now() - startTime;
          
          // Emitir evento de error del nodo
          eventBus.emit(EventType.NODE_ERROR, { // USANDO EL EVENTBUS CANÓNICO
            nodeType: ReActNodeType.RESPONSE_GENERATION, // Changed from type to nodeType
            stateSnapshot: state,
            error: error as Error,
            duration
          } as NodeEventPayload);

          // Emitir un evento de error más general si falla la generación de respuesta
          eventBus.emit(EventType.ERROR_OCCURRED, {
            chatId: state.metadata.chatId,
            error: (error as Error).message,
            stack: (error as Error).stack,
            source: 'ReActNodes.responseNode'
          });
          
          throw error;
        }
      }
    });
  }
}