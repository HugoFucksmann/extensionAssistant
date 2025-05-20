/**
 * Adaptador para el ToolRegistry que implementa la interfaz IToolRegistry
 * Permite utilizar el ToolRegistry existente a través de la interfaz definida
 */

import { IToolRegistry, ToolDefinition, ToolExecutionResult, ToolParameters } from '../core/interfaces/tool-registry.interface';
import { ToolRegistry } from './toolRegistry';
import { IEventBus } from '../core/interfaces/event-bus.interface';
import { Tool, ToolResult } from '../core/types';

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
  public registerTool(definition: ToolDefinition): boolean {
    if (this.toolRegistry.hasTool(definition.name)) {
      this.eventBus.debug(`[ToolRegistryAdapter] Tool already exists: ${definition.name}`);
      return false;
    }
    
    // Convertir la definición al formato esperado por el ToolRegistry
    this.toolRegistry.registerTool(
      definition.name,
      definition.execute,
      definition.description,
      {
        parameters: definition.parameters,
        returns: definition.returns
      }
    );
    
    this.eventBus.debug(`[ToolRegistryAdapter] Registered tool: ${definition.name}`);
    this.eventBus.emit('tool:registered', { toolName: definition.name });
    
    return true;
  }
  
  /**
   * Desregistra una herramienta del registro
   * @param toolName Nombre de la herramienta a desregistrar
   * @returns true si se desregistró correctamente, false si no existía
   */
  public unregisterTool(toolName: string): boolean {
    if (!this.toolRegistry.hasTool(toolName)) {
      return false;
    }
    
    // Como el ToolRegistry actual no tiene un método para desregistrar herramientas,
    // tendríamos que extenderlo. Por ahora, emitimos un evento de error.
    this.eventBus.debug(`[ToolRegistryAdapter] Cannot unregister tool: ${toolName} (not supported by current implementation)`);
    return false;
  }
  
  /**
   * Ejecuta una herramienta con los parámetros proporcionados
   * @param toolName Nombre de la herramienta a ejecutar
   * @param parameters Parámetros para la ejecución
   * @returns Resultado de la ejecución
   */
  public async executeTool(toolName: string, parameters: ToolParameters): Promise<ToolExecutionResult> {
    try {
      this.eventBus.debug(`[ToolRegistryAdapter] Executing tool: ${toolName}`);
      this.eventBus.emit('tool:executing', { toolName, parameters });
      
      const startTime = Date.now();
      const result = await this.toolRegistry.executeTool(toolName, parameters);
      const duration = Date.now() - startTime;
      
      // Convertir el resultado al formato esperado por la interfaz
      const adaptedResult: ToolExecutionResult = {
        success: result.success,
        data: result.success ? result : undefined,
        error: result.success ? undefined : result.error,
        metadata: {
          toolName,
          executionTime: duration,
          timestamp: Date.now()
        }
      };
      
      if (result.success) {
        this.eventBus.debug(`[ToolRegistryAdapter] Tool executed successfully: ${toolName} (${duration}ms)`);
        this.eventBus.emit('tool:executed', { toolName, success: true, duration });
      } else {
        this.eventBus.debug(`[ToolRegistryAdapter] Tool execution failed: ${toolName} - ${result.error}`);
        this.eventBus.emit('tool:executed', { toolName, success: false, error: result.error });
      }
      
      return adaptedResult;
    } catch (error: any) {
      const errorMessage = error.message || `Unknown error executing tool: ${toolName}`;
      this.eventBus.debug(`[ToolRegistryAdapter] Error executing tool: ${toolName} - ${errorMessage}`);
      this.eventBus.emit('tool:executed', { toolName, success: false, error: errorMessage });
      
      return {
        success: false,
        error: errorMessage,
        metadata: {
          toolName,
          executionTime: 0,
          timestamp: Date.now()
        }
      };
    }
  }
  
  /**
   * Obtiene la lista de todas las herramientas disponibles
   * @returns Array con las definiciones de todas las herramientas
   */
  public getAvailableTools(): ToolDefinition[] {
    const tools = this.toolRegistry.getAllTools();
    
    // Convertir las herramientas al formato esperado por la interfaz
    return tools.map(tool => this.convertToolToToolDefinition(tool));
  }
  
  /**
   * Obtiene una herramienta por su nombre
   * @param toolName Nombre de la herramienta
   * @returns Definición de la herramienta o undefined si no existe
   */
  public getToolByName(toolName: string): ToolDefinition | undefined {
    const tool = this.toolRegistry.getTool(toolName);
    
    if (!tool) {
      return undefined;
    }
    
    return this.convertToolToToolDefinition(tool);
  }
  
  /**
   * Verifica si una herramienta existe en el registro
   * @param toolName Nombre de la herramienta
   * @returns true si la herramienta existe, false en caso contrario
   */
  public hasToolByName(toolName: string): boolean {
    return this.toolRegistry.hasTool(toolName);
  }
  
  /**
   * Convierte una herramienta del formato antiguo al nuevo formato
   * @param tool Herramienta en formato antiguo
   * @returns Definición de la herramienta en el nuevo formato
   */
  private convertToolToToolDefinition(tool: Tool): ToolDefinition {
    return {
      name: tool.name,
      description: tool.description,
      execute: tool.execute,
      parameters: tool.schema.parameters,
      returns: tool.schema.returns
    };
  }
}
