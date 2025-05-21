import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { BaseTool } from '../baseTool';
import { ToolResult } from '../types';

/**
 * Interfaz para los parámetros de búsqueda
 */
interface SearchParams {
  /**
   * Patrón de búsqueda (puede incluir comodines)
   */
  pattern: string;
  
  /**
   * Directorio base para la búsqueda (relativo al workspace)
   * @default . (directorio raíz del workspace)
   */
  baseDir?: string;
  
  /**
   * Si la búsqueda debe ser sensible a mayúsculas/minúsculas
   * @default false
   */
  caseSensitive?: boolean;
  
  /**
   * Patrón de exclusión (opcional)
   */
  exclude?: string;
  
  /**
   * Número máximo de resultados a devolver
   * @default 100
   */
  maxResults?: number;
  
  /**
   * Si se debe buscar en archivos ocultos
   * @default false
   */
  includeHidden?: boolean;
}

/**
 * Interfaz para los resultados de búsqueda
 */
interface SearchResult {
  /**
   * Ruta completa del archivo
   */
  filePath: string;
  
  /**
   * Nombre del archivo
   */
  fileName: string;
  
  /**
   * Directorio que contiene el archivo
   */
  directory: string;
  
  /**
   * Tamaño del archivo en bytes
   */
  size: number;
  
  /**
   * Fecha de última modificación
   */
  modified: Date;
  
  /**
   * Si es un directorio
   */
  isDirectory: boolean;
}

/**
 * Herramienta para buscar archivos en el workspace
 */
export class SearchWorkspaceTool extends BaseTool<SearchParams, SearchResult[]> {
  static readonly NAME = 'searchWorkspace';
  
  readonly name = SearchWorkspaceTool.NAME;
  readonly description = 'Busca archivos en el workspace que coincidan con un patrón';
  
  readonly parameters = {
    pattern: {
      type: 'string',
      description: 'Patrón de búsqueda (puede incluir comodines)',
      required: true
    },
    baseDir: {
      type: 'string',
      description: 'Directorio base para la búsqueda (relativo al workspace)',
      default: '.'
    },
    caseSensitive: {
      type: 'boolean',
      description: 'Si la búsqueda debe ser sensible a mayúsculas/minúsculas',
      default: false
    },
    exclude: {
      type: 'string',
      description: 'Patrón de exclusión (opcional)'
    },
    maxResults: {
      type: 'number',
      description: 'Número máximo de resultados a devolver',
      default: 100
    },
    includeHidden: {
      type: 'boolean',
      description: 'Si se debe buscar en archivos ocultos',
      default: false
    }
  };
  
  /**
   * Convierte un patrón de búsqueda en una expresión regular
   */
  private patternToRegex(pattern: string, caseSensitive: boolean): RegExp {
    // Escapar caracteres especiales de regex
    const escaped = pattern
      .replace(/[.+^${}()|[\\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    return new RegExp(`^${escaped}$`, caseSensitive ? '' : 'i');
  }
  
  /**
   * Busca archivos recursivamente
   */
  private async searchDirectory(
    dirPath: string,
    patternRegex: RegExp,
    excludeRegex: RegExp | null,
    maxResults: number,
    includeHidden: boolean,
    results: SearchResult[]
  ): Promise<SearchResult[]> {
    if (results.length >= maxResults) {
      return results;
    }
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (results.length >= maxResults) {
          break;
        }
        
        const fullPath = path.join(dirPath, entry.name);
        const relativePath = vscode.workspace.asRelativePath(fullPath, false);
        
        // Saltar archivos ocultos si no se incluyen
        if (!includeHidden && entry.name.startsWith('.')) {
          continue;
        }
        
        // Verificar si coincide con el patrón de exclusión
        if (excludeRegex && excludeRegex.test(relativePath)) {
          continue;
        }
        
        // Verificar si es un directorio
        if (entry.isDirectory()) {
          // Si es un directorio, buscamos recursivamente
          await this.searchDirectory(
            fullPath, 
            patternRegex, 
            excludeRegex, 
            maxResults, 
            includeHidden, 
            results
          );
          continue;
        }
        
        // Verificar si el archivo coincide con el patrón
        if (patternRegex.test(entry.name)) {
          const stats = await fs.stat(fullPath);
          
          results.push({
            filePath: fullPath,
            fileName: entry.name,
            directory: dirPath,
            size: stats.size,
            modified: stats.mtime,
            isDirectory: false
          });
        }
      }
    } catch (error) {
      console.error(`Error al buscar en el directorio ${dirPath}:`, error);
    }
    
    return results;
  }
  
  async execute(params: SearchParams): Promise<ToolResult<SearchResult[]>> {
    try {
      this.validateParams(params);
      
      const {
        pattern,
        baseDir = '.',
        caseSensitive = false,
        exclude,
        maxResults = 100,
        includeHidden = false
      } = params;
      
      // Verificar que haya un workspace abierto
      if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
        return this.error('No hay ningún workspace abierto');
      }
      
      const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
      const searchDir = path.resolve(workspacePath, baseDir);
      
      // Verificar que el directorio base exista
      try {
        const stats = await fs.stat(searchDir);
        if (!stats.isDirectory()) {
          return this.error(`La ruta especificada no es un directorio: ${searchDir}`);
        }
      } catch (error) {
        return this.error(`No se pudo acceder al directorio: ${searchDir}`);
      }
      
      // Convertir patrones a expresiones regulares
      const patternRegex = this.patternToRegex(pattern, caseSensitive);
      const excludeRegex = exclude ? this.patternToRegex(exclude, caseSensitive) : null;
      
      // Realizar la búsqueda
      const results: SearchResult[] = [];
      await this.searchDirectory(
        searchDir,
        patternRegex,
        excludeRegex,
        maxResults,
        includeHidden,
        results
      );
      
      return this.success(results);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al buscar en el workspace';
      return this.error(errorMessage);
    }
  }
}

// Exportar una instancia de la herramienta
export const searchWorkspaceTool = new SearchWorkspaceTool();
