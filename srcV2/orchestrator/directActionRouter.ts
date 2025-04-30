/**
 * Enrutador de Acciones Directas
 * 
 * Responsabilidad: Ejecutar acciones simples sin necesidad de planificación.
 * Este componente maneja solicitudes que pueden ser resueltas directamente,
 * sin necesidad de crear un plan detallado o un flujo de trabajo complejo.
 */

import { Logger } from '../utils/logger';
import { ErrorHandler } from '../utils/errorHandler';
import { EventBus } from '../core/event/eventBus';
import { ToolRegistry } from '../tools/core/toolRegistry';
import { OrchestrationContext } from '../core/context/orchestrationContext';


/**
 * Interfaz que define el resultado de una acción directa
 */
export interface DirectActionResult {
  success: boolean;
  actionExecuted: string;
  result: any;
  error?: string;
  nextAction?: {
    type: string;
    params: any;
  };
}

/**
 * Clase para ejecutar acciones directas
 */
export class DirectActionRouter {
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private eventBus: EventBus;
  private toolRegistry: ToolRegistry;
  private orchestrationContext: OrchestrationContext;

  constructor(
    logger: Logger,
    errorHandler: ErrorHandler,
    eventBus: EventBus,
    toolRegistry: ToolRegistry,
    orchestrationContext: OrchestrationContext
  ) {
    this.logger = logger;
    this.errorHandler = errorHandler;
    this.eventBus = eventBus;
    this.toolRegistry = toolRegistry;
    this.orchestrationContext = orchestrationContext;
  }

  /**
   * Ejecuta una acción directa
   * @param toolName El nombre de la herramienta a ejecutar
   * @param params Los parámetros para la herramienta
   * @returns El resultado de la acción
   */
  public async executeAction(toolName: string, params: object): Promise<DirectActionResult> {
    try {
      this.logger.info('DirectActionRouter: Executing action', { toolName, params });
      
      // Verificar si la herramienta existe
      const tool = this.toolRegistry.getByName(toolName);
      if (!tool) {
        throw new Error(`Tool not found: ${toolName}`);
      }
      
      // Validar los parámetros
      if (!tool.validateParams(params)) {
        throw new Error(`Invalid parameters for tool: ${toolName}`);
      }
      
      // Emitir evento de inicio de acción
      this.eventBus.emit('action:started', { toolName, params });
      
      // Ejecutar la herramienta
      const result = await tool.execute(params);
      
      // Crear el resultado de la acción
      const actionResult: DirectActionResult = {
        success: true,
        actionExecuted: toolName,
        result: result
      };
      
      // Determinar si se necesita una acción siguiente
      const nextAction = this.determineNextAction(toolName, result);
      if (nextAction) {
        actionResult.nextAction = nextAction;
      }
      
      // Emitir evento de finalización de acción
      this.eventBus.emit('action:completed', actionResult);
      
      // Actualizar el contexto de la sesión
      this.updateorchestrationContext(toolName, params, result);
      
      return actionResult;
    } catch (error) {
      return this.handleError(toolName, error);
    }
  }

  /**
   * Maneja un error durante la ejecución de una acción
   * @param toolName El nombre de la herramienta que falló
   * @param error El error ocurrido
   * @returns Un resultado de acción con el error
   */
  private handleError(toolName: string, error: any): DirectActionResult {
    const errorInfo = this.errorHandler.handleError(error);
    this.logger.error('DirectActionRouter: Error executing action', { toolName, error: errorInfo });
    
    // Emitir evento de error
    this.eventBus.emit('action:failed', { toolName, error: errorInfo });
    
    return {
      success: false,
      actionExecuted: toolName,
      result: null,
      error: errorInfo.message
    };
  }

  /**
   * Determina si se necesita una acción siguiente basada en el resultado actual
   * @param toolName El nombre de la herramienta ejecutada
   * @param result El resultado de la ejecución
   * @returns Una acción siguiente o null si no se necesita
   */
  private determineNextAction(toolName: string, result: any): { type: string; params: any } | undefined {
    // Esta es una lógica simple para determinar acciones siguientes
    // En una implementación real, podría ser más compleja y basada en reglas
    
    // Ejemplo: Si la acción fue un análisis de código y encontró problemas,
    // la siguiente acción podría ser una sugerencia de corrección
    if (toolName === 'codeExaminer' && result.analysis?.potentialIssues?.length > 0) {
      return {
        type: 'suggestion',
        params: {
          issueCount: result.analysis.potentialIssues.length,
          suggestFixes: true
        }
      };
    }
    
    // Si no hay reglas específicas, no sugerir acción siguiente
    return undefined;
  }

  /**
   * Actualiza el contexto de la sesión con información de la acción ejecutada
   * @param toolName El nombre de la herramienta ejecutada
   * @param params Los parámetros usados
   * @param result El resultado obtenido
   */
  private updateorchestrationContext(toolName: string, params: object, result: any): void {
    this.orchestrationContext.set({
      lastAction: {
        tool: toolName,
        params: params,
        timestamp: Date.now(),
        success: true
      }
    });
  }
}