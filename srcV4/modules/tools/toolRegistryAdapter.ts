import { IToolRegistry } from '../../core/interfaces/tool-registry.interface';
import { Tool, ToolResult } from './types';
import { IEventBus } from '../../core/interfaces/event-bus.interface';
import { EventType, ToolExecutionEventPayload, ErrorEventPayload } from '../../shared/events/types/eventTypes';
import { randomUUID } from 'crypto';

/**
 * Adaptador que implementa la interfaz IToolRegistry
 * para el ToolRegistry específico de la aplicación
 */
export class ToolRegistryAdapter implements IToolRegistry {
  constructor(
    private toolRegistry: any,
    private eventBus?: IEventBus
  ) {
    if (!eventBus) {
      console.warn('ToolRegistryAdapter: No eventBus provided, event emission will be disabled');
    }
  }

  registerTool(tool: Tool): void {
    this.toolRegistry.register(tool);
  }

  getTool(name: string): Tool | undefined {
    return this.toolRegistry.getTool(name);
  }

  getAllTools(): Tool[] {
    return this.toolRegistry.getAllTools();
  }

  async executeTool(name: string, params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();
    const executionId = randomUUID();
    
    // Emitir evento de inicio de ejecución
    const startPayload: ToolExecutionEventPayload = {
      toolName: name,
      parameters: params,
      timestamp: startTime,
      tool: name
    };
    
    this.eventBus?.emit(EventType.TOOL_EXECUTION_STARTED, startPayload);
    
    try {
      const result = await this.toolRegistry.executeTool(name, params);
      const endTime = Date.now();
      
      // Emitir evento de finalización exitosa
      const successPayload: ToolExecutionEventPayload = {
        ...startPayload,
        result,
        duration: endTime - startTime,
        timestamp: endTime
      };
      
      this.eventBus?.emit(EventType.TOOL_EXECUTION_COMPLETED, successPayload);
      return result;
      
    } catch (error) {
      const errorTime = Date.now();
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Emitir evento de error
      const errorPayload: ErrorEventPayload = {
        error: errorMessage,
        source: `ToolExecution:${name}`,
        details: {
          tool: name,
          params,
          executionId
        },
        timestamp: errorTime,
        stack: error instanceof Error ? error.stack : undefined
      };
      
      this.eventBus?.emit(EventType.TOOL_EXECUTION_ERROR, errorPayload);
      
      // También emitir un evento de error general
      this.eventBus?.emit(EventType.ERROR_OCCURRED, {
        error: errorMessage,
        source: 'ToolRegistryAdapter',
        timestamp: errorTime,
        details: {
          tool: name,
          executionId,
          duration: errorTime - startTime
        }
      });
      
      throw error;
    }
  }

  hasTool(name: string): boolean {
    return this.toolRegistry.getTool(name) !== undefined;
  }

  removeTool(name: string): boolean {
    // Implementación básica - asumiendo que el registro subyacente tiene un método remove
    if (this.toolRegistry.remove) {
      return this.toolRegistry.remove(name);
    }
    
    // Si no hay un método remove, podemos implementar una solución alternativa
    // dependiendo de cómo esté implementado el registro subyacente
    throw new Error('removeTool no está implementado en el registro subyacente');
  }
}

/**
 * Crea una instancia del adaptador con la implementación predeterminada
 * @returns Una instancia de ToolRegistryAdapter
 */
export function createToolRegistryAdapter(): ToolRegistryAdapter {
  const { toolRegistry } = require('./toolRegistry');
  return new ToolRegistryAdapter(toolRegistry);
}
