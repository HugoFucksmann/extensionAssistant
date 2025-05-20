/**
 * Punto de entrada para las herramientas de la arquitectura Windsurf
 * Este archivo exporta todas las herramientas disponibles para los nodos de ReAct
 */

import * as vscode from 'vscode';
import { getFileContents } from './filesystem/getFileContents';
import { writeToFile } from './filesystem/writeToFile';
import { listFiles } from './filesystem/listFiles';
import { getActiveEditorContent } from './editor/getActiveEditorContent';
import { applyTextEdit } from './editor/applyTextEdit';
import { getProjectInfo } from './project/getProjectInfo';
import { searchWorkspace } from './project/searchWorkspace';
import { respond } from './core/respond';

/**
 * Tipo para el resultado de una herramienta
 */
export interface ToolResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Tipo para los parámetros de una herramienta
 */
export type ToolParameters = Record<string, {
  type: string;
  description: string;
  required: boolean;
  enum?: string[];
  default?: any;
}>;

/**
 * Mapea los tipos de parámetros a tipos TypeScript
 */
type MapParameterType<T extends string> =
  T extends 'string' ? string :
  T extends 'number' ? number :
  T extends 'boolean' ? boolean :
  T extends 'object' ? object :
  any;

/**
 * Convierte la definición de parámetros a un tipo de objeto TypeScript
 */
type ParametersToObject<T extends ToolParameters> = {
  [K in keyof T]: T[K]['required'] extends true 
    ? MapParameterType<T[K]['type']> 
    : MapParameterType<T[K]['type']> | undefined;
};

/**
 * Tipo para una herramienta de la arquitectura Windsurf
 */
export interface Tool<Params extends ToolParameters = ToolParameters, Result = any> {
  name: string;
  description: string;
  parameters: Params;
  execute: (params: ParametersToObject<Params>) => Promise<Result>;
}

// Definición de parámetros para cada herramienta
interface GetFileContentsParams {
  path: { type: 'string', description: string, required: true };
}

interface WriteToFileParams {
  path: { type: 'string', description: string, required: true };
  content: { type: 'string', description: string, required: true };
}

interface ListFilesParams {
  path: { type: 'string', description: string, required: true };
  pattern?: { type: 'string', description: string, required: false };
}

interface ApplyTextEditParams {
  edits: { type: 'array', description: string, required: true };
  documentUri?: { type: 'string', description: string, required: false };
}

interface SearchWorkspaceParams {
  query: { type: 'string', description: string, required: true };
  includePattern?: { type: 'string', description: string, required: false };
  excludePattern?: { type: 'string', description: string, required: false };
  maxResults?: { type: 'number', description: string, required: false };
  isCaseSensitive?: { type: 'boolean', description: string, required: false };
  isRegExp?: { type: 'boolean', description: string, required: false };
  isWholeWord?: { type: 'boolean', description: string, required: false };
}

/**
 * Registro de todas las herramientas disponibles
 */
