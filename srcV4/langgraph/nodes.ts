import { ReActNodeType } from '../core/config';
import { createInitialReActState, ReActState, ReActNodeFunction } from './types';
import { PromptManager } from '../prompts/promptManager';
import { ModelManager } from '../models/modelManager';
import { ToolRegistry } from '../tools/toolRegistry';
import { RunnableLambda } from '@langchain/core/runnables';
import { EventType, NodeEventPayload, ToolExecutionPayload } from '../core/events';
import { eventBus } from '../core/eventBus';

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
    return new RunnableLambda<ReActState, ReActState>(async (state: ReActState): Promise<ReActState> => {
      const startTime = Date.now();
      
      try {
        // Emitir evento de inicio del nodo
        eventBus.emitEvent<NodeEventPayload>(EventType.NODE_START, {
          type: ReActNodeType.INITIAL_ANALYSIS,
          state
        }, 'ReActNodes.initialAnalysisNode');
        
        // Obtener el prompt para el análisis inicial
        const prompt = this.promptManager.getPrompt(ReActNodeType.INITIAL_ANALYSIS);
        
        // Preparar las variables para el prompt
        const variables = {
          userMessage: state.userMessage,
          context: state.context || state.metadata.contextData || {}
        };
        
        // Generar el análisis inicial
        const response = await this.modelManager.generateText(
          prompt.formatPrompt(variables),
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
        eventBus.emitEvent<NodeEventPayload>(EventType.NODE_COMPLETE, {
          type: ReActNodeType.INITIAL_ANALYSIS,
          state: updatedState,
          duration
        }, 'ReActNodes.initialAnalysisNode');
        
        return updatedState;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        // Emitir evento de error del nodo
        eventBus.emitEvent<NodeEventPayload>(EventType.NODE_ERROR, {
          type: ReActNodeType.INITIAL_ANALYSIS,
          state,
          error: error as Error,
          duration
        }, 'ReActNodes.initialAnalysisNode');
        
        throw error;
      }
    });
  }
      return newState;
    } catch (error: any) {
      console.error(`[ReActNodes] Error in initialAnalysis:`, error);
      
      // En caso de error, pasar directamente a la generación de respuesta
      self.emit('node:error', { type: ReActNodeType.INITIAL_ANALYSIS, error });
      const errorState = {
        ...state,
        currentNode: ReActNodeType.RESPONSE_GENERATION,
        finalResponse: `Lo siento, ocurrió un error al analizar tu mensaje. Por favor, intenta de nuevo o reformula tu pregunta. Error: ${error.message}`
      };
      
      self.emit('node:complete', { type: ReActNodeType.INITIAL_ANALYSIS, state: errorState });
      return errorState;
    }
  });

  /**
   * Nodo de razonamiento
   * Planifica los pasos a seguir para resolver la tarea del usuario
   */
  reasoning(): RunnableLambda {
    const self = this;
    
    return new RunnableLambda(async (state: ReActState): Promise<ReActState> => {
    console.log(`[ReActNodes] Executing reasoning node`);
    self.emit('node:start', { type: ReActNodeType.REASONING, state });
    
    try {
      // Obtener el prompt para el razonamiento
      const prompt = self.promptManager.getPrompt(ReActNodeType.REASONING);
      
      // Preparar variables para el prompt
      const variables = {
        userMessage: state.userMessage,
        initialAnalysis: state.initialAnalysis,
        context: state.context,
        availableTools: this.toolRegistry.getToolNames().join(', '),
        history: state.history
      };
      
      // Generar el razonamiento con el modelo
      const response = await self.modelManager.generateText(
        prompt.formatPrompt(variables),
        state.metadata.modelName
      );
      
      // Parsear la respuesta
      const reasoning = JSON.parse(response);
      
      // Actualizar el estado
      const newState = {
        ...state,
        reasoning: {
          plan: reasoning.plan,
          steps: reasoning.steps,
          currentStep: 0,
          toolsToUse: reasoning.toolsToUse
        },
        history: {
          ...state.history,
          reasoning: [...state.history.reasoning, reasoning.plan]
        },
        currentNode: ReActNodeType.ACTION
      };
      
      self.emit('node:complete', { type: ReActNodeType.REASONING, state: newState });
      return newState;
    } catch (error: any) {
      console.error(`[ReActNodes] Error in reasoning:`, error);
      
      // En caso de error, pasar directamente a la generación de respuesta
      self.emit('node:error', { type: ReActNodeType.REASONING, error });
      const errorState = {
        ...state,
        currentNode: ReActNodeType.RESPONSE_GENERATION,
        finalResponse: `Lo siento, ocurrió un error al planificar cómo resolver tu tarea. Por favor, intenta de nuevo o reformula tu pregunta. Error: ${error.message}`
      };
      
      self.emit('node:complete', { type: ReActNodeType.REASONING, state: errorState });
      return errorState;
    }
  });

  /**
   * Nodo de acción
   * Ejecuta herramientas o genera respuestas basadas en el razonamiento
   */
  action(): RunnableLambda<ReActState, ReActState> {
    const promptManager = this.promptManager;
    const modelManager = this.modelManager;
    const toolRegistry = this.toolRegistry;
    
    return new RunnableLambda(async (state: ReActState): Promise<ReActState> => {
    console.log(`[ReActNodes] Executing action node`);
    
    try {
      // Verificar si hay un plan de razonamiento
      if (!state.reasoning || state.reasoning.steps.length === 0) {
        throw new Error('No hay un plan de razonamiento definido');
      }
      
      // Obtener el paso actual
      const currentStepIndex = state.reasoning.currentStep;
      if (currentStepIndex >= state.reasoning.steps.length) {
        // Si ya se completaron todos los pasos, pasar a la reflexión
        return {
          ...state,
          currentNode: ReActNodeType.REFLECTION
        };
      }
      
      const currentStep = state.reasoning.steps[currentStepIndex];
      
      // Determinar qué herramienta usar para este paso
      // Esto podría requerir otro llamado al modelo para determinar la herramienta y parámetros
      const toolSelectionPrompt = promptManager.getPrompt('toolSelection');
      const toolSelectionVars = {
        step: currentStep,
        availableTools: toolRegistry.getToolNames().join(', '),
        toolDescriptions: JSON.stringify(toolRegistry.getAllTools().map(t => ({
          name: t.name,
          description: t.description,
          parameters: t.schema.parameters
        })))
      };
      
      // Generar la selección de herramienta con el modelo
      const toolSelectionResponse = await modelManager.generateText(
        toolSelectionPrompt.formatPrompt(toolSelectionVars),
        state.metadata.modelName
      );
      
      // Parsear la selección de herramienta
      const toolSelection = JSON.parse(toolSelectionResponse);
      const { toolName, toolInput } = toolSelection;
      
      // Verificar si la herramienta existe
      if (!toolRegistry.hasTool(toolName)) {
        throw new Error(`La herramienta "${toolName}" no existe`);
      }
      
      // Ejecutar la herramienta
      const toolResult = await toolRegistry.executeTool(toolName, toolInput);
      
      // Registrar la acción en el historial
      const newAction = {
        toolName,
        input: toolInput,
        output: toolResult,
        timestamp: Date.now()
      };
      
      // Actualizar el estado
      const newState = {
        ...state,
        action: {
          toolName,
          toolInput,
          toolOutput: toolResult,
          isComplete: true,
          error: toolResult.success ? undefined : toolResult.error
        },
        history: {
          ...state.history,
          actions: [...state.history.actions, newAction]
        },
        currentNode: ReActNodeType.REFLECTION
      };
      
      return newState;
    } catch (error: any) {
      console.error(`[ReActNodes] Error in action:`, error);
      
      // Registrar el error en el estado
      return {
        ...state,
        action: {
          toolName: '',
          toolInput: {},
          isComplete: false,
          error: error.message
        },
        currentNode: ReActNodeType.REFLECTION
      };
    }
  });

  /**
   * Nodo de reflexión
   * Evalúa los resultados de la acción y decide los siguientes pasos
   */
  reflection(): RunnableLambda<ReActState, ReActState> {
    const promptManager = this.promptManager;
    const modelManager = this.modelManager;
    
    return new RunnableLambda(async (state: ReActState): Promise<ReActState> => {
    console.log(`[ReActNodes] Executing reflection node`);
    
    try {
      // Obtener el prompt para la reflexión
      const prompt = promptManager.getPrompt(ReActNodeType.REFLECTION);
      
      // Preparar variables para el prompt
      const variables = {
        userMessage: state.userMessage,
        initialAnalysis: state.initialAnalysis,
        reasoning: state.reasoning,
        action: state.action,
        history: state.history
      };
      
      // Generar la reflexión con el modelo
      const response = await modelManager.generateText(
        prompt.formatPrompt(variables),
        state.metadata.modelName
      );
      
      // Parsear la respuesta
      const reflection = JSON.parse(response);
      
      // Actualizar el estado
      const newState = {
        ...state,
        reflection: {
          success: reflection.success,
          insights: reflection.insights,
          nextSteps: reflection.nextSteps,
          needsCorrection: reflection.needsCorrection
        },
        history: {
          ...state.history,
          reflections: [...state.history.reflections, JSON.stringify(reflection)]
        }
      };
      
      // Determinar el siguiente nodo
      if (reflection.needsCorrection) {
        newState.currentNode = ReActNodeType.CORRECTION;
      } else if (
        state.reasoning && 
        state.reasoning.currentStep < state.reasoning.steps.length - 1
      ) {
        // Si hay más pasos en el plan, incrementar el paso actual y volver a la acción
        newState.reasoning = {
          ...state.reasoning,
          currentStep: state.reasoning.currentStep + 1
        };
        newState.currentNode = ReActNodeType.ACTION;
      } else {
        // Si se completaron todos los pasos, pasar a la generación de respuesta
        newState.currentNode = ReActNodeType.RESPONSE_GENERATION;
      }
      
      return newState;
    } catch (error: any) {
      console.error(`[ReActNodes] Error in reflection:`, error);
      
      // En caso de error, pasar directamente a la generación de respuesta
      const errorState = {
        ...state,
        currentNode: ReActNodeType.RESPONSE_GENERATION,
        finalResponse: `Lo siento, ocurrió un error al evaluar los resultados. Por favor, intenta de nuevo. Error: ${error.message}`
      };
      
      return errorState;
    }
  });

  /**
   * Nodo de corrección
   * Corrige el plan o la estrategia si es necesario
   */
  correction(): RunnableLambda<ReActState, ReActState> {
    const promptManager = this.promptManager;
    const modelManager = this.modelManager;
    
    return new RunnableLambda(async (state: ReActState): Promise<ReActState> => {
    console.log(`[ReActNodes] Executing correction node`);
    
    try {
      // Verificar que exista una reflexión que indique la necesidad de corrección
      if (!state.reflection || !state.reflection.needsCorrection) {
        throw new Error('No se requiere corrección según la reflexión');
      }
      
      // Obtener el prompt para la corrección
      const prompt = promptManager.getPrompt(ReActNodeType.CORRECTION);
      
      // Preparar variables para el prompt
      const variables = {
        userMessage: state.userMessage,
        initialAnalysis: state.initialAnalysis,
        reasoning: state.reasoning,
        action: state.action,
        reflection: state.reflection,
        history: state.history
      };
      
      // Generar la corrección con el modelo
      const response = await modelManager.generateText(
        prompt.formatPrompt(variables),
        state.metadata.modelName
      );
      
      // Parsear la respuesta
      const correction = JSON.parse(response);
      
      // Actualizar el estado
      const originalPlan = state.reasoning?.plan || '';
      
      return {
        ...state,
        correction: {
          originalPlan,
          revisedPlan: correction.revisedPlan,
          reason: correction.reason
        },
        reasoning: {
          plan: correction.revisedPlan,
          steps: correction.revisedSteps,
          currentStep: 0,
          toolsToUse: correction.toolsToUse
        },
        history: {
          ...state.history,
          corrections: [...state.history.corrections, JSON.stringify(correction)]
        },
        currentNode: ReActNodeType.ACTION
      };
    } catch (error: any) {
      console.error(`[ReActNodes] Error in correction:`, error);
      
      // En caso de error, pasar directamente a la generación de respuesta
      const errorState = {
        ...state,
        currentNode: ReActNodeType.RESPONSE_GENERATION,
        finalResponse: `Lo siento, ocurrió un error al corregir el plan. Por favor, intenta de nuevo. Error: ${error.message}`
      };
      
      return errorState;
    }
  });

  /**
   * Nodo de generación de respuesta
   * Genera la respuesta final para el usuario
   */
  responseGeneration(): RunnableLambda<ReActState, ReActState> {
    const promptManager = this.promptManager;
    const modelManager = this.modelManager;
    
    return new RunnableLambda(async (state: ReActState): Promise<ReActState> => {
    console.log(`[ReActNodes] Executing responseGeneration node`);
    
    try {
      // Si ya hay una respuesta final (por ejemplo, debido a un error), usarla
      if (state.finalResponse) {
        return {
          ...state,
          metadata: {
            ...state.metadata,
            endTime: Date.now()
          }
        };
      }
      
      // Obtener el prompt para la generación de respuesta
      const prompt = promptManager.getPrompt(ReActNodeType.RESPONSE_GENERATION);
      
      // Preparar variables para el prompt
      const variables = {
        userMessage: state.userMessage,
        initialAnalysis: state.initialAnalysis,
        reasoning: state.reasoning,
        actions: state.history.actions,
        reflections: state.history.reflections,
        corrections: state.history.corrections
      };
      
      // Generar la respuesta con el modelo
      const response = await modelManager.generateText(
        prompt.formatPrompt(variables),
        state.metadata.modelName
      );
      
      // Actualizar el estado
      const newState = {
        ...state,
        finalResponse: response,
        metadata: {
          ...state.metadata,
          endTime: Date.now()
        }
      };
      
      self.emit('node:complete', { type: ReActNodeType.INITIAL_ANALYSIS, state: newState });
      return newState;
    } catch (error: any) {
      console.error(`[ReActNodes] Error in responseGeneration:`, error);
      
      // En caso de error, proporcionar una respuesta de error genérica
      return {
        ...state,
        finalResponse: `Lo siento, ocurrió un error al generar la respuesta. Por favor, intenta de nuevo. Error: ${error.message}`,
        metadata: {
          ...state.metadata,
          endTime: Date.now()
        }
      };
      
      self.emit('node:complete', { type: ReActNodeType.INITIAL_ANALYSIS, state: newState });
      return newState;
    }
  };
}
