/**
 * Registro de herramientas para la arquitectura Windsurf
 * Centraliza la definición y gestión de todas las herramientas disponibles para el agente
 */

import * as vscode from 'vscode';
import { Tool, ToolResult, ParameterDefinition } from '../core/types';

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

// Importar EventEmitter3 para el bus de eventos
import EventEmitter from 'eventemitter3';

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
    // Convertir el esquema al nuevo formato si es necesario
    const formattedSchema = {
      parameters: this.formatSchemaParameters(schema.parameters || {}),
      returns: schema.returns || {}
    };
    
    this.tools.set(name, {
      name,
      description,
      execute: tool,
      schema: formattedSchema
    });
  }
  
  /**
   * Convierte los parámetros del esquema al nuevo formato
   * @param params Parámetros en formato antiguo
   * @returns Parámetros en formato ParameterDefinition
   */
  private formatSchemaParameters(params: Record<string, string>): Record<string, ParameterDefinition> {
    const result: Record<string, ParameterDefinition> = {};
    
    for (const [key, description] of Object.entries(params)) {
      result[key] = {
        type: 'string', // Por defecto, asumimos string
        description,
        required: !key.endsWith('?') // Si el nombre termina con ?, no es requerido
      };
    }
    
    return result;
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
    
    try {
      // Validar los parámetros requeridos
      this.validateToolParameters(tool, params);
      
      // Ejecutar la herramienta
      const result = await tool.execute(params);
      return result;
    } catch (error: any) {
      console.error(`[ToolRegistry] Error executing tool ${name}:`, error);
      return {
        success: false,
        error: error.message || `Error executing tool: ${name}`
      };
    }
  }
  
  /**
   * Valida que los parámetros cumplan con el esquema definido
   * @param tool Herramienta a validar
   * @param params Parámetros proporcionados
   */
  private validateToolParameters(tool: Tool, params: any): void {
    // Validar que todos los parámetros requeridos estén presentes
    const requiredParams = Object.entries(tool.schema.parameters)
      .filter(([_, def]) => def.required)
      .map(([name]) => name);
    
    const missingParams = requiredParams.filter(param => !(param in params));
    
    if (missingParams.length > 0) {
      throw new Error(`Missing required parameters for tool ${tool.name}: ${missingParams.join(', ')}`);
    }
    
    // Validar el tipo y formato de cada parámetro proporcionado
    const validationErrors: string[] = [];
    
    for (const [paramName, paramValue] of Object.entries(params)) {
      // Verificar si el parámetro está definido en el esquema
      const paramDef = tool.schema.parameters[paramName];
      if (!paramDef) {
        validationErrors.push(`Unknown parameter: ${paramName}`);
        continue;
      }
      
      // Validar el tipo de dato
      if (paramValue !== null && paramValue !== undefined) {
        const validationError = this.validateParameterType(paramName, paramValue, paramDef);
        if (validationError) {
          validationErrors.push(validationError);
        }
      }
    }
    
    // Si hay errores de validación, lanzar una excepción con todos los errores
    if (validationErrors.length > 0) {
      throw new Error(`Parameter validation failed for tool ${tool.name}:\n${validationErrors.join('\n')}`);
    }
  }
  
  /**
   * Valida el tipo de un parámetro según su definición
   * @param paramName Nombre del parámetro
   * @param paramValue Valor del parámetro
   * @param paramDef Definición del parámetro
   * @returns Mensaje de error o null si es válido
   */
  private validateParameterType(paramName: string, paramValue: any, paramDef: ParameterDefinition): string | null {
    const { type, enum: enumValues } = paramDef;
    
    // Validar tipo básico
    switch (type) {
      case 'string':
        if (typeof paramValue !== 'string') {
          return `Parameter ${paramName} must be a string, got ${typeof paramValue}`;
        }
        break;
        
      case 'number':
        if (typeof paramValue !== 'number' || isNaN(paramValue)) {
          return `Parameter ${paramName} must be a number, got ${typeof paramValue}`;
        }
        break;
        
      case 'boolean':
        if (typeof paramValue !== 'boolean') {
          return `Parameter ${paramName} must be a boolean, got ${typeof paramValue}`;
        }
        break;
        
      case 'array':
        if (!Array.isArray(paramValue)) {
          return `Parameter ${paramName} must be an array, got ${typeof paramValue}`;
        }
        break;
        
      case 'object':
        if (typeof paramValue !== 'object' || paramValue === null || Array.isArray(paramValue)) {
          return `Parameter ${paramName} must be an object, got ${Array.isArray(paramValue) ? 'array' : typeof paramValue}`;
        }
        break;
    }
    
    // Validar valores enuméricos si están definidos
    if (enumValues && Array.isArray(enumValues) && enumValues.length > 0) {
      if (!enumValues.includes(paramValue)) {
        return `Parameter ${paramName} must be one of: ${enumValues.join(', ')}, got: ${paramValue}`;
      }
    }
    
    // Validar mínimo y máximo para números
    if (type === 'number') {
      if (paramDef.minimum !== undefined && paramValue < paramDef.minimum) {
        return `Parameter ${paramName} must be at least ${paramDef.minimum}, got ${paramValue}`;
      }
      if (paramDef.maximum !== undefined && paramValue > paramDef.maximum) {
        return `Parameter ${paramName} must be at most ${paramDef.maximum}, got ${paramValue}`;
      }
    }
    
    // Validar longitud mínima y máxima para strings y arrays
    if ((type === 'string' || type === 'array') && paramDef.minLength !== undefined) {
      if (paramValue.length < paramDef.minLength) {
        return `Parameter ${paramName} must have at least ${paramDef.minLength} ${type === 'string' ? 'characters' : 'items'}, got ${paramValue.length}`;
      }
    }
    
    if ((type === 'string' || type === 'array') && paramDef.maxLength !== undefined) {
      if (paramValue.length > paramDef.maxLength) {
        return `Parameter ${paramName} must have at most ${paramDef.maxLength} ${type === 'string' ? 'characters' : 'items'}, got ${paramValue.length}`;
      }
    }
    
    // Validar patrón para strings
    if (type === 'string' && paramDef.pattern) {
      const regex = new RegExp(paramDef.pattern);
      if (!regex.test(paramValue)) {
        return `Parameter ${paramName} does not match required pattern: ${paramDef.pattern}`;
      }
    }
    
    return null; // Sin errores de validación
  }
}
