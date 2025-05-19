/**
 * Registro de herramientas para la arquitectura Windsurf
 * Centraliza la definición y gestión de todas las herramientas disponibles para el agente
 */

import * as vscode from 'vscode';
import { Tool, ToolResult } from './types';

// Importar herramientas de sistema de archivos
import { getFileContents } from './filesystem/getFileContents';
import { writeToFile } from './filesystem/writeToFile';
import { listFiles } from './filesystem/listFiles';

// Importar herramientas de editor
import { getActiveEditorContent } from './editor/getActiveEditorContent';
import { applyTextEdit } from './editor/applyTextEdit';

// Importar herramientas de proyecto
import { searchWorkspace } from './project/searchWorkspace';
import { getProjectInfo } from './project/getProjectInfo';

// Importar herramienta de respuesta
import { respond } from './core/respond';

/**
 * Registro central de herramientas para el agente Windsurf
 */
export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  constructor() {
    this.registerDefaultTools();
  }

  /**
   * Registra las herramientas predeterminadas
   */
  private registerDefaultTools(): void {
    // Herramientas de sistema de archivos
    this.registerTool('getFileContents', getFileContents, 'Obtiene el contenido de un archivo', {
      parameters: {
        filePath: 'Ruta del archivo a leer',
        relativeTo: 'Si la ruta es relativa al workspace o absoluta'
      },
      returns: {
        content: 'Contenido del archivo',
        path: 'Ruta completa del archivo'
      }
    });
    
    this.registerTool('writeToFile', writeToFile, 'Escribe contenido en un archivo', {
      parameters: {
        filePath: 'Ruta del archivo a escribir',
        content: 'Contenido a escribir en el archivo',
        relativeTo: 'Si la ruta es relativa al workspace o absoluta',
        createIfNotExists: 'Si se debe crear el archivo si no existe'
      },
      returns: {
        path: 'Ruta completa del archivo'
      }
    });
    
    this.registerTool('listFiles', listFiles, 'Lista archivos en un directorio', {
      parameters: {
        dirPath: 'Ruta del directorio a listar',
        relativeTo: 'Si la ruta es relativa al workspace o absoluta',
        includePattern: 'Patrón para incluir archivos',
        excludePattern: 'Patrón para excluir archivos',
        recursive: 'Si se deben listar archivos recursivamente'
      },
      returns: {
        files: 'Lista de archivos encontrados'
      }
    });
    
    // Herramientas de editor
    this.registerTool('getActiveEditorContent', getActiveEditorContent, 'Obtiene el contenido del editor activo', {
      parameters: {},
      returns: {
        content: 'Contenido del editor',
        fileName: 'Nombre del archivo',
        languageId: 'ID del lenguaje',
        lineCount: 'Número de líneas',
        selection: 'Información de selección'
      }
    });
    
    this.registerTool('applyTextEdit', applyTextEdit, 'Aplica ediciones de texto al editor activo', {
      parameters: {
        edits: 'Ediciones a aplicar',
        documentUri: 'URI del documento a editar'
      },
      returns: {
        success: 'Si la edición se aplicó correctamente'
      }
    });
    
    // Herramientas de proyecto
    this.registerTool('searchWorkspace', searchWorkspace, 'Busca en el workspace', {
      parameters: {
        query: 'Texto a buscar',
        includePattern: 'Patrón para incluir archivos',
        excludePattern: 'Patrón para excluir archivos',
        maxResults: 'Número máximo de resultados',
        isCaseSensitive: 'Si la búsqueda es sensible a mayúsculas/minúsculas',
        isRegExp: 'Si la búsqueda es una expresión regular',
        isWholeWord: 'Si la búsqueda debe coincidir con palabras completas'
      },
      returns: {
        results: 'Resultados de la búsqueda'
      }
    });
    
    this.registerTool('getProjectInfo', getProjectInfo, 'Obtiene información del proyecto', {
      parameters: {},
      returns: {
        name: 'Nombre del proyecto',
        rootPath: 'Ruta raíz del proyecto',
        workspaceFolders: 'Carpetas del workspace',
        packageJson: 'Información del package.json',
        gitInfo: 'Información de git',
        fileStats: 'Estadísticas de archivos'
      }
    });
    
    // Herramienta de respuesta
    this.registerTool('respond', respond, 'Genera respuestas al usuario', {
      parameters: {
        message: 'Mensaje a enviar',
        markdown: 'Si el mensaje está en formato markdown',
        showNotification: 'Si se debe mostrar una notificación',
        updateUI: 'Si se debe actualizar la UI'
      },
      returns: {
        delivered: 'Si el mensaje se entregó correctamente'
      }
    });
  }

  /**
   * Registra una herramienta en el registro
   * @param name Nombre de la herramienta
   * @param tool Función de la herramienta
   * @param description Descripción de la herramienta
   * @param schema Esquema de la herramienta
   */
  registerTool(name: string, tool: any, description: string, schema: any): void {
    this.tools.set(name, {
      name,
      description,
      execute: tool,
      schema
    });
  }

  /**
   * Obtiene una herramienta por su nombre
   * @param name Nombre de la herramienta
   * @returns La herramienta o undefined si no existe
   */
  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * Verifica si una herramienta existe en el registro
   * @param name Nombre de la herramienta
   * @returns true si la herramienta existe, false en caso contrario
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Obtiene los nombres de todas las herramientas registradas
   * @returns Array con los nombres de las herramientas
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Obtiene todas las herramientas registradas
   * @returns Array con todas las herramientas
   */
  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Ejecuta una herramienta por su nombre
   * @param name Nombre de la herramienta
   * @param params Parámetros para la herramienta
   * @returns Resultado de la ejecución
   */
  async executeTool(name: string, params: any): Promise<ToolResult> {
    const tool = this.getTool(name);
    
    if (!tool) {
      return {
        success: false,
        error: `Tool not found: ${name}`
      };
    }
    
    return description;
  }
}
