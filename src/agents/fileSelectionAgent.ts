import * as vscode from 'vscode';
import * as path from 'path';
import { ModelAPIProvider } from '../models/modelApiProvider';
import { PROMPTS } from './prompts';

/**
 * Agente encargado de seleccionar archivos relevantes para el problema
 */
export class FileSelectionAgent {
  constructor(private modelProvider: ModelAPIProvider) {}

  /**
   * Selecciona archivos relevantes basados en el análisis previo
   * @param analysis Análisis previo del prompt
   * @returns Lista de archivos relevantes
   */
  public async selectFiles(analysis: any): Promise<any> {
    try {
      // Obtener lista de archivos disponibles en el workspace
      const availableFiles = await this.getWorkspaceFiles();
      
      // Filtrar archivos por palabras clave del análisis
      const filteredFiles = this.preFilterFiles(availableFiles, analysis.keywords);
      
      // Si hay muchos archivos, limitar a los más probables para no sobrecargar el modelo
      const topFiles = filteredFiles.slice(0, 10);
      
      // Construir el prompt para la selección de archivos
      const prompt = PROMPTS.FILE_SELECTION
        .replace('{analysis}', JSON.stringify(analysis))
        .replace('{availableFiles}', JSON.stringify(topFiles));
      
      // Generar respuesta con el modelo
      const response = await this.modelProvider.generateResponse(prompt);
      
      // Parsear la respuesta JSON
      return this.parseJsonResponse(response);
    } catch (error) {
      console.error('Error al seleccionar archivos:', error);
      // Devolver una selección básica en caso de error
      return {
        relevantFiles: this.preFilterFiles(await this.getWorkspaceFiles(), analysis.keywords)
          .slice(0, 3)
          .map(file => ({
            path: file,
            relevance: "media",
            reason: "Contiene palabras clave de la consulta"
          }))
      };
    }
  }

  /**
   * Obtiene la lista de archivos en el workspace actual
   * @returns Lista de rutas de archivos
   */
  private async getWorkspaceFiles(): Promise<string[]> {
    if (!vscode.workspace.workspaceFolders) {
      return [];
    }
    
    const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
    const files: string[] = [];
    
    // Usar la API de VS Code para buscar archivos
    const uris = await vscode.workspace.findFiles(
      '**/*.{js,ts,jsx,tsx,html,css}',
      '**/node_modules/**'
    );
    
    // Convertir URIs a rutas relativas
    for (const uri of uris) {
      const relativePath = path.relative(workspaceRoot, uri.fsPath);
      files.push(relativePath);
    }
    
    return files;
  }

  /**
   * Filtra archivos basados en palabras clave
   * @param files Lista de archivos
   * @param keywords Palabras clave
   * @returns Lista filtrada de archivos
   */
  private preFilterFiles(files: string[], keywords: string[]): string[] {
    if (!keywords || keywords.length === 0) {
      return files;
    }
    
    // Filtrar archivos que contengan alguna de las palabras clave
    return files.filter(file => {
      const fileName = path.basename(file).toLowerCase();
      return keywords.some(keyword => 
        fileName.includes(keyword.toLowerCase()) ||
        file.toLowerCase().includes(keyword.toLowerCase())
      );
    });
  }

  /**
   * Parsea la respuesta JSON del modelo
   * @param response Respuesta del modelo
   * @returns Objeto JSON parseado
   */
  private parseJsonResponse(response: string): any {
    try {
      // Intentar extraer JSON de la respuesta
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || 
                        response.match(/{[\s\S]*}/);
      
      if (jsonMatch) {
        const jsonStr = jsonMatch[0].replace(/```json\n|```/g, '');
        return JSON.parse(jsonStr);
      }
      
      // Si no se puede extraer JSON, intentar parsear toda la respuesta
      return JSON.parse(response);
    } catch (error) {
      console.error('Error al parsear respuesta JSON:', error);
      throw error;
    }
  }
}
