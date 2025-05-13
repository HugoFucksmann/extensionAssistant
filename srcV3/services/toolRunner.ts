import * as vscode from 'vscode';
import { getWorkspaceFiles } from '../tools/filesystemTools/getWorkspaceFiles';
import { getFileContents } from '../tools/filesystemTools/getFileContents';






// Interfaz para definir la estructura de una herramienta
interface Tool {
  execute: (...args: any[]) => Promise<any>;
  validateParams?: (params: Record<string, any>) => boolean | string;
  requiredParams?: string[];
}

type ToolRegistry = Record<string, Tool>;

export class ToolRunner {
    
  private static readonly TOOLS: ToolRegistry = {
    'filesystem.getWorkspaceFiles': {
      execute: getWorkspaceFiles,
      validateParams: () => true // No requiere parámetros
    },
    'filesystem.getFileContents': {
      execute: async (params) => getFileContents(params.filePath),
      validateParams: (params) => {
        if (!params.filePath || typeof params.filePath !== 'string') {
          return 'Se requiere filePath como string';
        }
        return true;
      },
      requiredParams: ['filePath']
    }
    // Registrar más tools aquí según se vayan creando
  };

  /**
   * Ejecuta una tool específica después de validar sus parámetros
   */
  public static async runTool(
    toolName: string,
    params: Record<string, any> = {}
  ): Promise<any> {
    const tool = this.TOOLS[toolName];
    if (!tool) {
      throw new Error(`Tool no registrada: ${toolName}`);
    }

    // Validación de parámetros
    if (tool.validateParams) {
      const validationResult = tool.validateParams(params);
      if (typeof validationResult === 'string') {
        throw new Error(`Error de validación en ${toolName}: ${validationResult}`);
      }
    } else if (tool.requiredParams) {
      // Validación básica si solo tenemos requiredParams
      for (const param of tool.requiredParams) {
        if (params[param] === undefined) {
          throw new Error(`Parámetro requerido faltante en ${toolName}: ${param}`);
        }
      }
    }

    try {
      return await tool.execute(params);
    } catch (error) {
      vscode.window.showErrorMessage(`Error ejecutando tool ${toolName}: ${error}`);
      throw error;
    }
  }

  /**
   * Ejecuta múltiples tools en paralelo con control de concurrencia
   * @param tools Array de herramientas a ejecutar
   * @param concurrencyLimit Número máximo de herramientas a ejecutar simultáneamente (0 = sin límite)
   */
  public static async runParallel(
    tools: Array<{ name: string; params?: Record<string, any> }>,
    concurrencyLimit: number = 0
  ): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    
    if (concurrencyLimit <= 0 || concurrencyLimit >= tools.length) {
      // Sin límite de concurrencia o límite mayor que la cantidad de herramientas
      await Promise.all(
        tools.map(async ({ name, params }) => {
          results[name] = await this.runTool(name, params);
        })
      );
    } else {
      // Implementación con límite de concurrencia
      const queue = [...tools];
      const running: Promise<void>[] = [];
      
      while (queue.length > 0 || running.length > 0) {
        // Llenar hasta el límite de concurrencia
        while (queue.length > 0 && running.length < concurrencyLimit) {
          const { name, params } = queue.shift()!;
          const promise = this.runTool(name, params)
            .then(result => {
              results[name] = result;
              // Eliminar de la lista de running
              const index = running.indexOf(promise);
              if (index >= 0) running.splice(index, 1);
            })
            .catch(error => {
              // Manejar el error pero seguir con las demás promesas
              vscode.window.showErrorMessage(`Error en paralelo para ${name}: ${error}`);
              // Eliminar de la lista de running
              const index = running.indexOf(promise);
              if (index >= 0) running.splice(index, 1);
              throw error;
            });
          
          running.push(promise);
        }
        
        // Esperar a que al menos una promesa termine
        if (running.length > 0) {
          await Promise.race(running);
        }
      }
    }
    
    return results;
  }

  
/*  //  * Ejecuta un plan secuencial de tools con mejor manejo de contexto
  
  public static async executePlan(
    plan: Array<{
      tool: string;
      params?: Record<string, any>;
      storeAs?: string; // Alias para el resultado
      useContext?: boolean; // Indica si se debe pasar el contexto completo (false por defecto)
      contextMap?: Record<string, string>; // Mapeo de nombres de contexto a nombres de parámetros
    }>
  ): Promise<Record<string, any>> {
    const context: Record<string, any> = {};
    
    for (const step of plan) {
      let stepParams = { ...step.params || {} };
      
      // Gestión mejorada del contexto
      if (step.useContext) {
        // Pasar todo el contexto si se solicita explícitamente
        stepParams = { ...stepParams, context };
      }
      
      // Mapeo específico de valores del contexto a parámetros
      if (step.contextMap) {
        for (const [contextKey, paramName] of Object.entries(step.contextMap)) {
          if (context[contextKey] !== undefined) {
            stepParams[paramName] = context[contextKey];
          }
        }
      }
      
      const result = await this.runTool(step.tool, stepParams);
      
      if (step.storeAs) {
        context[step.storeAs] = result;
      }
    }
    
    return context;
  } */

  /**
   * Lista todas las tools disponibles
   */
  public static listTools(): string[] {
    return Object.keys(this.TOOLS);
  }
}