export const tools: Record<string, Tool<any>> = {
  getFileContents: {
    name: 'getFileContents',
    description: 'Lee el contenido de un archivo',
    parameters: {
      filePath: {
        type: 'string',
        description: 'Ruta del archivo a leer',
        required: true
      },
      relativeTo: {
        type: 'string',
        description: 'Si la ruta es relativa al workspace o absoluta',
        required: false,
        enum: ['workspace', 'absolute'],
        default: 'workspace'
      }
    } as const,
    execute: getFileContents
  } as Tool<{
    filePath: { type: 'string', description: string, required: true };
    relativeTo: { type: 'string', description: string, required: false, enum: string[], default: string };
  }, ToolResult<{ content: string; path: string }>>,

  writeToFile: {
    name: 'writeToFile',
    description: 'Escribe contenido en un archivo',
    parameters: {
      filePath: {
        type: 'string',
        description: 'Ruta del archivo a escribir',
        required: true
      },
      content: {
        type: 'string',
        description: 'Contenido a escribir en el archivo',
        required: true
      },
      relativeTo: {
        type: 'string',
        description: 'Si la ruta es relativa al workspace o absoluta',
        required: false,
        enum: ['workspace', 'absolute'],
        default: 'workspace'
      },
      createIfNotExists: {
        type: 'boolean',
        description: 'Si se debe crear el archivo si no existe',
        required: false,
        default: true
      }
    } as const,
    execute: writeToFile
  } as Tool<{
    filePath: { type: 'string', description: string, required: true };
    content: { type: 'string', description: string, required: true };
    relativeTo: { type: 'string', description: string, required: false, enum: string[], default: string };
    createIfNotExists: { type: 'boolean', description: string, required: false, default: boolean };
  }, ToolResult<{ path: string }>>,

  listFiles: {
    name: 'listFiles',
    description: 'Lista archivos en un directorio',
    parameters: {
      dirPath: {
        type: 'string',
        description: 'Ruta del directorio a listar',
        required: true
      },
      relativeTo: {
        type: 'string',
        description: 'Si la ruta es relativa al workspace o absoluta',
        required: false,
        enum: ['workspace', 'absolute'],
        default: 'workspace'
      },
      includePattern: {
        type: 'string',
        description: 'Patrón glob para incluir archivos',
        required: false
      },
      excludePattern: {
        type: 'string',
        description: 'Patrón glob para excluir archivos',
        required: false
      },
      recursive: {
        type: 'boolean',
        description: 'Si se debe buscar recursivamente en subdirectorios',
        required: false,
        default: true
      }
    } as const,
    execute: listFiles
  } as Tool<{
    dirPath: { type: 'string', description: string, required: true };
    relativeTo: { type: 'string', description: string, required: false, enum: string[], default: string };
    includePattern?: { type: 'string', description: string, required: false };
    excludePattern?: { type: 'string', description: string, required: false };
    recursive?: { type: 'boolean', description: string, required: false, default: boolean };
  }, ToolResult<{ files: string[] }>>,

  getActiveEditorContent: {
    name: 'getActiveEditorContent',
    description: 'Obtiene el contenido del editor activo',
    parameters: {},
    execute: getActiveEditorContent
  } as Tool<Record<string, never>, ToolResult<{ content: string; language: string }>>,

  applyTextEdit: {
    name: 'applyTextEdit',
    description: 'Aplica ediciones de texto al editor activo',
    parameters: {
      edits: {
        type: 'array',
        description: 'Lista de ediciones a aplicar',
        required: true,
        items: {
          type: 'object',
          properties: {
            range: {
              type: 'object',
              properties: {
                start: { type: 'number' },
                end: { type: 'number' }
              },
              required: ['start', 'end']
            },
            newText: { type: 'string' }
          },
          required: ['range', 'newText']
        }
      },
      documentUri: {
        type: 'string',
        description: 'URI del documento a editar (opcional, por defecto editor activo)',
        required: false
      }
    } as const,
    execute: applyTextEdit
  } as Tool<{
    edits: {
      type: 'array';
      description: string;
      required: true;
      items: {
        type: 'object';
        properties: {
          range: {
            type: 'object';
            properties: {
              start: { type: 'number' };
              end: { type: 'number' };
            };
            required: ['start', 'end'];
          };
          newText: { type: 'string' };
        };
        required: ['range', 'newText'];
      };
    };
    documentUri?: { type: 'string', description: string, required: false };
  }, ToolResult<{ success: boolean }>>,

  searchWorkspace: {
    name: 'searchWorkspace',
    description: 'Busca texto en el espacio de trabajo',
    parameters: {
      query: {
        type: 'string',
        description: 'Texto a buscar',
        required: true
      },
      includePattern: {
        type: 'string',
        description: 'Patrón glob para incluir archivos',
        required: false
      },
      excludePattern: {
        type: 'string',
        description: 'Patrón glob para excluir archivos',
        required: false
      },
      maxResults: {
        type: 'number',
        description: 'Número máximo de resultados',
        required: false,
        default: 100
      },
      isCaseSensitive: {
        type: 'boolean',
        description: 'Si la búsqueda debe distinguir mayúsculas y minúsculas',
        required: false,
        default: false
      },
      isRegExp: {
        type: 'boolean',
        description: 'Si la consulta es una expresión regular',
        required: false,
        default: false
      },
      isWholeWord: {
        type: 'boolean',
        description: 'Si la búsqueda debe coincidir con palabras completas',
        required: false,
        default: false
      }
    } as const,
    execute: searchWorkspace
  } as Tool<{
    query: { type: 'string', description: string, required: true };
    includePattern?: { type: 'string', description: string, required: false };
    excludePattern?: { type: 'string', description: string, required: false };
    maxResults?: { type: 'number', description: string, required: false, default: number };
    isCaseSensitive?: { type: 'boolean', description: string, required: false, default: boolean };
    isRegExp?: { type: 'boolean', description: string, required: false, default: boolean };
    isWholeWord?: { type: 'boolean', description: string, required: false, default: boolean };
  }, ToolResult<{ results: Array<{ uri: string; fileName: string; lineNumber: number; lineText: string; matchText: string }> }>>,

  getProjectInfo: {
    name: 'getProjectInfo',
    description: 'Obtiene información sobre el proyecto actual',
    parameters: {},
    execute: getProjectInfo
  } as Tool<Record<string, never>, ToolResult<{
    name: string;
    version?: string;
    description?: string;
    main?: string;
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  }>>,
  respond: {
    name: 'respond',
    description: 'Envía una respuesta al usuario',
    parameters: {
      message: {
        type: 'string',
        description: 'Mensaje a mostrar al usuario',
        required: true
      },
      markdown: {
        type: 'boolean',
        description: 'Si el mensaje está en formato Markdown',
        required: false,
        default: true
      },
      showNotification: {
        type: 'boolean',
        description: 'Si se debe mostrar una notificación',
        required: false,
        default: false
      },
      updateUI: {
        type: 'boolean',
        description: 'Si se debe actualizar la interfaz de usuario',
        required: false,
        default: true
      }
    } as const,
    execute: respond
  } as Tool<{
    message: { type: 'string', description: string, required: true };
    markdown: { type: 'boolean', description: string, required: false, default: boolean };
    showNotification: { type: 'boolean', description: string, required: false, default: boolean };
    updateUI: { type: 'boolean', description: string, required: false, default: boolean };
  }, ToolResult<{ delivered: boolean }>>
};

/**
 * Obtiene una herramienta por su nombre
 * @param name Nombre de la herramienta
 * @returns La herramienta o undefined si no existe
 */
export function getTool(name: string): Tool | undefined {
  return tools[name];
}

/**
 * Obtiene todas las herramientas disponibles
 * @returns Lista de todas las herramientas
 */
export function getAllTools(): Tool[] {
  return Object.values(tools);
}

/**
 * Ejecuta una herramienta con los parámetros especificados
 * @param name Nombre de la herramienta
 * @param params Parámetros para la herramienta
 * @returns Resultado de la ejecución
 */
export async function executeTool(name: string, params: Record<string, any>): Promise<any> {
  const tool = getTool(name);
  if (!tool) {
    throw new Error(`Tool not found: ${name}`);
  }
  
  // Validar parámetros requeridos
  for (const [paramName, paramConfig] of Object.entries(tool.parameters)) {
    if (paramConfig.required && !(paramName in params)) {
      throw new Error(`Missing required parameter: ${paramName}`);
    }
  }
  
  try {
    return await tool.execute(params);
  } catch (error) {
    console.error(`Error executing tool ${name}:`, error);
    throw error;
  }
}
