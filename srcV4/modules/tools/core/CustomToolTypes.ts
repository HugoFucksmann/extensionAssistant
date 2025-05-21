// Para src/modules/tools/core/CustomToolTypes.ts
// Este archivo contendrá una implementación básica para reemplazar las importaciones de LangChain

/**
 * Definición básica de una herramienta compatible con LangChain
 */
export class LangChainTool {
    name: string;
    description: string;
    schema?: any;
    private executor: (input: any) => Promise<string>;
  
    constructor(config: {
      name: string;
      description: string;
      schema?: any;
      func: (input: any) => Promise<string>;
    }) {
      this.name = config.name;
      this.description = config.description;
      this.schema = config.schema;
      this.executor = config.func;
    }
  
    async invoke(input: any): Promise<string> {
      return this.executor(input);
    }
  }
  
  /**
   * Tipo de eventos del sistema
   */
  export enum EventType {
    TOOL_REGISTERED = 'tool.registered',
    TOOL_REMOVED = 'tool.removed',
    TOOL_EXECUTION_STARTED = 'tool.execution.started',
    TOOL_EXECUTION_COMPLETED = 'tool.execution.completed',
    TOOL_EXECUTION_ERROR = 'tool.execution.error',
    ERROR_OCCURRED = 'error.occurred'
  }
  
  /**
   * Interfaz para el bus de eventos
   */
  export interface IEventBus {
    emit(eventType: EventType, payload: any): void;
    on(eventType: EventType, handler: (payload: any) => void): void;
    off(eventType: EventType, handler: (payload: any) => void): void;
  }