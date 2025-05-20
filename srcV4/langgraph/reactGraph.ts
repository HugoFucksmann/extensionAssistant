import { ReActState, ReActGraphResult, IntermediateStep, createInitialReActState, addIntermediateStep } from './types';
import { ModelManager } from '../models/modelManager';
import { ToolRegistry } from '../tools/toolRegistry';
import EventEmitter from 'eventemitter3';
import { WindsurfEvents } from '../core/windsurfController';

/**
 * Clase que implementa el grafo ReAct utilizando LangGraph
 */
export class ReActGraph {
  private modelManager: ModelManager;
  private toolRegistry: ToolRegistry;
  private modelName: string;
  private eventEmitter: EventEmitter;
  
  /**
   * Constructor para el grafo ReAct
   * @param modelName Nombre del modelo a utilizar
   * @param eventEmitter Instancia de EventEmitter para emitir eventos durante la ejecución
   */
  constructor(modelName: string, eventEmitter: EventEmitter) {
    this.modelName = modelName;
    this.modelManager = new ModelManager();
    this.toolRegistry = new ToolRegistry();
    this.eventEmitter = eventEmitter;
  }
  
  /**
   * Establece el registro de herramientas a utilizar
   * @param toolRegistry Registro de herramientas
   */
  public setToolRegistry(toolRegistry: ToolRegistry): void {
    this.toolRegistry = toolRegistry;
  }
  
  /**
   * Ejecuta el grafo ReAct con un estado inicial
   * @param initialState Estado inicial
   * @returns Resultado de la ejecución del grafo
   */
  async runGraph(initialState: ReActState): Promise<ReActGraphResult> {
    console.log(`[ReActGraph] Starting graph execution with input: "${initialState.input.substring(0, 50)}..."`);
    
    // Extraer el chatId de los metadatos para los eventos
    const chatId = initialState.metadata.chatId || 'unknown';
    
    // Inicializar el seguimiento del tiempo y las visitas a nodos
    const startTime = Date.now();
    const nodeVisits: string[] = [];
    
    // Establecer el estado inicial con metadatos adicionales si no existen
    let state: ReActState = {
      ...initialState,
      metadata: {
        ...initialState.metadata,
        startTime: initialState.metadata.startTime || startTime,
        modelName: this.modelName
      }
    };
    
    try {
      // Paso 1: Análisis inicial del mensaje del usuario
      nodeVisits.push('analysis');
      this.eventEmitter.emit(WindsurfEvents.REASONING_STARTED, { chatId, phase: 'analysis' });
      state = await this.analyzeUserMessage(state);
      this.eventEmitter.emit(WindsurfEvents.REASONING_COMPLETED, { chatId, phase: 'analysis', result: state.intermediateSteps[state.intermediateSteps.length - 1] });
      
      // Paso 2: Planificación y razonamiento
      nodeVisits.push('reasoning');
      this.eventEmitter.emit(WindsurfEvents.REASONING_STARTED, { chatId, phase: 'reasoning' });
      state = await this.planAndReason(state);
      this.eventEmitter.emit(WindsurfEvents.REASONING_COMPLETED, { chatId, phase: 'reasoning', result: state.intermediateSteps[state.intermediateSteps.length - 1] });
      
      // Paso 3: Ejecutar acciones basadas en el razonamiento
      nodeVisits.push('action');
      this.eventEmitter.emit(WindsurfEvents.ACTION_STARTED, { chatId, phase: 'action' });
      state = await this.executeActions(state);
      this.eventEmitter.emit(WindsurfEvents.ACTION_COMPLETED, { chatId, phase: 'action', result: state.intermediateSteps[state.intermediateSteps.length - 1] });
      
      // Paso 4: Reflexionar sobre los resultados
      nodeVisits.push('reflection');
      this.eventEmitter.emit(WindsurfEvents.REFLECTION_STARTED, { chatId, phase: 'reflection' });
      state = await this.reflectOnResults(state);
      this.eventEmitter.emit(WindsurfEvents.REFLECTION_COMPLETED, { chatId, phase: 'reflection', result: state.intermediateSteps[state.intermediateSteps.length - 1] });
      
      // Paso 5: Generar respuesta final
      nodeVisits.push('response');
      state = await this.generateResponse(state);
      
    } catch (error: any) {
      console.error('[ReActGraph] Error during graph execution:', error);
      state.output = `Lo siento, ocurrió un error durante el procesamiento: ${error.message}`;
      
      // Emitir evento de error
      this.eventEmitter.emit(WindsurfEvents.ERROR_OCCURRED, { 
        chatId, 
        error: error.message, 
        stack: error.stack 
      });
    }
    
    // Calcular la duración y finalizar metadatos
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Actualizar metadatos finales
    state.metadata.endTime = endTime;
    
    console.log(`[ReActGraph] Graph execution completed in ${duration}ms, nodes visited: ${nodeVisits.join(' -> ')}`);
    
    // Emitir evento de respuesta generada
    if (state.output) {
      this.eventEmitter.emit(WindsurfEvents.RESPONSE_GENERATED, {
        chatId,
        response: state.output,
        metadata: {
          duration,
          nodeVisits,
          iterations: nodeVisits.length
        }
      });
    }
    
    // Devolver el resultado
    return {
      input: state.input,
      output: state.output,
      intermediateSteps: state.intermediateSteps,
      metadata: state.metadata,
      executionInfo: {
        startTime,
        endTime,
        duration,
        nodeVisits,
        iterations: nodeVisits.length
      }
    };
  }
  
