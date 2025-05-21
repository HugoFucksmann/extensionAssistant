/**
 * Tipos base para las herramientas de Windsurf
 */

export interface Tool<T = any, R = any> {
  /** Nombre único de la herramienta */
  name: string;
  
  /** Descripción de lo que hace la herramienta */
  description: string;
  
  /** Parámetros que acepta la herramienta */
  parameters?: Record<string, ParameterDefinition>;
  
  /** Función que implementa la lógica de la herramienta */
  execute: (params: T) => Promise<R> | R;
}

export interface ParameterDefinition {
  /** Tipo del parámetro */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';
  
  /** Descripción del parámetro */
  description: string;
  
  /** Si el parámetro es requerido */
  required?: boolean;
  
  /** Valores permitidos (opcional) */
  enum?: any[];
  
  /** Valor por defecto (opcional) */
  default?: any;
}

export interface ToolResult<T = any> {
  /** Indica si la operación fue exitosa */
  success: boolean;
  
  /** Resultado de la operación (si fue exitosa) */
  data?: T;
  
  /** Mensaje de error (si hubo un error) */
  error?: string;
  
  /** Código de error (opcional) */
  code?: string | number;
}

/**
 * Tipo para los parámetros de las herramientas de sistema de archivos
 */
export interface FileSystemParams {
  /** Ruta del archivo o directorio */
  path: string;
  
  /** Si la ruta es relativa al workspace o absoluta */
  relativeTo?: 'workspace' | 'absolute';
  
  /** Contenido para escritura (opcional) */
  content?: string | Buffer;
  
  /** Crear archivo si no existe (solo escritura) */
  createIfNotExists?: boolean;
  
  /** Codificación del archivo (por defecto: 'utf-8') */
  encoding?: BufferEncoding;
}

/**
 * Tipo para los parámetros de las herramientas de editor
 */
export interface EditorParams {
  /** URI del documento */
  documentUri?: string;
  
  /** Ediciones a aplicar */
  edits?: Array<{
    range: {
      start: { line: number; character: number };
      end: { line: number; character: number };
    };
    text: string;
  }>;
}
