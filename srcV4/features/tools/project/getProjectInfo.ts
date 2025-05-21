import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { BaseTool } from '../baseTool';
import { ToolResult } from '../types';

/**
 * Interfaz para la información del proyecto
 */
interface ProjectInfo {
  /**
   * Ruta raíz del workspace
   */
  workspacePath: string;
  
  /**
   * Nombre del proyecto (nombre de la carpeta raíz)
   */
  name: string;
  
  /**
   * Lista de archivos en el proyecto
   */
  files: {
    /**
     * Ruta relativa al workspace
     */
    path: string;
    
    /**
     * Tamaño en bytes
     */
    size: number;
    
    /**
     * Si es un directorio
     */
    isDirectory: boolean;
    
    /**
     * Extensión del archivo (sin el punto)
     */
    extension?: string;
  }[];
  
  /**
   * Estadísticas del proyecto
   */
  stats: {
    /**
     * Número total de archivos
     */
    totalFiles: number;
    
    /**
     * Número total de directorios
     */
    totalDirs: number;
    
    /**
     * Tamaño total en bytes
     */
    totalSize: number;
    
    /**
     * Extensiones de archivo encontradas y su conteo
     */
    extensions: Record<string, number>;
  };
  
  /**
   * Configuración del proyecto (si existe)
   */
  config?: {
    /**
     * Tipo de proyecto (ej: node, python, etc.)
     */
    type?: string;
    
    /**
     * Dependencias del proyecto
     */
    dependencies?: Record<string, string>;
    
    /**
     * Scripts definidos en el proyecto
     */
    scripts?: Record<string, string>;
  };
}

/**
 * Herramienta para obtener información sobre el proyecto actual
 */
export class GetProjectInfoTool extends BaseTool<{}, ProjectInfo> {
  static readonly NAME = 'getProjectInfo';
  
  readonly name = GetProjectInfoTool.NAME;
  readonly description = 'Obtiene información sobre el proyecto actual';
  
  // No requiere parámetros
  readonly parameters = {};
  
  /**
   * Obtiene información sobre un directorio recursivamente
   */
  private async getDirectoryInfo(
    dirPath: string,
    relativePath: string = ''
  ): Promise<{ files: ProjectInfo['files']; stats: Omit<ProjectInfo['stats'], 'extensions'> }> {
    const files: ProjectInfo['files'] = [];
    let totalFiles = 0;
    let totalDirs = 0;
    let totalSize = 0;
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relPath = path.join(relativePath, entry.name);
        
        // Saltar directorios ocultos y node_modules
        if (entry.name.startsWith('.') || entry.name === 'node_modules') {
          continue;
        }
        
        const stats = await fs.stat(fullPath);
        
        if (entry.isDirectory()) {
          totalDirs++;
          
          // Para directorios, obtener su información recursivamente
          const dirInfo = await this.getDirectoryInfo(fullPath, relPath);
          totalFiles += dirInfo.stats.totalFiles;
          totalDirs += dirInfo.stats.totalDirs;
          totalSize += dirInfo.stats.totalSize;
          
          // Agregar el directorio a la lista
          files.push({
            path: relPath,
            size: 0,
            isDirectory: true
          });
          
          // Agregar los archivos del directorio
          files.push(...dirInfo.files);
        } else {
          // Para archivos, agregar a la lista
          totalFiles++;
          totalSize += stats.size;
          
          const fileExt = path.extname(entry.name).toLowerCase().substring(1);
          
          files.push({
            path: relPath,
            size: stats.size,
            isDirectory: false,
            extension: fileExt || undefined
          });
        }
      }
    } catch (error) {
      console.error(`Error al leer el directorio ${dirPath}:`, error);
    }
    
    return {
      files,
      stats: { totalFiles, totalDirs, totalSize }
    };
  }
  
  /**
   * Intenta determinar el tipo de proyecto
   */
  private async detectProjectType(workspacePath: string): Promise<string | undefined> {
    const configFiles = [
      'package.json',    // Node.js
      'requirements.txt', // Python
      'pom.xml',         // Java Maven
      'build.gradle',    // Java Gradle
      'Cargo.toml',      // Rust
      'go.mod',          // Go
      'project.clj',     // Clojure
      'Gemfile',         // Ruby
      'composer.json',   // PHP
      'pubspec.yaml',    // Dart/Flutter
      '*.sln',           // .NET
      '*.csproj'         // .NET Core
    ];
    
    for (const file of configFiles) {
      try {
        await fs.access(path.join(workspacePath, file));
        
        // Mapear archivos a tipos de proyecto
        const typeMap: Record<string, string> = {
          'package.json': 'node',
          'requirements.txt': 'python',
          'pom.xml': 'java-maven',
          'build.gradle': 'java-gradle',
          'Cargo.toml': 'rust',
          'go.mod': 'go',
          'project.clj': 'clojure',
          'Gemfile': 'ruby',
          'composer.json': 'php',
          'pubspec.yaml': 'dart'
        };
        
        return typeMap[file] || file;
      } catch {
        // El archivo no existe, continuar con el siguiente
        continue;
      }
    }
    
    return undefined;
  }
  
  /**
   * Intenta cargar la configuración del proyecto
   */
  private async loadProjectConfig(workspacePath: string): Promise<ProjectInfo['config']> {
    const config: ProjectInfo['config'] = {};
    
    // Detectar tipo de proyecto
    const projectType = await this.detectProjectType(workspacePath);
    if (projectType) {
      config.type = projectType;
    }
    
    // Cargar package.json para proyectos Node.js
    if (projectType === 'node') {
      try {
        const packageJsonPath = path.join(workspacePath, 'package.json');
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        
        if (packageJson.dependencies) {
          config.dependencies = packageJson.dependencies;
        }
        
        if (packageJson.scripts) {
          config.scripts = packageJson.scripts;
        }
      } catch (error) {
        console.error('Error al leer package.json:', error);
      }
    }
    
    return config;
  }
  
  async execute(): Promise<ToolResult<ProjectInfo>> {
    try {
      // Verificar que haya un workspace abierto
      if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
        return this.error('No hay ningún workspace abierto');
      }
      
      const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
      const projectName = path.basename(workspacePath);
      
      // Obtener información del directorio
      const { files, stats } = await this.getDirectoryInfo(workspacePath);
      
      // Calcular estadísticas de extensiones
      const extensions: Record<string, number> = {};
      
      for (const file of files) {
        if (!file.isDirectory && file.extension) {
          extensions[file.extension] = (extensions[file.extension] || 0) + 1;
        }
      }
      
      // Cargar configuración del proyecto
      const config = await this.loadProjectConfig(workspacePath);
      
      // Construir el resultado
      const hasConfig = config && (
        config.type !== undefined ||
        (config.dependencies && Object.keys(config.dependencies).length > 0) ||
        (config.scripts && Object.keys(config.scripts).length > 0)
      );
      
      const result: ProjectInfo = {
        workspacePath,
        name: projectName,
        files: files.sort((a, b) => a.path.localeCompare(b.path)),
        stats: {
          ...stats,
          extensions
        },
        config: hasConfig ? config : undefined
      };
      
      return this.success(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al obtener información del proyecto';
      return this.error(errorMessage);
    }
  }
}

// Exportar una instancia de la herramienta
export const getProjectInfoTool = new GetProjectInfoTool();