  /**
   * Analiza el mensaje del usuario para entender su intención
   */
  private async analyzeUserMessage(state: ReActState): Promise<ReActState> {
    console.log('[ReActGraph] Analyzing user message...');
    
    try {
      // Extraer el chatId para los eventos
      const chatId = state.metadata.chatId || 'unknown';
      
      // Obtener el contexto del editor y del proyecto si está disponible
      const editorContext = state.metadata.contextData?.editorContext || {};
      const projectContext = state.metadata.contextData?.projectContext || {};
      
      // Preparar el prompt para el análisis
      const prompt = `Analiza el siguiente mensaje del usuario y determina su intención:
      
      Mensaje: ${state.input}
      
      Contexto del editor: ${JSON.stringify(editorContext)}
      Contexto del proyecto: ${JSON.stringify(projectContext)}
      
      Responde con un JSON que contenga:
      - intent: la intención principal del usuario
      - requiredTools: lista de herramientas que podrían ser necesarias
      - relevantContext: partes del contexto que son relevantes para la solicitud`;
      
      // Llamar al modelo para analizar el mensaje
      const analysisResult = await this.modelManager.generateText(prompt);
      
      // Intentar parsear el resultado como JSON
      let analysis;
      try {
        analysis = JSON.parse(analysisResult);
      } catch (e) {
        // Si no se puede parsear como JSON, usar el texto como está
        analysis = { intent: analysisResult, requiredTools: [], relevantContext: {} };
      }
      
      // Emitir un evento con detalles del análisis
      this.eventEmitter.emit('analysis:completed', { chatId, analysis });
      
      // Agregar el resultado al estado
      return addIntermediateStep(
        state,
        'analyze',
        { input: state.input },
        analysis
      );
    } catch (error: any) {
      console.error('[ReActGraph] Error analyzing user message:', error);
      
      // En caso de error, agregar un paso con el error
      return addIntermediateStep(
        state,
        'analyze',
        { input: state.input },
        { error: error.message }
      );
    }
  }
  
