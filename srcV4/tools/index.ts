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
import { searchWorkspace } from './search/searchWorkspace';
import { getProjectInfo } from './project/getProjectInfo';
import { respond } from './response/respond';

/**
 * Tipo para una herramienta de la arquitectura Windsurf
 */
export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, {
    type: string;
    description: string;
    required: boolean;
  }>;
  execute: (params: Record<string, any>) => Promise<any>;
}

/**
 * Registro de todas las herramientas disponibles
 */
export const tools: Record<string, Tool> = {
  getFileContents: {
    name: 'getFileContents',
    description: 'Lee el contenido de un archivo',
    parameters: {
      path: {
        type: 'string',
        description: 'Ruta del archivo a leer',
        required: true
      }
    },
    execute: getFileContents
  },
  writeToFile: {
    name: 'writeToFile',
    description: 'Escribe contenido en un archivo',
    parameters: {
      path: {
        type: 'string',
        description: 'Ruta del archivo a escribir',
        required: true
      },
      content: {
        type: 'string',
        description: 'Contenido a escribir en el archivo',
        required: true
      }
    },
    execute: writeToFile
  },
  listFiles: {
    name: 'listFiles',
    description: 'Lista archivos en un directorio',
    parameters: {
      path: {
        type: 'string',
        description: 'Ruta del directorio a listar',
        required: true
      },
      pattern: {
        type: 'string',
        description: 'Patrón glob para filtrar archivos',
        required: false
      }
    },
    execute: listFiles
  },
  getActiveEditorContent: {
    name: 'getActiveEditorContent',
    description: 'Obtiene el contenido del editor activo',
    parameters: {},
    execute: getActiveEditorContent
  },
  applyTextEdit: {
    name: 'applyTextEdit',
    description: 'Aplica ediciones de texto al editor activo',
    parameters: {
      edits: {
        type: 'array',
        description: 'Lista de ediciones a aplicar',
        required: true
      }
    },
    execute: applyTextEdit
  },
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
      }
    },
    execute: searchWorkspace
  },
  getProjectInfo: {
    name: 'getProjectInfo',
    description: 'Obtiene información sobre el proyecto actual',
    parameters: {},
    execute: getProjectInfo
  },
  respond: {
    name: 'respond',
    description: 'Genera una respuesta para el usuario',
    parameters: {
      message: {
        type: 'string',
        description: 'Mensaje a enviar al usuario',
        required: true
      }
    },
    execute: respond
  }
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
