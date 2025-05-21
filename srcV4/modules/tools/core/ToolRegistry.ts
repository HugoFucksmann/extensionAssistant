// src/modules/tools/core/ToolRegistry.ts
import { LangChainTool, EventType, IEventBus } from './CustomToolTypes';
import { randomUUID } from "crypto";

/**
 * Registro centralizado de herramientas en formato LangChain
 */
export class ToolRegistry {
  private static instance: ToolRegistry;
  private tools: Map<string, LangChainTool> = new Map();
  private eventBus?: IEventBus;
  
  private constructor() {}
  
  /**
   * Obtiene la instancia singleton del registro de herramientas
   */
  static getInstance(): ToolRegistry {
    if (!this.instance) {
      this.instance = new ToolRegistry();
    }
    return this.instance;
  }
  
  /**
   * Establece el bus de eventos para notificaciones
   */
  setEventBus(eventBus: IEventBus): void {
    this.eventBus = eventBus;
  }
  
  /**
   * Registra una herramienta en el registro
   */
  registerTool(tool: LangChainTool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Ya existe una herramienta con el nombre '${tool.name}'`);
    }
    
    this.tools.set(tool.name, tool);
    
    // Notificar el registro de una nueva herramienta
    this.eventBus?.emit(EventType.TOOL_REGISTERED, {
      toolName: tool.name,
      timestamp: Date.now()
    });
  }
  
  /**
   * Registra múltiples herramientas de una vez
   */
  registerTools(tools: LangChainTool[]): void {
    for (const tool of tools) {
      try {
        this.registerTool(tool);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        console.error(`Error al registrar la herramienta ${tool.name}:`, errorMessage);
      }
    }
  }
  
  /**
   * Obtiene una herramienta por su nombre
   */
  getTool(name: string): LangChainTool | undefined {
    return this.tools.get(name);
  }
  
  /**
   * Obtiene todas las herramientas registradas
   */
  getAllTools(): LangChainTool[] {
    return Array.from(this.tools.values());
  }
  
  /**
   * Obtiene los nombres de todas las herramientas registradas
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }
  
  /**
   * Verifica si una herramienta existe en el registro
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }
  
  /**
   * Elimina una herramienta del registro
   */
  removeTool(name: string): boolean {
    const result = this.tools.delete(name);
    
    if (result) {
      // Notificar que se eliminó una herramienta
      this.eventBus?.emit(EventType.TOOL_REMOVED, {
        toolName: name,
        timestamp: Date.now()
      });
    }
    
    return result;
  }
  
  /**
   * Ejecuta una herramienta con los parámetros proporcionados
   */
  async executeTool<T = any>(name: string, params: any): Promise<T> {
    const tool = this.getTool(name);
    if (!tool) {
      throw new Error(`No se encontró la herramienta '${name}'`);
    }
    
    const startTime = Date.now();
    const executionId = randomUUID();
    
    // Emitir evento de inicio de ejecución
    this.eventBus?.emit(EventType.TOOL_EXECUTION_STARTED, {
      toolName: name,
      parameters: params,
      timestamp: startTime,
      executionId,
      tool: name
    });
    
    try {
      // Ejecutar la herramienta y obtener el resultado como string
      const resultStr = await tool.invoke(params);
      const endTime = Date.now();
      
      // Intentar parsear el resultado como JSON
      let result: T;
      try {
        result = JSON.parse(resultStr);
      } catch (e) {
        // Si no es JSON válido, devolver el string directamente
        result = resultStr as unknown as T;
      }
      
      // Emitir evento de finalización exitosa
      this.eventBus?.emit(EventType.TOOL_EXECUTION_COMPLETED, {
        toolName: name,
        parameters: params,
        result,
        duration: endTime - startTime,
        timestamp: endTime,
        executionId,
        tool: name
      });
      
      return result;
    } catch (error) {
      const errorTime = Date.now();
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Emitir evento de error
      this.eventBus?.emit(EventType.TOOL_EXECUTION_ERROR, {
        error: errorMessage,
        source: `ToolExecution:${name}`,
        details: {
          tool: name,
          params,
          executionId
        },
        timestamp: errorTime,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      throw error;
    }
  }
}