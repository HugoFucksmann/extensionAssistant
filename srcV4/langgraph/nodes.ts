import { ReActNodeType } from '../core/config';
import { ReActState, ReActNodeFunction } from './types';
import { PromptManager } from '../prompts/promptManager';
import { ModelManager } from '../models/modelManager';
import { ToolRegistry } from '../tools/toolRegistry';

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
   * Nodo de análisis inicial
   * Analiza el mensaje del usuario para determinar la intención y objetivos
   */
  initialAnalysis: ReActNodeFunction = async (state: ReActState): Promise<ReActState> => {
    console.log(`[ReActNodes] Executing initialAnalysis node`);
    
    try {
      // Obtener el prompt para el análisis inicial
      const prompt = this.promptManager.getPrompt(ReActNodeType.INITIAL_ANALYSIS);
      
      // Preparar variables para el prompt
      const variables = {
        userMessage: state.userMessage,
        context: state.context,
        availableTools: this.toolRegistry.getToolNames().join(', ')
      };
      
      // Generar el análisis inicial con el modelo
      const response = await this.modelManager.generateText(
        prompt.formatPrompt(variables),
        state.metadata.modelName
      );
      
      // Parsear la respuesta
      // Nota: Aquí asumimos que el modelo devuelve un JSON estructurado
      // En una implementación real, se debería validar y manejar errores de parseo
      const analysis = JSON.parse(response);
      
      // Actualizar el estado
      return {
        ...state,
        initialAnalysis: {
          intent: analysis.intent,
          objectives: analysis.objectives,
          requiredTools: analysis.requiredTools,
          relevantContext: analysis.relevantContext
        },
        currentNode: ReActNodeType.REASONING
      };
    } catch (error: any) {
      console.error(`[ReActNodes] Error in initialAnalysis:`, error);
      
      // En caso de error, pasar directamente a la generación de respuesta
      return {
        ...state,
        currentNode: ReActNodeType.RESPONSE_GENERATION,
        finalResponse: `Lo siento, ocurrió un error al analizar tu mensaje. Por favor, intenta de nuevo o reformula tu pregunta. Error: ${error.message}`
      };
    }
  };

  /**
   * Nodo de razonamiento
   * Planifica los pasos a seguir para resolver la tarea del usuario
   */
  reasoning: ReActNodeFunction = async (state: ReActState): Promise<ReActState> => {
    console.log(`[ReActNodes] Executing reasoning node`);
    
    try {
      // Obtener el prompt para el razonamiento
      const prompt = this.promptManager.getPrompt(ReActNodeType.REASONING);
      
      // Preparar variables para el prompt
      const variables = {
        userMessage: state.userMessage,
        initialAnalysis: state.initialAnalysis,
        context: state.context,
        availableTools: this.toolRegistry.getToolNames().join(', '),
        history: state.history
      };
      
      // Generar el razonamiento con el modelo
      const response = await this.modelManager.generateText(
        prompt.formatPrompt(variables),
        state.metadata.modelName
      );
      
      // Parsear la respuesta
      const reasoning = JSON.parse(response);
      
      // Actualizar el estado
      return {
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
    } catch (error: any) {
      console.error(`[ReActNodes] Error in reasoning:`, error);
      
      // En caso de error, pasar directamente a la generación de respuesta
      return {
        ...state,
        currentNode: ReActNodeType.RESPONSE_GENERATION,
        finalResponse: `Lo siento, ocurrió un error al planificar cómo resolver tu tarea. Por favor, intenta de nuevo o reformula tu pregunta. Error: ${error.message}`
      };
    }
  };

  /**
   * Nodo de acción
   * Ejecuta una herramienta basada en el razonamiento
   */
  action: ReActNodeFunction = async (state: ReActState): Promise<ReActState> => {
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
      const toolSelectionPrompt = this.promptManager.getPrompt('toolSelection');
      const toolSelectionVars = {
        step: currentStep,
        availableTools: this.toolRegistry.getToolNames().join(', '),
        toolDescriptions: JSON.stringify(this.toolRegistry.getAllTools().map(t => ({
          name: t.name,
          description: t.description,
          parameters: t.schema.parameters
        })))
      };
      
      const toolSelectionResponse = await this.modelManager.generateText(
        toolSelectionPrompt.formatPrompt(toolSelectionVars),
        state.metadata.modelName
      );
      
      // Parsear la selección de herramienta
      const toolSelection = JSON.parse(toolSelectionResponse);
      const { toolName, toolInput } = toolSelection;
      
      // Verificar si la herramienta existe
      if (!this.toolRegistry.hasTool(toolName)) {
        throw new Error(`La herramienta "${toolName}" no existe`);
      }
      
      // Ejecutar la herramienta
      const toolResult = await this.toolRegistry.executeTool(toolName, toolInput);
      
      // Registrar la acción en el historial
      const newAction = {
        toolName,
        input: toolInput,
        output: toolResult,
        timestamp: Date.now()
      };
      
      // Actualizar el estado
      return {
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
  };

  /**
   * Nodo de reflexión
   * Evalúa el resultado de la acción y decide si se necesita una corrección
   */
  reflection: ReActNodeFunction = async (state: ReActState): Promise<ReActState> => {
    console.log(`[ReActNodes] Executing reflection node`);
    
    try {
      // Obtener el prompt para la reflexión
      const prompt = this.promptManager.getPrompt(ReActNodeType.REFLECTION);
      
      // Preparar variables para el prompt
      const variables = {
        userMessage: state.userMessage,
        initialAnalysis: state.initialAnalysis,
        reasoning: state.reasoning,
        action: state.action,
        history: state.history
      };
      
      // Generar la reflexión con el modelo
      const response = await this.modelManager.generateText(
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
      return {
        ...state,
        currentNode: ReActNodeType.RESPONSE_GENERATION,
        finalResponse: `Lo siento, ocurrió un error al evaluar los resultados. Por favor, intenta de nuevo. Error: ${error.message}`
      };
    }
  };

  /**
   * Nodo de corrección
   * Corrige el plan basado en la reflexión
   */
  correction: ReActNodeFunction = async (state: ReActState): Promise<ReActState> => {
    console.log(`[ReActNodes] Executing correction node`);
    
    try {
      // Verificar que exista una reflexión que indique la necesidad de corrección
      if (!state.reflection || !state.reflection.needsCorrection) {
        throw new Error('No se requiere corrección según la reflexión');
      }
      
      // Obtener el prompt para la corrección
      const prompt = this.promptManager.getPrompt(ReActNodeType.CORRECTION);
      
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
      const response = await this.modelManager.generateText(
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
      return {
        ...state,
        currentNode: ReActNodeType.RESPONSE_GENERATION,
        finalResponse: `Lo siento, ocurrió un error al corregir el plan. Por favor, intenta de nuevo. Error: ${error.message}`
      };
    }
  };

  /**
   * Nodo de generación de respuesta
   * Genera la respuesta final para el usuario
   */
  responseGeneration: ReActNodeFunction = async (state: ReActState): Promise<ReActState> => {
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
      const prompt = this.promptManager.getPrompt(ReActNodeType.RESPONSE_GENERATION);
      
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
      const response = await this.modelManager.generateText(
        prompt.formatPrompt(variables),
        state.metadata.modelName
      );
      
      // Actualizar el estado
      return {
        ...state,
        finalResponse: response,
        metadata: {
          ...state.metadata,
          endTime: Date.now()
        }
      };
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
    }
  };
}
