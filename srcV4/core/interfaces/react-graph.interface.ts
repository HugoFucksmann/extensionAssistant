/**
 * Interfaz para el grafo ReAct de la arquitectura Windsurf
 * Define el contrato que debe implementar cualquier implementación del grafo ReAct
 */

import { ReActState, ReActGraphResult } from '../../langgraph/types';
import { IToolRegistry } from './tool-registry.interface';
import { AgentState } from '../state/agent-state';

export interface IReActGraph {
  /**
   * Ejecuta el grafo ReAct con un estado inicial
   * @param state Estado inicial
   * @returns Resultado de la ejecución del grafo
   */
  runGraph(state: ReActState): Promise<ReActGraphResult>;

  /**
   * Ejecuta el grafo ReAct con un estado unificado
   * @param state Estado unificado del agente
   * @returns Estado actualizado después de la ejecución
   */
  run(state: AgentState): Promise<AgentState>;

  /**
   * Establece el registro de herramientas a utilizar
   * @param toolRegistry Registro de herramientas
   */
  setToolRegistry(toolRegistry: IToolRegistry): void;

  /**
   * Establece el modelo a utilizar
   * @param modelName Nombre del modelo
   */
  setModel(modelName: string): void;

  /**
   * Obtiene el nombre del modelo actual
   * @returns Nombre del modelo
   */
  getModel(): string;

  /**
   * Cancela la ejecución actual del grafo
   * @param chatId ID de la conversación
   */
  cancelExecution(chatId: string): void;
}
