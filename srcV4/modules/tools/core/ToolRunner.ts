// src/modules/tools/core/ToolRunner.ts
import { LangChainTool } from './CustomToolTypes';

/**
 * Tipos de entorno de ejecución soportados
 */
export enum ExecutionEnvironment {
  CLI = 'cli',
  VSCODE = 'vscode',
}

/**
 * Opciones para la ejecución de herramientas
 */
export interface ToolRunnerOptions {
  /** Entorno de ejecución preferido */
  environment?: ExecutionEnvironment;
  /** Timeout en milisegundos */
  timeout?: number;
  /** Si se debe mostrar la salida en la terminal */
  silent?: boolean;
  /** Codificación de salida */
  encoding?: BufferEncoding;
}

/**
 * Interfaz para los runners de herramientas
 */
export interface IToolRunner {
  /**
   * Ejecuta una herramienta en el entorno específico
   * @param toolName Nombre de la herramienta a ejecutar
   * @param args Argumentos para la herramienta
   * @param options Opciones adicionales para la ejecución
   * @returns Resultado de la ejecución
   */
  runTool<T = any>(toolName: string, args: Record<string, any>, options?: ToolRunnerOptions): Promise<T>;
  
  /**
   * Obtiene el entorno de ejecución que maneja este runner
   */
  getEnvironment(): ExecutionEnvironment;
}

/**
 * Registro de runners disponibles por entorno
 */
export class ToolRunnerRegistry {
  private static runners: Map<ExecutionEnvironment, IToolRunner> = new Map();
  
  /**
   * Registra un runner para un entorno específico
   */
  static registerRunner(runner: IToolRunner): void {
    const environment = runner.getEnvironment();
    this.runners.set(environment, runner);
  }
  
  /**
   * Obtiene un runner para un entorno específico
   */
  static getRunner(environment: ExecutionEnvironment): IToolRunner | undefined {
    return this.runners.get(environment);
  }
  
  /**
   * Verifica si existe un runner para un entorno específico
   */
  static hasRunner(environment: ExecutionEnvironment): boolean {
    return this.runners.has(environment);
  }
}

/**
 * Clase principal que maneja la ejecución de herramientas en diferentes entornos
 */
export class ToolRunner {
  private static instance: ToolRunner;
  private defaultEnvironment: ExecutionEnvironment = ExecutionEnvironment.CLI;
  
  private constructor() { }
  
  /**
   * Obtiene la instancia singleton del ToolRunner
   */
  static getInstance(): ToolRunner {
    if (!this.instance) {
      this.instance = new ToolRunner();
    }
    return this.instance;
  }
  
  /**
   * Establece el entorno de ejecución por defecto
   */
  setDefaultEnvironment(environment: ExecutionEnvironment): void {
    this.defaultEnvironment = environment;
  }
  
  /**
   * Obtiene el entorno de ejecución por defecto
   */
  getDefaultEnvironment(): ExecutionEnvironment {
    return this.defaultEnvironment;
  }
  
  /**
   * Ejecuta una herramienta con los argumentos proporcionados
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
    const environment = options?.environment || this.defaultEnvironment;
    const runner = ToolRunnerRegistry.getRunner(environment);
    
    if (!runner) {
      throw new Error(`No hay un runner registrado para el entorno ${environment}`);
    }
    
    return runner.runTool<T>(toolName, args, options);
  }
  
  /**
   * Crea una función de ejecución para una herramienta específica
   * Esta función es útil para crear Tools de LangChain
   */
  createToolExecutor<T = any, R = any>(
    toolName: string, 
    defaultOptions?: ToolRunnerOptions
  ): (args: T) => Promise<R> {
    return async (args: T) => {
      return this.runTool<R>(toolName, args as Record<string, any>, defaultOptions);
    };
  }
}

/**
 * Función auxiliar para convertir una herramienta en un Tool de LangChain
 */
export function convertToLangChainTool<T = any, R = any>(
  name: string,
  description: string,
  executor: (args: T) => Promise<R>,
  schema?: object
): LangChainTool {
  return new LangChainTool({
    name,
    description,
    schema,
    func: async (input: T) => {
      try {
        const result = await executor(input);
        return JSON.stringify(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return `Error: ${errorMessage}`;
      }
    },
  });
}