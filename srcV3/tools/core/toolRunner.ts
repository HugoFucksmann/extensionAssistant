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
      throw new Error(`Tool no registrada: ${toolName}`);
    }

    // Validación de parámetros (usando validateParams o requiredParams del tool)
    if (tool.validateParams) {
      const validationResult = tool.validateParams(params);
      if (typeof validationResult === 'string') {
        throw new Error(`Error de validación en ${toolName}: ${validationResult}`);
      }
    } else if (tool.requiredParams) {
      for (const param of tool.requiredParams) {
        // Check if the parameter is missing OR explicitly null/undefined
        if (params[param] === undefined || params[param] === null) {
          throw new Error(`Parámetro requerido faltante en ${toolName}: ${param}`);
        }
      }
    }

    try {
      // Pass the resolved parameters directly to the tool's execute function
      return await tool.execute(params);
    } catch (error: any) {
      // Log the error and re-throw
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
              // Decide if a single tool failure should stop the parallel run
              // For now, let's catch and continue, but record the error.
              console.error(`[ToolRunner] Error in parallel execution for tool '${name}':`, error);
          }
      }

      // If any errors occurred, throw a combined error or return results + errors
      if (Object.keys(errors).length > 0) {
           // You might want a more sophisticated error handling here,
           // e.g., throwing a specific aggregate error.
           console.error("[ToolRunner] Parallel execution finished with errors:", errors);
           // Depending on desired behavior, you might throw here:
           // throw new Error(`Parallel tool execution failed for tools: ${Object.keys(errors).join(', ')}`);
      }

      return results; // Return results (successful and undefined for failed)
  }


  /**
   * Lista todas las tools disponibles (nombres completos)
   */
  public static listTools(): string[] {
    return Object.keys(this.TOOLS);
  }
}