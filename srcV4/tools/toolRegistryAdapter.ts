/**
 * Adaptador para el ToolRegistry que implementa la interfaz IToolRegistry
 * Permite utilizar el ToolRegistry existente a través de la interfaz definida
 */

import { IToolRegistry } from '../core/interfaces/tool-registry.interface';
import { EventType } from '../shared/events/types/eventTypes';
import { Tool, ToolResult } from '../core/types';
import { ToolRegistry } from './toolRegistry';
import { IEventBus } from '../core/interfaces/event-bus.interface';
// Definiciones internas para el adaptador
interface ToolDefinition {
  name: string;
  description: string;
  execute: Function;
  parameters: Record<string, any>;
  returns: Record<string, any>;
}

interface ToolParameters {
  [key: string]: any;
}

interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata: {
    toolName: string;
    executionTime: number;
    timestamp: number;
  };
}

/**
 * Adaptador para el ToolRegistry que implementa la interfaz IToolRegistry
 */
export class ToolRegistryAdapter implements IToolRegistry {
  private toolRegistry: ToolRegistry;
  private eventBus: IEventBus;
  
  /**
   * Constructor del adaptador
   * @param toolRegistry Instancia del ToolRegistry original
   * @param eventBus Bus de eventos para notificaciones
   */
  constructor(toolRegistry: ToolRegistry, eventBus: IEventBus) {
    this.toolRegistry = toolRegistry;
    this.eventBus = eventBus;
  }
  
  /**
   * Registra una nueva herramienta en el registro
   * @param definition Definición de la herramienta
   * @returns true si se registró correctamente, false si ya existía
   */
  public registerTool(tool: Tool): void {
    if (this.toolRegistry.hasTool(tool.name)) {
      this.eventBus.debug(`[ToolRegistryAdapter] Tool already exists: ${tool.name}`);
      return;
    }
    
    // Registrar la herramienta directamente
    this.toolRegistry.registerTool(
      tool.name,
      tool.execute,
      tool.description,
      tool.schema
    );
    
    this.eventBus.debug(`[ToolRegistryAdapter] Registered tool: ${tool.name}`);
    this.eventBus.emit(EventType.DEBUG_LOG, { message: `Tool registered: ${tool.name}` });
  }
  
  /**
   * Desregistra una herramienta del registro
   * @param toolName Nombre de la herramienta a desregistrar
   * @returns true si se desregistró correctamente, false si no existía
   */
  public removeTool(name: string): boolean {
    if (!this.toolRegistry.hasTool(name)) {
      return false;
    }
    
    // Como el ToolRegistry actual no tiene un método para desregistrar herramientas,
    // tendríamos que extenderlo. Por ahora, emitimos un evento de error.
    this.eventBus.debug(`[ToolRegistryAdapter] Cannot remove tool: ${name} (not supported by current implementation)`);
    return false;
  }
  
  /**
   * Ejecuta una herramienta con los parámetros proporcionados
   * @param toolName Nombre de la herramienta a ejecutar
   * @param parameters Parámetros para la ejecución
   * @returns Resultado de la ejecución
   */
  public async executeTool(name: string, params: Record<string, any>): Promise<ToolResult> {
    try {
      this.eventBus.debug(`[ToolRegistryAdapter] Executing tool: ${name}`);
      this.eventBus.emit(EventType.TOOL_EXECUTION_STARTED, { tool: name, parameters: params });
      
      const startTime = Date.now();
      const result = await this.toolRegistry.executeTool(name, params);
      const duration = Date.now() - startTime;
      
      // El resultado ya está en el formato esperado por la interfaz
      // No necesitamos adaptarlo
      
      if (result.success) {
        this.eventBus.debug(`[ToolRegistryAdapter] Tool executed successfully: ${name} (${duration}ms)`);
        this.eventBus.emit(EventType.TOOL_EXECUTION_COMPLETED, { tool: name, success: true, duration });
      } else {
        this.eventBus.debug(`[ToolRegistryAdapter] Tool execution failed: ${name} - ${result.error}`);
        this.eventBus.emit(EventType.TOOL_EXECUTION_ERROR, { tool: name, error: result.error });
      }
      
      return result;
    } catch (error: any) {
      const errorMessage = error.message || `Unknown error executing tool: ${name}`;
      this.eventBus.debug(`[ToolRegistryAdapter] Error executing tool: ${name} - ${errorMessage}`);
      this.eventBus.emit(EventType.TOOL_EXECUTION_ERROR, { tool: name, error: errorMessage });
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }
  
  /**
   * Obtiene la lista de todas las herramientas disponibles
   * @returns Array con las definiciones de todas las herramientas
   */
  public getAllTools(): Tool[] {
    // Las herramientas ya están en el formato esperado por la interfaz
    return this.toolRegistry.getAllTools();
  }
  
  /**
   * Obtiene una herramienta por su nombre
   * @param toolName Nombre de la herramienta
   * @returns Definición de la herramienta o undefined si no existe
   */
  public getTool(name: string): Tool | undefined {
    // La herramienta ya está en el formato esperado por la interfaz
    return this.toolRegistry.getTool(name);
  }
  
  /**
   * Verifica si una herramienta existe en el registro
   * @param toolName Nombre de la herramienta
   * @returns true si la herramienta existe, false en caso contrario
   */
  public hasTool(name: string): boolean {
    return this.toolRegistry.hasTool(name);
  }
  
  // Ya no necesitamos este método de conversión
}