  /**
   * Planifica y razona sobre cómo resolver la solicitud del usuario
   */
  private async planAndReason(state: ReActState): Promise<ReActState> {
    console.log('[ReActGraph] Planning and reasoning...');
    
    try {
      // Extraer el chatId para los eventos
      const chatId = state.metadata.chatId || 'unknown';
      
      // Obtener el resultado del análisis previo
      const analysisStep = state.intermediateSteps.find(step => step.action.tool === 'analyze');
      const analysis = analysisStep?.observation || { intent: 'No se detectó intención' };
      
      // Obtener las herramientas disponibles del registro de herramientas
      const availableTools = this.toolRegistry.getToolNames();
      
      // Preparar el prompt para la planificación
      const prompt = `Basado en el análisis previo, genera un plan detallado para resolver la solicitud del usuario:
      
      Mensaje del usuario: ${state.input}
      
      Análisis: ${JSON.stringify(analysis)}
      
      Herramientas disponibles: ${availableTools.join(', ')}
      
      Responde con un JSON que contenga:
      - plan: descripción general del enfoque
      - steps: lista de pasos a seguir, cada uno con:
        - description: descripción del paso
        - tool: nombre de la herramienta a utilizar (si aplica)
        - parameters: parámetros para la herramienta (si aplica)
      - nextAction: el índice del primer paso a ejecutar`;
      
      // Llamar al modelo para generar el plan
      const reasoningResult = await this.modelManager.generateText(prompt);
      
      // Intentar parsear el resultado como JSON
      let reasoning;
      try {
        reasoning = JSON.parse(reasoningResult);
      } catch (e) {
        // Si no se puede parsear como JSON, crear un plan simple
        reasoning = { 
          plan: reasoningResult,
          steps: [{ description: 'Responder al usuario', tool: 'respond', parameters: { message: reasoningResult } }],
          nextAction: 0
        };
      }
      
      // Emitir un evento con detalles del plan
      this.eventEmitter.emit('reasoning:completed', { chatId, reasoning });
      
      // Agregar el resultado al estado
      return addIntermediateStep(
        state,
        'reason',
        { input: state.input, analysis },
        reasoning
      );
    } catch (error: any) {
      console.error('[ReActGraph] Error planning and reasoning:', error);
      
      // En caso de error, agregar un paso con el error
      return addIntermediateStep(
        state,
        'reason',
        { input: state.input },
        { error: error.message }
      );
    }
  }
  
  /**
   * Ejecuta las acciones necesarias basadas en el razonamiento
   */
  private async executeActions(state: ReActState): Promise<ReActState> {
    console.log('[ReActGraph] Executing actions...');
    
    try {
      // Extraer el chatId para los eventos
      const chatId = state.metadata.chatId || 'unknown';
      
      // Obtener el plan generado en el paso anterior
      const reasoningStep = state.intermediateSteps.find(step => step.action.tool === 'reason');
      if (!reasoningStep || !reasoningStep.observation) {
        throw new Error('No se encontró un plan válido para ejecutar acciones');
      }
      
      // Asegurarse de que reasoning sea un objeto
      const reasoning = typeof reasoningStep.observation === 'string' 
        ? { plan: reasoningStep.observation, steps: [], nextAction: 0 }
        : reasoningStep.observation as Record<string, any>;
        
      const plan = reasoning.plan || 'No hay plan disponible';
      const steps = reasoning.steps || [];
      const nextActionIndex = reasoning.nextAction || 0;
      
      // Verificar si hay pasos para ejecutar
      if (steps.length === 0) {
        return addIntermediateStep(
          state,
          'execute',
          { action: 'no_action' },
          { result: 'No hay acciones para ejecutar' }
        );
      }
      
      // Obtener el siguiente paso a ejecutar
      const nextStep = steps[nextActionIndex];
      if (!nextStep) {
        throw new Error(`Índice de acción inválido: ${nextActionIndex}`);
      }
      
      // Verificar si el paso tiene una herramienta asociada
      if (!nextStep.tool) {
        return addIntermediateStep(
          state,
          'execute',
          { action: 'no_tool', step: nextStep },
          { result: `Paso sin herramienta: ${nextStep.description}` }
        );
      }
      
      // Verificar si la herramienta existe en el registro
      if (!this.toolRegistry.hasTool(nextStep.tool)) {
        return addIntermediateStep(
          state,
          'execute',
          { action: 'invalid_tool', tool: nextStep.tool },
          { error: `Herramienta no encontrada: ${nextStep.tool}` }
        );
      }
      
      // Emitir evento de inicio de ejecución de herramienta
      this.eventEmitter.emit('tool:execution:started', { 
        chatId, 
        tool: nextStep.tool, 
        parameters: nextStep.parameters || {} 
      });
      
      // Ejecutar la herramienta
      const toolResult = await this.toolRegistry.executeTool(
        nextStep.tool,
        nextStep.parameters || {}
      );
      
      // Emitir evento de finalización de ejecución de herramienta
      this.eventEmitter.emit('tool:execution:completed', { 
        chatId, 
        tool: nextStep.tool, 
        result: toolResult 
      });
      
      // Agregar el resultado al estado
      return addIntermediateStep(
        state,
        'execute',
        { 
          action: nextStep.tool, 
          parameters: nextStep.parameters || {},
          step: nextStep.description
        },
        toolResult
      );
    } catch (error: any) {
      console.error('[ReActGraph] Error executing actions:', error);
      
      // En caso de error, agregar un paso con el error
      return addIntermediateStep(
        state,
        'execute',
        { action: 'error' },
        { error: error.message }
      );
    }
  }
  
