import { exec } from 'child_process';
import { promisify } from 'util';
import { IToolRunner, ExecutionEnvironment, ToolRunnerOptions } from '../../core/ToolRunner';

const execPromise = promisify(exec);

/**
 * Implementación del ToolRunner para entorno CLI
 * Utiliza child_process.exec para ejecutar comandos
 */
export class CLIToolRunner implements IToolRunner {
  /**
   * Ejecuta una herramienta usando el CLI
   * @param toolName Nombre de la herramienta a ejecutar
   * @param args Argumentos para la herramienta
   * @param options Opciones adicionales para la ejecución
   * @returns Resultado de la ejecución
   */
  async runTool<T = any>(
    toolName: string, 
    args: Record<string, any>, 
    options?: ToolRunnerOptions
  ): Promise<T> {
    // Construir el comando base
    let command = toolName;
    
    // Añadir argumentos al comando
    const stringArgs = this.serializeArgs(args);
    if (stringArgs) {
      command += ` ${stringArgs}`;
    }
    
    try {
      // Configurar opciones de ejecución
      const execOptions: any = {
        timeout: options?.timeout || 30000, // Default: 30 segundos
        encoding: options?.encoding || 'utf8'
      };
      
      // Ejecutar el comando
      const { stdout, stderr } = await execPromise(command, execOptions);
      
      if (stderr && !options?.silent) {
        console.warn(`Advertencia al ejecutar ${toolName}:`, stderr);
      }
      
      // Intentar parsear la salida como JSON
      try {
        // Convertir explícitamente stdout a string antes de parsearlo
        return JSON.parse(stdout.toString()) as T;
      } catch (e) {
        // Si no es JSON válido, devolver el string directamente
        return stdout as unknown as T;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Error al ejecutar la herramienta '${toolName}': ${errorMessage}`);
    }
  }
  
  /**
   * Obtiene el entorno de ejecución que maneja este runner
   */
  getEnvironment(): ExecutionEnvironment {
    return ExecutionEnvironment.CLI;
  }
  
  /**
   * Serializa argumentos para pasarlos en la línea de comandos
   * @param args Argumentos para serializar
   * @returns Cadena de argumentos lista para usar en línea de comandos
   */
  private serializeArgs(args: Record<string, any>): string {
    const argParts: string[] = [];
    
    for (const [key, value] of Object.entries(args)) {
      // Manejar diferentes tipos de valores
      if (value === null || value === undefined) {
        continue; // Omitir argumentos nulos o indefinidos
      } else if (typeof value === 'boolean') {
        if (value) {
          // Para booleanos verdaderos, solo añadir la bandera (--flag)
          argParts.push(`--${key}`);
        }
        // Para booleanos falsos, no añadir nada
      } else if (typeof value === 'object') {
        // Para objetos, convertir a JSON y escapar
        argParts.push(`--${key}='${JSON.stringify(value).replace(/'/g, "\\'")}'`);
      } else {
        // Para strings, números, etc.
        argParts.push(`--${key}='${String(value).replace(/'/g, "\\'")}'`);
      }
    }
    
    return argParts.join(' ');
  }
}

// Exportar una instancia singleton
export const cliToolRunner = new CLIToolRunner();