/**
 * Implementación del grafo ReAct usando LangGraph
 * Define el flujo de trabajo Reasoning → Action → Reflection → Correction
 */


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
// Importar desde @langchain/langgraph usando require para evitar errores de tipado
const { StateGraph } = require('@langchain/langgraph');
const { END } = require('@langchain/langgraph/dist/constants');
import { RunnableLambda } from '@langchain/core/runnables';

/**
 * Implementa el grafo de estados para el ciclo ReAct de Windsurf
 * Utiliza LangGraph para definir los nodos y transiciones del grafo
 */
export class WindsurfGraph {
  private graph: any; // Usar any para evitar errores de tipado con StateGraph
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
  private buildGraph(): any { // Usar any para evitar errores de tipado con StateGraph
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
    const graph = new StateGraph({
      channels: {
        objective: (state: WindsurfState) => state.objective,
        userMessage: (state: WindsurfState) => state.userMessage,
        chatId: (state: WindsurfState) => state.chatId,
        iterationCount: (state: WindsurfState) => state.iterationCount,
        completionStatus: (state: WindsurfState) => state.completionStatus,
        history: (state: WindsurfState) => state.history,
        maxIterations: (state: WindsurfState) => state.maxIterations
      }
    });
    
    // Añadir los nodos al grafo
    graph.addNode("initialAnalysis", this.initialAnalysisNode());
    graph.addNode("reasoning", this.reasoningNode());
    graph.addNode("action", this.actionNode());
    graph.addNode("reflection", this.reflectionNode());
    graph.addNode("correction", this.correctionNode());
    
    // Definir las transiciones entre estados
    // Usar el método addEdge con el formato correcto según la API de LangGraph
    
    // Del inicio al análisis inicial
    graph.setEntryPoint("initialAnalysis");
    
    // Del análisis inicial al razonamiento
    graph.addEdge([
      {
        source: "initialAnalysis",
        target: "reasoning",
      }
    ]);
    
    // Del razonamiento a la acción
    graph.addEdge([
      {
        source: "reasoning",
        target: "action",
      }
    ]);
    
    // De la acción a la reflexión
    graph.addEdge([
      {
        source: "action",
        target: "reflection",
      }
    ]);
    
    // De la reflexión a la corrección (condicional)
    graph.addConditionalEdges(
      "reflection",
      (state: WindsurfState) => {
        if (state.reflectionResult?.needsCorrection === true) {
          return "correction";
        } else if (
          state.actionResult?.toolName === "respond" && 
          state.actionResult?.success === true &&
          state.reflectionResult?.isSuccessful === true
        ) {
          return "__end__";
        } else if (state.iterationCount >= state.maxIterations) {
          return "__end__";
        } else {
          return "reasoning";
        }
      }
    );
    
    // De la corrección al razonamiento
    graph.addEdge([
      {
        source: "correction",
        target: "reasoning",
      }
    ]);
    
    return graph;
  }
  
  /**
   * Nodo de análisis inicial
   * Analiza el mensaje del usuario para determinar el objetivo y entidades relevantes
   */
  private initialAnalysisNode() {
    return new RunnableLambda({
      func: async (state: WindsurfState) => {
      console.log(`[WindsurfGraph:${state.chatId}] Initial analysis`);
      
      // Obtener el prompt para el análisis inicial
      const prompt = this.promptManager.getPrompt('initialAnalysis');
      
      // Invocar el modelo con el prompt y el estado actual
      const response = await this.modelManager.generateResponse(prompt, state);
      
      // Parsear la respuesta como InitialAnalysisResult
      const analysisResult = JSON.parse(response);
      
      // Actualizar el estado con el resultado del análisis
      return {
        ...state,
        objective: analysisResult.objective || state.objective,
        entities: analysisResult.entities || [],
        context: analysisResult.context || {},
        history: [
          ...state.history,
          {
            phase: 'analysis',
            timestamp: Date.now(),
            data: analysisResult,
            iteration: state.iterationCount
          }
        ]
      };
    }
  });
  }
  
  /**
   * Nodo de razonamiento
   * Analiza el estado actual y planifica los próximos pasos
   */
  private reasoningNode() {
    return new RunnableLambda({
      func: async (state: WindsurfState) => {
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
    }
  });
  }
  
  /**
   * Nodo de acción
   * Ejecuta la herramienta seleccionada en la fase de razonamiento
   */
  private actionNode() {
    return new RunnableLambda({
      func: async (state: WindsurfState) => {
      if (!state.reasoningResult?.nextAction) {
        throw new Error('No next action specified in reasoning result');
      }
      
      console.log(`[WindsurfGraph:${state.chatId}] Action: ${state.reasoningResult.nextAction.toolName}`);
      
      // Extraer la herramienta y los parámetros
      const { toolName, params } = state.reasoningResult.nextAction;
      
      // Verificar si la herramienta existe
      if (!this.toolRegistry.hasTool(toolName)) {
        throw new Error(`Tool not found: ${toolName}`);
      }
      
      // Ejecutar la herramienta
      let actionResult: ActionResult;
      
      try {
        // Obtener la herramienta
        const tool = this.toolRegistry.getTool(toolName);
        
        if (!tool) {
          throw new Error(`Tool not found: ${toolName}`);
        }
        
        // Ejecutar la herramienta con los parámetros
        const result = await tool.execute(params);
        
        // Crear el resultado exitoso
        actionResult = {
          toolName,
          params,
          success: true,
          result,
          timestamp: Date.now()
        };
      } catch (error: unknown) {
        // Crear el resultado fallido
        actionResult = {
          toolName,
          params,
          success: false,
          error: error instanceof Error ? error.message : String(error),
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
    }
  });
  }
  
  /**
   * Nodo de reflexión
   * Evalúa el resultado de la acción y determina si fue exitoso
   */
  private reflectionNode() {
    return new RunnableLambda({
      func: async (state: WindsurfState) => {
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
    }
  });
  }
  
  /**
   * Nodo de corrección
   * Corrige el plan si la reflexión determinó que es necesario
   */
  private correctionNode() {
    return new RunnableLambda({
      func: async (state: WindsurfState) => {
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
    }
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
      // Usar el método invoke con un objeto que cumpla con la estructura esperada
      const result = await compiledGraph.invoke(initialState) as WindsurfState;
      
      return result;
    } catch (error: unknown) {
      console.error(`[WindsurfGraph:${initialState.chatId}] Error running graph:`, error);
      
      // Devolver el estado inicial con un estado de error
      return {
        ...initialState,
        completionStatus: 'failed',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
