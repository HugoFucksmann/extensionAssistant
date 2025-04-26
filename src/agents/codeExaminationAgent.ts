import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { BaseAPI } from '../models/baseAPI';
import { MemoryManager } from '../core/memoryManager';
import { PROMPTS } from './prompts';

/**
 * Agente encargado de examinar el código de archivos relevantes
 */
export class CodeExaminationAgent {
  constructor(
    private modelAPI: BaseAPI,
    private memoryManager: MemoryManager
  ) {}

  /**
   * Examina el código de los archivos seleccionados
   * @param analysis Análisis del prompt
   * @param fileSelection Selección de archivos relevantes
   * @returns Resultados del examen de código
   */
  public async examineCode(analysis: any, fileSelection: any): Promise<any> {
    try {
      if (!fileSelection.relevantFiles || fileSelection.relevantFiles.length === 0) {
        console.log('No hay archivos relevantes para examinar');
        return {
          consolidatedCodeExtracts: [],
          possibleIssues: [],
          needsAdditionalFiles: false,
          rootCauseAnalysis: "No se encontraron archivos relevantes para examinar."
        };
      }
      
      console.log(`Examinando ${fileSelection.relevantFiles.length} archivos relevantes`);
      
      // Resultados individuales de cada archivo
      const fileResults = [];
      
      // Examinar cada archivo individualmente
      for (const fileInfo of fileSelection.relevantFiles) {
        const result = await this.examineSingleFile(analysis, fileInfo.path);
        fileResults.push(result);
        
        // Guardar resultado en memoria temporal
        this.memoryManager.storeTemporaryMemory(`fileExamination:${fileInfo.path}`, result);
      }
      
      // Consolidar resultados
      const consolidationPrompt = PROMPTS.CODE_EXAMINATION_CONSOLIDATION
        .replace('{analysis.objective}', analysis.objective || 'Resolver el problema del usuario')
        .replace('{fileAnalysisResults}', JSON.stringify(fileResults));
      
      // Obtener respuesta consolidada
      const response = await this.modelAPI.generateResponse(consolidationPrompt);
      
      // Parsear la respuesta JSON
      try {
        const parsedResponse = JSON.parse(response);
        console.log('Examen de código consolidado:', 
          `${parsedResponse.consolidatedCodeExtracts?.length || 0} extractos, ` +
          `${parsedResponse.possibleIssues?.length || 0} posibles problemas`);
        return parsedResponse;
      } catch (parseError) {
        console.error('Error al parsear respuesta JSON de consolidación:', parseError);
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
        
        // Consolidación manual básica en caso de error
        return this.manualConsolidation(fileResults);
      }
    } catch (error) {
      console.error('Error en examen de código:', error);
      return {
        consolidatedCodeExtracts: [],
        possibleIssues: [],
        needsAdditionalFiles: false,
        rootCauseAnalysis: `Error durante el examen de código: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  /**
   * Examina un archivo individual
   * @param analysis Análisis del prompt
   * @param filePath Ruta del archivo
   * @returns Resultado del examen del archivo
   */
  private async examineSingleFile(analysis: any, filePath: string): Promise<any> {
    try {
      // Obtener contenido del archivo
      const fileContent = await this.getFileContent(filePath);
      
      if (!fileContent) {
        console.log(`No se pudo leer el archivo: ${filePath}`);
        return {
          isRelevant: false,
          relevanceScore: 0,
          reason: "No se pudo leer el archivo"
        };
      }
      
      // Construir el prompt para el examen del archivo
      const prompt = PROMPTS.SINGLE_FILE_EXAMINATION
        .replace('{analysis.objective}', analysis.objective || 'Resolver el problema del usuario')
        .replace('{filePath}', filePath)
        .replace('{fileContent}', fileContent);
      
      // Obtener respuesta del modelo
      const response = await this.modelAPI.generateResponse(prompt);
      
      // Parsear la respuesta JSON
      try {
        const parsedResponse = JSON.parse(response);
        console.log(`Examen de ${filePath} completado, relevancia: ${parsedResponse.relevanceScore || 0}`);
        return {
          ...parsedResponse,
          filePath // Añadir la ruta del archivo para referencia
        };
      } catch (parseError) {
        console.error(`Error al parsear respuesta JSON de examen de ${filePath}:`, parseError);
        console.log('Respuesta cruda:', response);
        
        // Intentar extraer JSON si está rodeado de texto
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const extractedJson = jsonMatch[0];
            console.log('Intentando parsear JSON extraído:', extractedJson);
            return {
              ...JSON.parse(extractedJson),
              filePath
            };
          } catch (extractError) {
            console.error('Error al parsear JSON extraído:', extractError);
          }
        }
        
        // Resultado básico en caso de error
        return {
          isRelevant: true,
          relevanceScore: 50,
          reason: "No se pudo analizar completamente",
          filePath,
          codeExtracts: [],
          possibleIssues: []
        };
      }
    } catch (error) {
      console.error(`Error al examinar archivo ${filePath}:`, error);
      return {
        isRelevant: false,
        relevanceScore: 0,
        reason: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        filePath
      };
    }
  }

  /**
   * Obtiene el contenido de un archivo
   * @param filePath Ruta relativa del archivo
   * @returns Contenido del archivo
   */
  private async getFileContent(filePath: string): Promise<string | null> {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      
      if (!workspaceFolders || workspaceFolders.length === 0) {
        console.log('No hay carpetas de workspace abiertas');
        return null;
      }
      
      const rootPath = workspaceFolders[0].uri.fsPath;
      const fullPath = path.join(rootPath, filePath);
      
      // Verificar si el archivo existe
      if (!fs.existsSync(fullPath)) {
        console.log(`El archivo no existe: ${fullPath}`);
        return null;
      }
      
      // Leer contenido del archivo
      return fs.readFileSync(fullPath, 'utf8');
    } catch (error) {
      console.error(`Error al leer archivo ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Realiza una consolidación manual básica en caso de error
   * @param fileResults Resultados individuales de los archivos
   * @returns Consolidación básica
   */
  private manualConsolidation(fileResults: any[]): any {
    // Filtrar archivos relevantes
    const relevantResults = fileResults.filter(result => result.isRelevant);
    
    // Extraer y consolidar extractos de código
    const consolidatedCodeExtracts = relevantResults.flatMap(result => 
      (result.codeExtracts || []).map((extract: any) => ({
        ...extract,
        filePath: result.filePath
      }))
    );
    
    // Extraer y consolidar posibles problemas
    const possibleIssues = relevantResults.flatMap(result => 
      (result.possibleIssues || []).map((issue: any) => ({
        ...issue,
        filePath: result.filePath
      }))
    );
    
    // Consolidar archivos adicionales sugeridos
    const additionalFilesToExamine = relevantResults.flatMap(result => 
      result.additionalFilesToExamine || []
    );
    
    return {
      consolidatedCodeExtracts,
      possibleIssues,
      needsAdditionalFiles: additionalFilesToExamine.length > 0,
      additionalFilesToExamine,
      rootCauseAnalysis: "Consolidación básica realizada debido a un error en la consolidación avanzada."
    };
  }
}
