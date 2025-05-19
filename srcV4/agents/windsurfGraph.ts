/**
 * Implementación del grafo ReAct usando LangGraph
 * Define el flujo de trabajo Reasoning → Action → Reflection → Correction
 */

import { 
  defineGraph, 
  step, 
  StateGraph, 
  END 
} from "langgraph/graph";
import { 
  WindsurfState, 
  ReasoningResult, 
  ActionResult, 
  ReflectionResult, 
  CorrectionResult 
} from '../core/types';
import { ToolRegistry } from '../tools/toolRegistry';
import { PromptManager } from '../prompts/promptManager';
import { ModelManager } from '../models/modelManager';

/**
 * Implementa el grafo de estados para el ciclo ReAct de Windsurf
 * Utiliza LangGraph para definir los nodos y transiciones del grafo
 */
export class WindsurfGraph {
  private graph: StateGraph<WindsurfState>;
  private modelManager: ModelManager;
  private toolRegistry: ToolRegistry;
  private promptManager: PromptManager;
  
  constructor(
    modelManager: ModelManager,
    toolRegistry: ToolRegistry,
    promptManager: PromptManager
  ) {
    this.modelManager = modelManager;
    this.toolRegistry = toolRegistry;
    this.promptManager = promptManager;
    
    // Construir el grafo
    this.graph = this.buildGraph();
    
    console.log('[WindsurfGraph] Initialized');
  }
  
  /**
   * Construye el grafo de estados para el ciclo ReAct
   * Define los nodos y las transiciones entre ellos
   */
  private buildGraph(): StateGraph<WindsurfState> {
    // Definir los nodos del grafo (estados)
    const states = {
      // Nodo de análisis inicial - solo se ejecuta una vez al principio
      initialAnalysis: this.initialAnalysisNode(),
      
      // Nodo de razonamiento - planifica los próximos pasos
      reasoning: this.reasoningNode(),
      
      // Nodo de acción - ejecuta herramientas o genera respuestas
      action: this.actionNode(),
      
      // Nodo de reflexión - evalúa los resultados de la acción
      reflection: this.reflectionNode(),
      
      // Nodo de corrección - corrige el plan si es necesario
      correction: this.correctionNode()
    };
    
    // Crear el grafo
    const graph = defineGraph<WindsurfState>({ states });
    
    // Definir las transiciones entre estados
    graph.addEdge("initialAnalysis", "reasoning");
    
    // Del razonamiento siempre vamos a la acción
    graph.addEdge("reasoning", "action");
    
    // De la acción siempre vamos a la reflexión
    graph.addEdge("action", "reflection");
    
    // De la reflexión podemos ir a la corrección o volver al razonamiento
    graph.addConditionalEdges(
      "reflection",
      (state) => {
        // Si necesitamos corrección, ir al nodo de corrección
        if (state.reflectionResult?.needsCorrection) {
          return "correction";
        }
        
        // Si la acción fue "respond" y fue exitosa, terminar
        if (
          state.actionResult?.toolName === "respond" && 
          state.actionResult?.success &&
          state.reflectionResult?.isSuccessful
        ) {
          return END;
        }
        
        // Si alcanzamos el máximo de iteraciones, terminar
        if (state.iterationCount >= state.maxIterations) {
          return END;
        }
        
        // Por defecto, volver al razonamiento
        return "reasoning";
      }
    );
    
    // De la corrección siempre volvemos al razonamiento
    graph.addEdge("correction", "reasoning");
    
    return graph;
  }
  
  /**
   * Nodo de análisis inicial
   * Analiza el mensaje del usuario para determinar el objetivo y entidades relevantes
   */
  private initialAnalysisNode() {
    return step<WindsurfState>(async (state) => {
      console.log(`[WindsurfGraph:${state.chatId}] Initial analysis`);
      
      // Obtener el prompt para el análisis inicial
      const prompt = this.promptManager.getPrompt('initialAnalysis');
      
      // Invocar el modelo con el prompt y el mensaje del usuario
      const response = await this.modelManager.generateResponse(prompt, {
        userMessage: state.userMessage,
        chatId: state.chatId,
        projectContext: state.projectContext
      });
      
      // Parsear la respuesta
      const analysisResult = JSON.parse(response);
      
      // Actualizar el estado con el resultado del análisis
      return {
        ...state,
        objective: analysisResult.objective,
        extractedEntities: analysisResult.extractedEntities,
        intent: analysisResult.intent,
        history: [
          ...state.history,
          {
            phase: 'initialAnalysis',
            timestamp: Date.now(),
            data: analysisResult,
            iteration: 0
          }
        ]
      };
    });
  }
  
