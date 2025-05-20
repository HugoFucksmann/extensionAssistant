/**
 * Adaptador para el ReActGraph que implementa la interfaz IReActGraph
 * Permite utilizar el ReActGraph existente a través de la interfaz definida
 */

import { IReActGraph, GraphExecutionResult } from '../core/interfaces/react-graph.interface';
import { AgentState } from '../core/state/agent-state';
import { ReActGraph } from './reactGraph';
import { IEventBus } from '../core/interfaces/event-bus.interface';
import { ReActState, IntermediateStep, createInitialReActState } from './types';

/**
 * Adaptador para el ReActGraph que implementa la interfaz IReActGraph
 */
export class ReActGraphAdapter implements IReActGraph {
  private reactGraph: ReActGraph;
  private eventBus: IEventBus;
  
  /**
   * Constructor del adaptador
   * @param reactGraph Instancia del ReActGraph original
   * @param eventBus Bus de eventos para notificaciones
   */
  constructor(reactGraph: ReActGraph, eventBus: IEventBus) {
    this.reactGraph = reactGraph;
    this.eventBus = eventBus;
  }
  
  /**
   * Ejecuta el grafo ReAct con un estado de agente
   * @param state Estado del agente
   * @returns Resultado de la ejecución del grafo
   */
  public async executeGraph(state: AgentState): Promise<GraphExecutionResult> {
    try {
      this.eventBus.debug(`[ReActGraphAdapter] Executing graph for chat ${state.chatId}`);
      
      // Convertir el AgentState al formato ReActState que espera el ReActGraph
      const reactState = this.convertToReActState(state);
      
      // Ejecutar el grafo ReAct
      const startTime = Date.now();
      const result = await this.reactGraph.runGraph(reactState);
      const duration = Date.now() - startTime;
      
      // Convertir el resultado al formato esperado por la interfaz
      const adaptedResult: GraphExecutionResult = {
        success: result.output !== null,
        response: result.output || '',
        state: this.updateAgentStateFromResult(state, result),
        executionInfo: {
          startTime: result.executionInfo.startTime,
          endTime: result.executionInfo.endTime,
          duration: result.executionInfo.duration,
          steps: result.executionInfo.nodeVisits,
          iterations: result.executionInfo.iterations
        }
      };
      
      this.eventBus.debug(`[ReActGraphAdapter] Graph execution completed in ${duration}ms`);
      
      return adaptedResult;
    } catch (error: any) {
      this.eventBus.debug(`[ReActGraphAdapter] Error executing graph: ${error.message}`);
      
      return {
        success: false,
        response: `Lo siento, ocurrió un error durante la ejecución: ${error.message}`,
        state: {
          ...state,
          currentStep: 'error',
          error: error.message
        },
        executionInfo: {
          startTime: Date.now() - 1000, // Aproximación
          endTime: Date.now(),
          duration: 1000, // Aproximación
          steps: ['error'],
          iterations: 1
        }
      };
    }
  }
  
  /**
   * Convierte un AgentState al formato ReActState
   * @param state Estado del agente
   * @returns Estado en formato ReActState
   */
  private convertToReActState(state: AgentState): ReActState {
    // Extraer el último mensaje del usuario
    const userMessage = state.messages.find(m => m.role === 'user')?.content || '';
    
    // Crear un estado ReAct inicial
    const reactState = createInitialReActState(userMessage);
    
    // Añadir metadatos adicionales
    reactState.metadata = {
      ...reactState.metadata,
      chatId: state.chatId,
      contextData: state.context,
      startTime: state.startTime || Date.now(),
      modelName: state.metadata?.modelName || 'gemini-pro'
    };
    
    // Convertir los pasos intermedios si existen
    if (state.toolExecutions && state.toolExecutions.length > 0) {
      reactState.intermediateSteps = state.toolExecutions.map(tool => {
        return {
          action: {
            tool: tool.toolName,
            toolInput: tool.input
          },
          observation: tool.output
        } as IntermediateStep;
      });
    }
    
    return reactState;
  }
  
  /**
   * Actualiza el AgentState con los resultados de la ejecución del grafo
   * @param originalState Estado original del agente
   * @param result Resultado de la ejecución del grafo
   * @returns Estado del agente actualizado
   */
  private updateAgentStateFromResult(originalState: AgentState, result: any): AgentState {
    // Extraer herramientas ejecutadas del resultado
    const toolExecutions = result.intermediateSteps
      .filter((step: any) => step.action.tool === 'execute')
      .map((step: any) => {
        return {
          toolName: step.action.action,
          input: step.action.parameters || {},
          output: step.observation || {},
          timestamp: Date.now(),
          success: step.observation?.success !== false
        };
      });
    
    // Extraer razonamientos
    const reasoning = result.intermediateSteps
      .filter((step: any) => step.action.tool === 'reason')
      .map((step: any) => typeof step.observation === 'string' ? step.observation : JSON.stringify(step.observation));
    
    // Extraer reflexiones
    const reflections = result.intermediateSteps
      .filter((step: any) => step.action.tool === 'reflect')
      .flatMap((step: any) => {
        if (typeof step.observation === 'string') {
          return [step.observation];
        } else if (step.observation.insights && Array.isArray(step.observation.insights)) {
          return step.observation.insights;
        } else {
          return [];
        }
      });
    
    // Actualizar el estado del agente
    return {
      ...originalState,
      currentStep: 'completed',
      finalResponse: result.output,
      toolExecutions: [...(originalState.toolExecutions || []), ...toolExecutions],
      reasoning: [...(originalState.reasoning || []), ...reasoning],
      reflections: [...(originalState.reflections || []), ...reflections],
      lastUpdateTime: result.executionInfo.endTime,
      metadata: {
        ...originalState.metadata,
        executionInfo: result.executionInfo
      }
    };
  }
}
