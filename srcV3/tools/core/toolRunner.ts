import * as vscode from 'vscode';
// Import all tools from the new structured index
import * as tools from '..';

// Interfaz para definir la estructura de una herramienta (mantener)
interface Tool {
  execute: (...args: any[]) => Promise<any>;
  validateParams?: (params: Record<string, any>) => boolean | string;
  requiredParams?: string[];
}

type ToolRegistry = Record<string, Tool>;

export class ToolRunner {

  // Update the TOOLS registry to use the imported tools with module prefixes
  private static readonly TOOLS: ToolRegistry = {
    // Filesystem Tools
    'filesystem.getWorkspaceFiles': {
      execute: tools.getWorkspaceFiles,
      validateParams: () => true // No requiere parámetros
    },
    'filesystem.getFileContents': {
      execute: tools.getFileContents,
      validateParams: (params) => {
        if (!params.filePath || typeof params.filePath !== 'string') {
          return 'Se requiere filePath como string';
        }
        return true;
      },
      requiredParams: ['filePath']
    },

    // Editor Tools
    'editor.getActiveEditorContent': {
      execute: tools.getActiveEditorContent,
      validateParams: () => true,
      requiredParams: []
    },

    // Project Tools
    'project.getPackageDependencies': {
      execute: tools.getPackageDependencies,
      validateParams: (params) => {
        if (!params.projectPath || typeof params.projectPath !== 'string') {
          return 'Se requiere projectPath como string';
        }
        return true;
      },
      requiredParams: ['projectPath']
    },
    'project.getProjectInfo': {
      execute: tools.getProjectInfo,
      validateParams: () => true,
      requiredParams: []
    },
    'project.searchWorkspace': {
      execute: tools.searchWorkspace,
      validateParams: (params) => {
        if (!params.query || typeof params.query !== 'string') {
          return 'Se requiere query como string';
        }
        return true;
      },
      requiredParams: ['query']
    },

    // Code Manipulation Tools
    'codeManipulation.applyWorkspaceEdit': {
      execute: tools.applyWorkspaceEdit,
      validateParams: (params) => {
        if (!params.edits || !Array.isArray(params.edits)) {
          return 'Se requiere edits como array';
        }
        return true;
      },
      requiredParams: ['edits']
    }
  };

  /**
   * Ejecuta una tool específica después de validar sus parámetros
   * @param toolName El nombre completo de la tool (ej: 'filesystem.getFileContents')
   */
  public static async runTool(
    toolName: string,
    params: Record<string, any> = {}
  ): Promise<any> {
    const tool = this.TOOLS[toolName];
    if (!tool) {
      const error = new Error(`Tool no registrada: ${toolName}`);
      console.error('[ToolRunner]', error.message);
      // Show error message in VS Code UI
      vscode.window.showErrorMessage(`Error ejecutando tool: Tool '${toolName}' no registrada.`);
      throw error;
    }

    // Validación de parámetros (usando validateParams o requiredParams del tool)
    if (tool.validateParams) {
      const validationResult = tool.validateParams(params);
      if (typeof validationResult === 'string') {
        const error = new Error(`Error de validación en ${toolName}: ${validationResult}`);
        console.error('[ToolRunner]', error.message);
        vscode.window.showErrorMessage(`Error ejecutando tool ${toolName}: ${validationResult}`);
        throw error;
      }
    } else if (tool.requiredParams) {
      for (const param of tool.requiredParams) {
        if (params[param] === undefined || params[param] === null) {
          const error = new Error(`Parámetro requerido faltante en ${toolName}: ${param}`);
          console.error('[ToolRunner]', error.message);
          vscode.window.showErrorMessage(`Error ejecutando tool ${toolName}: Parámetro '${param}' faltante.`);
          throw error;
        }
      }
    }

    try {
      console.log(`[ToolRunner] Executing tool: ${toolName} with params:`, params);
      const result = await tool.execute(params);
      console.log(`[ToolRunner] Tool execution successful: ${toolName}`);
      return result;
    } catch (error: any) {
      console.error(`[ToolRunner] Error executing tool ${toolName}:`, error);
      // Show error message in VS Code UI for user feedback
      vscode.window.showErrorMessage(`Error ejecutando tool ${toolName}: ${error.message || String(error)}`);
      throw error; // Re-throw the error for the orchestrator/handler to catch
    }
  }

  /**
   * Ejecuta múltiples tools en paralelo con control de concurrencia
   * (Mantener esta función, aunque el planificador podría orquestar paso a paso)
   * @param tools Array de herramientas a ejecutar (con nombre completo)
   * @param concurrencyLimit Número máximo de herramientas a ejecutar simultáneamente (0 = sin límite)
   */
  public static async runParallel(
    toolsToRun: Array<{ name: string; params?: Record<string, any> }>,
    concurrencyLimit: number = 0 // concurrencyLimit is ignored in this simplified implementation
  ): Promise<Record<string, any>> {
      console.warn("[ToolRunner] runParallel called. Note: Concurrency limit is not fully implemented in this version. Running sequentially.");
      const results: Record<string, any> = {};
      const errors: Record<string, any> = {};

      // Simple sequential execution for now
      for (const { name, params } of toolsToRun) {
          try {
              results[name] = await this.runTool(name, params);
          } catch (error) {
              errors[name] = error;
              console.error(`[ToolRunner] Error in parallel execution for tool '${name}':`, error);
          }
      }

      if (Object.keys(errors).length > 0) {
           // You might want a more sophisticated error handling here
           console.error("[ToolRunner] Parallel execution finished with errors:", errors);
           // Depending on desired behavior, you might throw here:
           // throw new Error(`Parallel tool execution failed for tools: ${Object.keys(errors).join(', ')}`);
      }

      return results;
  }


  /**
   * Lista todas las tools disponibles (nombres completos)
   *
   * EXTENSIBILITY: To add a new tool, create its implementation file,
   * export the function, add it to the src/tools/index.ts barrel file,
   * and register it in the TOOLS map here with validation/required params.
   */
  public static listTools(): string[] {
    return Object.keys(this.TOOLS);
  }
}