  /**
   * Nodo de razonamiento
   * Analiza el estado actual y planifica los próximos pasos
   */
  private reasoningNode() {
    return step<WindsurfState>(async (state) => {
      console.log(`[WindsurfGraph:${state.chatId}] Reasoning (iteration ${state.iterationCount})`);
      
      // Incrementar el contador de iteraciones
      const updatedState = {
        ...state,
        iterationCount: state.iterationCount + 1
      };
      
      // Obtener el prompt para el razonamiento
      const prompt = this.promptManager.getPrompt('reasoning');
      
      // Invocar el modelo con el prompt y el estado actual
      const response = await this.modelManager.generateResponse(prompt, updatedState);
      
      // Parsear la respuesta como ReasoningResult
      const reasoningResult = JSON.parse(response) as ReasoningResult;
      
      // Actualizar el estado con el resultado del razonamiento
      return {
        ...updatedState,
        reasoningResult,
        history: [
          ...updatedState.history,
          {
            phase: 'reasoning',
            timestamp: Date.now(),
            data: reasoningResult,
            iteration: updatedState.iterationCount
          }
        ]
      };
    });
  }
  
  /**
   * Nodo de acción
   * Ejecuta la herramienta seleccionada en la fase de razonamiento
   */
  private actionNode() {
    return step<WindsurfState>(async (state) => {
      if (!state.reasoningResult?.nextAction) {
        throw new Error('No next action specified in reasoning result');
      }
      
      const { toolName, params } = state.reasoningResult.nextAction;
      console.log(`[WindsurfGraph:${state.chatId}] Action: ${toolName}`);
      
      let actionResult: ActionResult;
      
      try {
        // Obtener la herramienta del registro
        const tool = this.toolRegistry.getTool(toolName);
        
        if (!tool) {
          throw new Error(`Tool not found: ${toolName}`);
        }
        
        // Ejecutar la herramienta
        const result = await tool.execute(params);
        
        // Crear el resultado exitoso
        actionResult = {
          toolName,
          params,
          success: true,
          result,
          timestamp: Date.now()
        };
      } catch (error) {
        // Crear el resultado fallido
        actionResult = {
          toolName,
          params,
          success: false,
          error: error.message,
          timestamp: Date.now()
        };
        
        console.error(`[WindsurfGraph:${state.chatId}] Action failed:`, error);
      }
      
      // Actualizar el estado con el resultado de la acción
      return {
        ...state,
        actionResult,
        history: [
          ...state.history,
          {
            phase: 'action',
            timestamp: Date.now(),
            data: actionResult,
            iteration: state.iterationCount
          }
        ]
      };
    });
  }
  
  /**
   * Nodo de reflexión
   * Evalúa el resultado de la acción y determina si fue exitoso
   */
  private reflectionNode() {
    return step<WindsurfState>(async (state) => {
      console.log(`[WindsurfGraph:${state.chatId}] Reflection`);
      
      // Obtener el prompt para la reflexión
      const prompt = this.promptManager.getPrompt('reflection');
      
      // Invocar el modelo con el prompt y el estado actual
      const response = await this.modelManager.generateResponse(prompt, state);
      
      // Parsear la respuesta como ReflectionResult
      const reflectionResult = JSON.parse(response) as ReflectionResult;
      
      // Actualizar el estado con el resultado de la reflexión
      return {
        ...state,
        reflectionResult,
        // Actualizar el estado de completitud basado en la reflexión
        completionStatus: reflectionResult.isSuccessful && state.actionResult?.toolName === 'respond'
          ? 'completed'
          : (reflectionResult.needsCorrection ? 'in_progress' : 'in_progress'),
        history: [
          ...state.history,
          {
            phase: 'reflection',
            timestamp: Date.now(),
            data: reflectionResult,
            iteration: state.iterationCount
          }
        ]
      };
    });
  }
  
  /**
   * Nodo de corrección
   * Corrige el plan si la reflexión determinó que es necesario
   */
  private correctionNode() {
    return step<WindsurfState>(async (state) => {
      console.log(`[WindsurfGraph:${state.chatId}] Correction`);
      
      // Si no necesita corrección, simplemente devolver el estado actual
      if (!state.reflectionResult?.needsCorrection) {
        return {
          ...state,
          correctionResult: { needsCorrection: false }
        };
      }
      
      // Obtener el prompt para la corrección
      const prompt = this.promptManager.getPrompt('correction');
      
      // Invocar el modelo con el prompt y el estado actual
      const response = await this.modelManager.generateResponse(prompt, state);
      
      // Parsear la respuesta como CorrectionResult
      const correctionResult = JSON.parse(response) as CorrectionResult;
      
      // Actualizar el estado con el resultado de la corrección
      return {
        ...state,
        correctionResult,
        history: [
          ...state.history,
          {
            phase: 'correction',
            timestamp: Date.now(),
            data: correctionResult,
            iteration: state.iterationCount
          }
        ]
      };
    });
  }
  
  /**
   * Ejecuta el grafo ReAct con el estado inicial proporcionado
   */
  public async runGraph(initialState: WindsurfState): Promise<WindsurfState> {
    try {
      // Compilar el grafo
      const compiledGraph = this.graph.compile();
      
      // Ejecutar el grafo con el estado inicial
      const result = await compiledGraph.invoke(initialState);
      
      return result;
    } catch (error) {
      console.error(`[WindsurfGraph:${initialState.chatId}] Error running graph:`, error);
      
      // Devolver el estado inicial con un estado de error
      return {
        ...initialState,
        completionStatus: 'failed',
        error: error.message
      };
    }
  }
}
