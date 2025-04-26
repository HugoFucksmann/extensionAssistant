import * as vscode from 'vscode';
import * as path from 'path';
import { BaseAPI } from '../models/baseAPI';
import { PROMPTS } from './prompts';

/**
 * Agente encargado de seleccionar archivos relevantes para la consulta
 */
export class FileSelectionAgent {
  constructor(private modelAPI: BaseAPI) {}

  /**
   * Selecciona archivos relevantes basados en el análisis del prompt
   * @param analysis Análisis del prompt
   * @returns Lista de archivos relevantes con su nivel de relevancia
   */
  public async selectFiles(analysis: any): Promise<any> {
    try {
      // Obtener lista de archivos del workspace
      const availableFiles = await this.getWorkspaceFiles();
      
      if (!availableFiles || availableFiles.length === 0) {
        console.log('No se encontraron archivos en el workspace');
        return { relevantFiles: [] };
      }
      
      console.log(`Encontrados ${availableFiles.length} archivos en el workspace`);
      
      // Construir el prompt para la selección de archivos
      const prompt = PROMPTS.FILE_SELECTION
        .replace('{analysis}', JSON.stringify(analysis))
        .replace('{availableFiles}', JSON.stringify(availableFiles));
      
      // Obtener respuesta del modelo
      const response = await this.modelAPI.generateResponse(prompt);
      
      // Parsear la respuesta JSON
      try {
        const parsedResponse = JSON.parse(response);
        console.log('Archivos seleccionados:', parsedResponse.relevantFiles?.length || 0);
        return parsedResponse;
      } catch (parseError) {
        console.error('Error al parsear respuesta JSON de selección de archivos:', parseError);
        console.log('Respuesta cruda:', response);
        
        // Intentar extraer JSON si está rodeado de texto
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const extractedJson = jsonMatch[0];
            console.log('Intentando parsear JSON extraído:', extractedJson);
            return JSON.parse(extractedJson);
          } catch (extractError) {
            console.error('Error al parsear JSON extraído:', extractError);
          }
        }
        
        // Devolver una lista vacía en caso de error
        return { relevantFiles: [] };
      }
    } catch (error) {
      console.error('Error en selección de archivos:', error);
      return { relevantFiles: [] };
    }
  }

  /**
   * Obtiene la lista de archivos en el workspace
   * @returns Lista de rutas de archivos
   */
  private async getWorkspaceFiles(): Promise<string[]> {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      
      if (!workspaceFolders || workspaceFolders.length === 0) {
        console.log('No hay carpetas de workspace abiertas');
        return [];
      }
      
      const rootPath = workspaceFolders[0].uri.fsPath;
      console.log(`Buscando archivos en: ${rootPath}`);
      
      // Buscar archivos en el workspace
      const files = await vscode.workspace.findFiles(
        '**/*.{js,ts,jsx,tsx,html,css,json,md}',
        '**/node_modules/**'
      );
      
      // Convertir a rutas relativas
      return files.map(file => {
        const relativePath = path.relative(rootPath, file.fsPath);
        return relativePath.replace(/\\/g, '/'); // Normalizar separadores
      });
    } catch (error) {
      console.error('Error al obtener archivos del workspace:', error);
      return [];
    }
  }
}