  /**
   * Reflexiona sobre los resultados de las acciones
   */
  private async reflectOnResults(state: ReActState): Promise<ReActState> {
    console.log('[ReActGraph] Reflecting on results...');
    
    try {
      // Extraer el chatId para los eventos
      const chatId = state.metadata.chatId || 'unknown';
      
      // Obtener los resultados de las acciones ejecutadas
      const executeStep = state.intermediateSteps.find(step => step.action.tool === 'execute');
      if (!executeStep) {
        throw new Error('No se encontraron resultados de acciones para reflexionar');
      }
      
      // Obtener el plan original
      const reasoningStep = state.intermediateSteps.find(step => step.action.tool === 'reason');
      const reasoning = reasoningStep?.observation;
      
      // Preparar el prompt para la reflexión
      const prompt = `Reflexiona sobre los resultados de las acciones ejecutadas:
      
      Mensaje del usuario: ${state.input}
      
      Plan original: ${JSON.stringify(reasoning)}
      
      Acción ejecutada: ${JSON.stringify(executeStep.action)}
      
      Resultado: ${JSON.stringify(executeStep.observation)}
      
      Responde con un JSON que contenga:
      - success: boolean indicando si la acción fue exitosa
      - confidence: número del 0 al 1 indicando la confianza en el resultado
      - needsCorrection: boolean indicando si se necesita corregir el plan
      - correctionStrategy: string con la estrategia de corrección (si needsCorrection es true)
      - insights: array de insights obtenidos del resultado
      - nextSteps: recomendación de los siguientes pasos a seguir`;
      
      // Llamar al modelo para reflexionar sobre los resultados
      const reflectionResult = await this.modelManager.generateText(prompt);
      
      // Intentar parsear el resultado como JSON
      let reflection;
      try {
        reflection = JSON.parse(reflectionResult);
      } catch (e) {
        // Si no se puede parsear como JSON, crear una reflexión simple
        const observation = typeof executeStep.observation === 'string'
          ? { success: true }
          : executeStep.observation as Record<string, any>;
          
        reflection = { 
          success: observation.success !== false, // Asumir éxito a menos que explícitamente sea false
          confidence: 0.5,
          needsCorrection: false,
          insights: [reflectionResult],
          nextSteps: 'Continuar con el siguiente paso del plan'
        };
      }
      
      // Emitir evento con detalles de la reflexión
      this.eventEmitter.emit('reflection:completed', { chatId, reflection });
      
      // Agregar el resultado al estado
      return addIntermediateStep(
        state,
        'reflect',
        { 
          action: executeStep.action,
          result: executeStep.observation
        },
        reflection
      );
    } catch (error: any) {
      console.error('[ReActGraph] Error reflecting on results:', error);
      
      // En caso de error, agregar un paso con el error
      return addIntermediateStep(
        state,
        'reflect',
        { error: 'Error en la reflexión' },
        { 
          success: false, 
          confidence: 0,
          needsCorrection: true,
          error: error.message,
          insights: [`Error durante la reflexión: ${error.message}`]
        }
      );
    }
  }
  
