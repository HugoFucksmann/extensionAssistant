/**
 * Adaptador para el ReActGraph que implementa la interfaz IReActGraph
 * Permite utilizar el ReActGraph existente a través de la interfaz definida
 */

import { IReActGraph } from '../core/interfaces/react-graph.interface';
import { IToolRegistry } from '../core/interfaces/tool-registry.interface';
import { AgentState, updateAgentState } from '../core/state/agent-state';
import { ReActGraph } from './reactGraph';
import { IEventBus } from '../core/interfaces/event-bus.interface';
import { EventType } from '../events/eventTypes';
import { ReActState, ReActGraphResult, IntermediateStep, createInitialReActState } from './types';

// Definición interna para los resultados de ejecución
interface GraphExecutionResult {
  success: boolean;
  response: string;
  state: AgentState;
  executionInfo: {
    startTime: number;
    endTime: number;
    duration: number;
    steps: string[];
    iterations: number;
  };
}

/**
 * Adaptador para el ReActGraph que implementa la interfaz IReActGraph
 */
export class ReActGraphAdapter implements IReActGraph {
  // Propiedades privadas para almacenar estado
  private _modelName?: string;
  private _toolRegistry?: IToolRegistry;
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
   * Ejecuta el grafo ReAct con un estado inicial
   * @param state Estado inicial
   * @returns Resultado de la ejecución del grafo
   */
  public async runGraph(state: ReActState): Promise<ReActGraphResult> {
    try {
      this.eventBus.debug(`[ReActGraphAdapter] Running graph`);
      
      // Ejecutar el grafo ReAct directamente
      const result = await this.reactGraph.runGraph(state);
      
      this.eventBus.debug(`[ReActGraphAdapter] Graph execution completed`);
      
      return result;
    } catch (error: any) {
      this.eventBus.debug(`[ReActGraphAdapter] Error running graph: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Ejecuta el grafo ReAct con un estado de agente
   * @param state Estado del agente
   * @returns Estado del agente actualizado
   */
  public async run(state: AgentState): Promise<AgentState> {
    try {
      this.eventBus.debug(`[ReActGraphAdapter] Executing graph for chat ${state.chatId}`);
      
      // Convertir el AgentState al formato ReActState que espera el ReActGraph
      const reactState = this.convertToReActState(state);
      
      // Ejecutar el grafo ReAct
      const startTime = Date.now();
      const result = await this.runGraph(reactState);
      const duration = Date.now() - startTime;
      
      // Actualizar el estado con los resultados
      const updatedState = this.updateAgentStateFromResult(state, result);
      
      this.eventBus.debug(`[ReActGraphAdapter] Graph execution completed in ${duration}ms`);
      
      return updatedState;
    } catch (error: any) {
      this.eventBus.debug(`[ReActGraphAdapter] Error executing graph: ${error.message}`);
      
      // En caso de error, devolver el estado con información del error
      return updateAgentState(state, {
        currentStep: 'error',
        metadata: {
          error: error.message
        }
      });
    }
  }
  
  /**
   * Establece el registro de herramientas a utilizar
   * @param toolRegistry Registro de herramientas
   */
  public setToolRegistry(toolRegistry: IToolRegistry): void {
    // Implementamos el método para cumplir con la interfaz, pero no hacemos nada
    // ya que la implementación subyacente no soporta esta funcionalidad
    this.eventBus.debug('[ReActGraphAdapter] Tool registry provided via adapter');
    // Guardamos la referencia al registry para uso interno
    this._toolRegistry = toolRegistry;
  }
  
  /**
   * Establece el modelo a utilizar
   * @param modelName Nombre del modelo
   */
  public setModel(modelName: string): void {
    // Implementamos el método para cumplir con la interfaz, pero guardamos
    // el nombre del modelo para uso interno
    this._modelName = modelName;
    this.eventBus.debug(`[ReActGraphAdapter] Model set to: ${modelName}`);
  }
  
  /**
   * Obtiene el nombre del modelo actual
   * @returns Nombre del modelo
   */
  public getModel(): string {
    // Devolvemos el modelo guardado internamente o 'unknown' si no se ha establecido
    return this._modelName || 'unknown';
  }
  
  /**
   * Cancela la ejecución actual del grafo
   * @param chatId ID de la conversación
   */
  public cancelExecution(chatId: string): void {
    // Implementamos el método para cumplir con la interfaz
    // Emitimos un evento para notificar la cancelación
    this.eventBus.emit(EventType.ACTION_COMPLETED, { chatId, result: 'cancelled' });
    this.eventBus.debug(`[ReActGraphAdapter] Execution cancelled for chat: ${chatId}`);
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
