/**
 * Tipos para el sistema de herramientas de Windsurf
 * Contiene las definiciones de tipos para herramientas, parámetros y resultados
 */

/**
 * Definición de un parámetro para una herramienta
 */
export interface ParameterDefinition {
  /** Tipo del parámetro */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'file' | 'any';
  
  /** Descripción del parámetro */
  description: string;
  
  /** Si el parámetro es requerido */
  required?: boolean;
  
  /** Valor por defecto */
  default?: any;
  
  /** Valores permitidos para el parámetro */
  enum?: Array<{ 
    value: any; 
    description: string 
  }>;
  
  /** Validación numérica: valor mínimo */
  minimum?: number;
  
  /** Validación numérica: valor máximo */
  maximum?: number;
  
  /** Validación numérica: si el valor mínimo es exclusivo */
  exclusiveMinimum?: boolean;
  
  /** Validación numérica: si el valor máximo es exclusivo */
  exclusiveMaximum?: boolean;
  
  /** Validación numérica: múltiplo de */
  multipleOf?: number;
  
  /** Validación de texto: longitud mínima */
  minLength?: number;
  
  /** Validación de texto: longitud máxima */
  maxLength?: number;
  
  /** Validación de texto: patrón regex */
  pattern?: string;
  
  /** Formato del valor (ej: date, email, uri, etc) */
  format?: string;
  
  /** Para tipos array: definición de los items */
  items?: ParameterDefinition | ParameterDefinition[];
  
  /** Para tipos array: número mínimo de items */
  minItems?: number;
  
  /** Para tipos array: número máximo de items */
  maxItems?: number;
  
  /** Para tipos array: si los items deben ser únicos */
  uniqueItems?: boolean;
  
  /** Para tipos objeto: definición de las propiedades */
  properties?: Record<string, ParameterDefinition>;
  
  /** Para tipos objeto: propiedades adicionales permitidas */
  additionalProperties?: boolean | ParameterDefinition;
  
  /** Para tipos objeto: propiedades requeridas */
  requiredProperties?: string[];
  
  /** Metadatos adicionales */
  metadata?: {
    [key: string]: any;
  };
}

/**
 * Resultado genérico de una herramienta
 */
export interface ToolResult<T = any> {
  /** Indica si la ejecución fue exitosa */
  success: boolean;
  
  /** Datos de resultado (si la ejecución fue exitosa) */
  data?: T;
  
  /** Mensaje de error (si la ejecución falló) */
  error?: string;
  
  /** Tiempo de ejecución en milisegundos */
  executionTime?: number;
  
  /** Advertencias generadas durante la ejecución */
  warnings?: string[];
  
  /** Métricas de rendimiento */
  metrics?: Record<string, any>;
  
  /** Metadatos adicionales */
  metadata?: {
    [key: string]: any;
  };
}

/**
 * Definición de una herramienta con esquema detallado
 */
export interface Tool<P = any, R = any> {
  /** Nombre único de la herramienta */
  name: string;
  
  /** Descripción de la herramienta */
  description: string;
  
  /** Esquema de la herramienta */
  schema: {
    /** Definición de parámetros */
    parameters: Record<string, ParameterDefinition>;
    
    /** Definición del valor de retorno */
    returns: Record<string, any>;
  };
  
  /** 
   * Función que ejecuta la herramienta
   * @param params Parámetros de entrada
   * @param context Contexto opcional (ej: contexto de VSCode)
   * @returns Promesa que resuelve al resultado de la herramienta
   */
  execute: (params: P, context?: any) => Promise<ToolResult<R>>;
  
  /**
   * Función opcional para validar los parámetros
   * @param params Parámetros a validar
   * @returns Objeto con el resultado de la validación
   */
  validate?: (params: P) => { 
    isValid: boolean; 
    errors?: string[] 
  };
  
  /** Ejemplos de uso de la herramienta */
  examples?: Array<{
    /** Entrada de ejemplo */
    input: any;
    
    /** Salida de ejemplo */
    output: any;
    
    /** Descripción del ejemplo */
    description: string;
  }>;
}

/**
 * Tipo para los parámetros de las herramientas de sistema de archivos
 */
export interface FileSystemParams {
  /** Ruta del archivo */
  filePath: string;
  
  /** Si la ruta es relativa al workspace o absoluta */
  relativeTo?: 'workspace' | 'absolute';
  
  /** Contenido del archivo (para escritura) */
  content?: string;
  
  /** Si se debe crear el archivo si no existe */
  createIfNotExists?: boolean;
}

/**
 * Tipo para los parámetros de las herramientas de editor
 */
export interface EditorParams {
  /** URI del documento */
  documentUri?: string;
  
  /** Ediciones a realizar en el documento */
  edits?: Array<{
    /** Rango de texto a editar */
    range: { 
      start: { line: number, character: number }, 
      end: { line: number, character: number } 
    };
    
    /** Nuevo texto */
    text: string;
  }>;
}