  /**
   * Genera la respuesta final para el usuario
   */
  private async generateResponse(state: ReActState): Promise<ReActState> {
    console.log('[ReActGraph] Generating final response...');
    
    try {
      // Extraer el chatId para los eventos
      const chatId = state.metadata.chatId || 'unknown';
      
      // Recopilar todos los pasos intermedios para generar la respuesta
      const analysisStep = state.intermediateSteps.find(step => step.action.tool === 'analyze');
      const reasoningStep = state.intermediateSteps.find(step => step.action.tool === 'reason');
      const executeStep = state.intermediateSteps.find(step => step.action.tool === 'execute');
      const reflectStep = state.intermediateSteps.find(step => step.action.tool === 'reflect');
      
      // Preparar el contexto para la generación de la respuesta
      const analysis = analysisStep?.observation || {};
      const reasoning = reasoningStep?.observation || {};
      const execution = executeStep?.observation || {};
      const reflection = reflectStep?.observation || {};
      
      // Determinar si la ejecución fue exitosa
      const executionSuccess = typeof execution === 'string' ? true : (execution.success !== false);
      const reflectionSuccess = typeof reflection === 'string' ? true : (reflection.success !== false);
      
      // Preparar el prompt para la generación de la respuesta
      const prompt = `Genera una respuesta clara y concisa para el usuario basada en los siguientes resultados:
      
      Mensaje del usuario: ${state.input}
      
      Análisis: ${JSON.stringify(analysis)}
      
      Plan: ${JSON.stringify(reasoning)}
      
      Ejecución: ${JSON.stringify(execution)}
      
      Reflexión: ${JSON.stringify(reflection)}
      
      La respuesta debe:
      1. Ser clara, concisa y directa
      2. Responder a la pregunta o solicitud original del usuario
      3. Explicar brevemente las acciones realizadas si es relevante
      4. Si hubo errores, explicarlos de manera comprensible
      5. Usar un tono profesional pero amigable
      6. Estar formateada en Markdown si es apropiado`;
      
      // Llamar al modelo para generar la respuesta final
      let finalResponse = await this.modelManager.generateText(prompt);
      
      // Si hubo un error en la ejecución, asegurarse de que se mencione
      if (!executionSuccess || !reflectionSuccess) {
        const errorInfo = typeof execution === 'string' ? execution : (execution.error || 'Error desconocido');
        
        // Si la respuesta no menciona el error, agregar una nota
        if (!finalResponse.toLowerCase().includes('error') && !finalResponse.toLowerCase().includes('problema')) {
          finalResponse = `Lo siento, encontré un problema al procesar tu solicitud: ${errorInfo}\n\n${finalResponse}`;
        }
      }
      
      // Emitir evento con la respuesta final generada
      this.eventEmitter.emit('response:generated', { 
        chatId, 
        response: finalResponse,
        success: executionSuccess && reflectionSuccess
      });
      
      // Retornar el estado actualizado con la respuesta final
      return {
        ...state,
        output: finalResponse
      };
    } catch (error: any) {
      console.error('[ReActGraph] Error generating response:', error);
      
      // En caso de error, proporcionar una respuesta genérica
      const errorResponse = `Lo siento, ocurrió un error al generar la respuesta. Por favor, intenta de nuevo o reformula tu pregunta. Error: ${error.message}`;
      
      return {
        ...state,
        output: errorResponse
      };
    }
  }
}

/**
 * Crea un grafo ReAct con el modelo especificado
 * @param modelName Nombre del modelo a utilizar
 * @param eventEmitter Instancia de EventEmitter para emitir eventos durante la ejecución
 * @returns Instancia de ReActGraph
 */
export function createReActGraph(modelName: string = 'gemini-pro', eventEmitter?: EventEmitter): ReActGraph {
  // Si no se proporciona un eventEmitter, crear uno nuevo
  const emitter = eventEmitter || new EventEmitter();
  return new ReActGraph(modelName, emitter);
}
