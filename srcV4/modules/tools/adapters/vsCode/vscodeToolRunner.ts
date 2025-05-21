import * as vscode from 'vscode';
import { IToolRunner, ExecutionEnvironment, ToolRunnerOptions } from '../../core/ToolRunner';

/**
 * Implementación del ToolRunner para entorno VSCode
 * Utiliza vscode.window.createTerminal para ejecutar comandos
 */
export class VSCodeToolRunner implements IToolRunner {
  private terminal: vscode.Terminal | null = null;
  private resultsMap: Map<string, any> = new Map();
  private waitingPromises: Map<string, { resolve: Function, reject: Function }> = new Map();
  
  constructor() {
    // Inicializar terminal cuando sea necesario
    this.setupResultListener();
  }
  
  /**
   * Configura el listener para resultados de ejecución
   * Este método captura los resultados enviados desde la terminal
   */
  private setupResultListener(): void {
    // En un entorno real de VSCode, se usaría un canal de comunicación
    // entre la extensión y los procesos de terminal
    // Este es un ejemplo simplificado
    
    // Simular un evento que captura la salida de la terminal
    // En una implementación real, esto sería un event listener de VSCode
    const mockTerminalOutputHandler = (output: string) => {
      try {
        // Buscar un formato especial que indique que es un resultado de una herramienta
        const match = output.match(/\[TOOL_RESULT:([a-zA-Z0-9-]+)\](.*)\[\/TOOL_RESULT\]/s);
        if (match) {
          const requestId = match[1];
          const resultJson = match[2].trim();
          
          const result = JSON.parse(resultJson);
          this.resultsMap.set(requestId, result);
          
          // Resolver la promesa pendiente
          const waiting = this.waitingPromises.get(requestId);
          if (waiting) {
            waiting.resolve(result);
            this.waitingPromises.delete(requestId);
          }
        }
      } catch (error) {
        console.error("Error al procesar la salida de la terminal:", error);
      }
    };
    
    // En una implementación real, aquí se registraría el listener
    // vscode.window.onDidWriteTerminalData(event => {
    //   mockTerminalOutputHandler(event.data);
    // });
  }
  
  /**
   * Obtiene o crea una terminal de VSCode
   */
  private getTerminal(): vscode.Terminal {
    if (!this.terminal) {
      this.terminal = vscode.window.createTerminal('Tool Runner');
    }
    return this.terminal;
  }
  
  /**
   * Ejecuta una herramienta usando la terminal de VSCode
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
    const terminal = this.getTerminal();
    terminal.show(!options?.silent);
    
    const requestId = this.generateRequestId();
    
    // Construir el comando base
    let command = toolName;
    
    // Añadir argumentos al comando
    const stringArgs = this.serializeArgs(args);
    if (stringArgs) {
      command += ` ${stringArgs}`;
    }
    
    // Añadir wrapper para capturar el resultado
    command += ` | tee >(echo "[TOOL_RESULT:${requestId}]$(cat)[/TOOL_RESULT]")`;
    
    // Crear una promesa que se resolverá cuando llegue el resultado
    const resultPromise = new Promise<T>((resolve, reject) => {
      this.waitingPromises.set(requestId, { resolve, reject });
      
      // Configurar timeout
      const timeoutMs = options?.timeout || 30000;
      const timeoutId = setTimeout(() => {
        if (this.waitingPromises.has(requestId)) {
          this.waitingPromises.delete(requestId);
          reject(new Error(`Timeout al ejecutar la herramienta '${toolName}' después de ${timeoutMs}ms`));
        }
      }, timeoutMs);
    });
    
    // Ejecutar el comando en la terminal
    terminal.sendText(command);
    
    try {
      return await resultPromise;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Error al ejecutar la herramienta '${toolName}' en VSCode: ${errorMessage}`);
    }
  }
  
  /**
   * Obtiene el entorno de ejecución que maneja este runner
   */
  getEnvironment(): ExecutionEnvironment {
    return ExecutionEnvironment.VSCODE;
  }
  
  /**
   * Genera un ID único para una solicitud
   */
  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
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
export const vscodeToolRunner = new VSCodeToolRunner();