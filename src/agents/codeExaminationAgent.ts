import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ModelAPIProvider } from '../models/modelApiProvider';
import { PROMPTS } from './prompts';
import { MemoryManager } from '../core/memoryManager';

/**
 * Agente encargado de examinar el código de los archivos seleccionados
 */
export class CodeExaminationAgent {
  constructor(
    private modelProvider: ModelAPIProvider,
    private memoryManager?: MemoryManager
  ) {}

  /**
   * Examina el código de los archivos seleccionados, analizando cada archivo independientemente
   * @param analysis Análisis previo del prompt
   * @param selectedFiles Archivos seleccionados
   * @returns Extractos de código relevantes y posibles problemas
   */
  public async examineCode(analysis: any, selectedFiles: any): Promise<any> {
    try {
      // Extraer el problema principal del análisis
      const problem = analysis.objective || 'Resolver el problema del usuario';
      
      // Leer el contenido de los archivos seleccionados
      const fileContents = await this.readFilesContent(selectedFiles.relevantFiles);
      
      // Analizar cada archivo individualmente
      const fileAnalysisResults = [];
      const additionalFilesToExamine = [];
      
      console.log(`Examinando ${fileContents.length} archivos individualmente...`);
      
      for (const file of fileContents) {
        console.log(`Analizando archivo: ${file.path}`);
        const fileAnalysis = await this.examineIndividualFile(analysis, problem, file);
        fileAnalysisResults.push({
          path: file.path,
          analysis: fileAnalysis
        });
        
        // Guardar en memoria temporal si está disponible
        if (this.memoryManager) {
          this.memoryManager.storeTemporaryMemory(`file_analysis_${file.path}`, fileAnalysis);
        }
        
        // Recopilar archivos adicionales sugeridos
        if (fileAnalysis.additionalFilesToExamine && fileAnalysis.additionalFilesToExamine.length > 0) {
          additionalFilesToExamine.push(...fileAnalysis.additionalFilesToExamine);
        }
      }
      
      // Consolidar resultados de todos los archivos analizados
      console.log('Consolidando resultados de análisis de archivos...');
      const consolidatedResults = await this.consolidateFileAnalysisResults(
        analysis, 
        problem, 
        fileAnalysisResults
      );
      
      // Añadir archivos adicionales sugeridos
      if (additionalFilesToExamine.length > 0) {
        // Eliminar duplicados y ordenar por prioridad
        const uniqueAdditionalFiles = this.deduplicateAndPrioritizeFiles(additionalFilesToExamine);
        
        if (!consolidatedResults.additionalFilesToExamine) {
          consolidatedResults.additionalFilesToExamine = [];
        }
        
        consolidatedResults.additionalFilesToExamine.push(...uniqueAdditionalFiles);
        consolidatedResults.needsAdditionalFiles = true;
      }
      
      return consolidatedResults;
    } catch (error) {
      console.error('Error al examinar código:', error);
      // Devolver un resultado básico en caso de error
      return {
        consolidatedCodeExtracts: [],
        possibleIssues: [
          {
            description: "No se pudo analizar el código correctamente",
            confidence: 0,
            location: "desconocido",
            explanation: "Se produjo un error durante el análisis"
          }
        ],
        needsAdditionalFiles: false,
        rootCauseAnalysis: "No se pudo determinar debido a un error en el proceso de análisis"
      };
    }
  }
  
  /**
   * Examina un archivo individual
   * @param analysis Análisis previo del prompt
   * @param problem Descripción del problema
   * @param file Archivo a examinar
   * @returns Resultado del análisis del archivo
   */
  private async examineIndividualFile(analysis: any, problem: string, file: any): Promise<any> {
    try {
      // Construir el prompt para el examen de archivo individual
      const prompt = PROMPTS.SINGLE_FILE_EXAMINATION
        .replace('{analysis}', JSON.stringify(analysis))
        .replace('{problem}', problem)
        .replace('{filePath}', file.path)
        .replace('{fileContent}', file.content);
      
      // Generar respuesta con el modelo
      const response = await this.modelProvider.generateResponse(prompt);
      
      // Parsear la respuesta JSON
      return this.parseJsonResponse(response);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.error(`Error al examinar archivo ${file.path}:`, error);
      // Devolver un resultado básico en caso de error
      return {
        isRelevant: false,
        relevanceScore: 0,
        reason: `Error al analizar el archivo: ${errorMessage}`,
        codeExtracts: [],
        possibleIssues: [],
        additionalFilesToExamine: []
      };
    }
  }
  
  /**
   * Consolida los resultados de análisis de múltiples archivos
   * @param analysis Análisis previo del prompt
   * @param problem Descripción del problema
   * @param fileAnalysisResults Resultados de análisis de archivos individuales
   * @returns Resultados consolidados
   */
  private async consolidateFileAnalysisResults(analysis: any, problem: string, fileAnalysisResults: any[]): Promise<any> {
    try {
      // Construir el prompt para la consolidación de resultados
      const prompt = PROMPTS.CODE_EXAMINATION_CONSOLIDATION
        .replace('{analysis}', JSON.stringify(analysis))
        .replace('{problem}', problem)
        .replace('{fileAnalysisResults}', JSON.stringify(fileAnalysisResults));
      
      // Generar respuesta con el modelo
      const response = await this.modelProvider.generateResponse(prompt);
      
      // Parsear la respuesta JSON
      return this.parseJsonResponse(response);
    } catch (error) {
      console.error('Error al consolidar resultados de análisis:', error);
      
      // Crear una consolidación manual básica en caso de error
      const consolidatedCodeExtracts = [];
      const possibleIssues = [];
      
      // Extraer manualmente los fragmentos de código y problemas de cada archivo
      for (const fileResult of fileAnalysisResults) {
        const analysis = fileResult.analysis;
        
        // Añadir extractos de código
        if (analysis.isRelevant && analysis.codeExtracts) {
          for (const extract of analysis.codeExtracts) {
            consolidatedCodeExtracts.push({
              filePath: fileResult.path,
              code: extract.code,
              startLine: extract.startLine,
              endLine: extract.endLine,
              relevance: `${analysis.relevanceScore}/100`,
              explanation: extract.explanation || 'No hay explicación disponible'
            });
          }
        }
        
        // Añadir posibles problemas
        if (analysis.possibleIssues) {
          for (const issue of analysis.possibleIssues) {
            possibleIssues.push({
              description: issue.description,
              confidence: issue.confidence,
              location: issue.location || fileResult.path,
              explanation: 'Identificado durante el análisis individual de archivos'
            });
          }
        }
      }
      
      return {
        consolidatedCodeExtracts,
        possibleIssues,
        needsAdditionalFiles: false,
        rootCauseAnalysis: "Consolidación manual debido a un error en el proceso de consolidación"
      };
    }
  }
  
  /**
   * Elimina duplicados y prioriza archivos adicionales sugeridos
   * @param files Lista de archivos sugeridos
   * @returns Lista sin duplicados y ordenada por prioridad
   */
  private deduplicateAndPrioritizeFiles(files: any[]): any[] {
    // Eliminar duplicados basados en la ruta sugerida
    const uniqueFiles: Record<string, any> = {};
    
    for (const file of files) {
      const filePath = file.suggestedPath;
      
      // Si el archivo ya existe, quedarse con el de mayor prioridad
      if (uniqueFiles[filePath]) {
        if (file.priority > uniqueFiles[filePath].priority) {
          uniqueFiles[filePath] = file;
        }
      } else {
        uniqueFiles[filePath] = file;
      }
    }
    
    // Convertir a array y ordenar por prioridad (mayor primero)
    return Object.values(uniqueFiles)
      .sort((a: any, b: any) => b.priority - a.priority);
  }

  /**
   * Lee el contenido de los archivos seleccionados
   * @param relevantFiles Archivos relevantes
   * @returns Contenido de los archivos
   */
  private async readFilesContent(relevantFiles: any[]): Promise<any[]> {
    if (!vscode.workspace.workspaceFolders) {
      return [];
    }
    
    const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
    const fileContents: any[] = [];
    
    for (const file of relevantFiles) {
      try {
        // Normalizar la ruta del archivo
        let normalizedPath = file.path;
        let fileFound = false;
        
        // Construir la ruta absoluta inicial
        let filePath = path.join(workspaceRoot, normalizedPath);
        
        // Verificar si el archivo existe con la ruta original
        if (fs.existsSync(filePath)) {
          fileFound = true;
        } 
        // Si no existe, intentar diferentes estrategias para encontrarlo
        else {
          console.log(`Buscando archivo alternativo para: ${normalizedPath}`);
          
          // Estrategia 1: Manejar rutas relativas que comienzan con ../ o ./
          if (normalizedPath.startsWith('../') || normalizedPath.startsWith('./')) {
            const cleanPath = normalizedPath
              .replace(/^\.\.\/+/g, '')
              .replace(/^\.\/+/g, '');
            
            const altPath = path.join(workspaceRoot, cleanPath);
            if (fs.existsSync(altPath)) {
              normalizedPath = cleanPath;
              filePath = altPath;
              fileFound = true;
              console.log(`Archivo encontrado con ruta limpia: ${normalizedPath}`);
            }
          }
          
          // Estrategia 2: Buscar por nombre de archivo en todo el workspace
          if (!fileFound) {
            const fileName = path.basename(normalizedPath);
            console.log(`Buscando archivos con nombre: ${fileName}`);
            
            try {
              const files = await vscode.workspace.findFiles(
                `**/${fileName}`, 
                '**/node_modules/**', 
                10
              );
              
              if (files.length > 0) {
                // Usar el primer archivo que coincida
                const relativePath = path.relative(workspaceRoot, files[0].fsPath);
                normalizedPath = relativePath;
                filePath = files[0].fsPath;
                fileFound = true;
                console.log(`Archivo encontrado por nombre: ${normalizedPath}`);
              }
            } catch (searchError) {
              console.error(`Error al buscar archivos: ${searchError}`);
            }
          }
          
          // Estrategia 3: Buscar por coincidencia parcial de ruta
          if (!fileFound) {
            // Extraer componentes de la ruta
            const pathComponents = normalizedPath.split('/');
            const fileName = pathComponents[pathComponents.length - 1];
            
            // Si hay un componente de directorio, buscar archivos en directorios similares
            if (pathComponents.length > 1) {
              const dirHint = pathComponents[pathComponents.length - 2].toLowerCase();
              
              try {
                // Buscar archivos con el mismo nombre en directorios que contengan una parte del nombre sugerido
                const files = await vscode.workspace.findFiles(
                  `**/${dirHint}*/**/${fileName}`, 
                  '**/node_modules/**',
                  5
                );
                
                if (files.length > 0) {
                  const relativePath = path.relative(workspaceRoot, files[0].fsPath);
                  normalizedPath = relativePath;
                  filePath = files[0].fsPath;
                  fileFound = true;
                  console.log(`Archivo encontrado por coincidencia parcial de directorio: ${normalizedPath}`);
                }
              } catch (searchError) {
                console.error(`Error al buscar por coincidencia parcial: ${searchError}`);
              }
            }
          }
        }
        
        // Si se encontró el archivo, leer su contenido
        if (fileFound) {
          const content = fs.readFileSync(filePath, 'utf8');
          
          fileContents.push({
            path: normalizedPath,
            content: content,
            originalPath: file.path !== normalizedPath ? file.path : undefined
          });
          
          console.log(`Archivo leído correctamente: ${normalizedPath}`);
        } else {
          console.warn(`No se pudo encontrar el archivo: ${normalizedPath}`);
          
          // Añadir un contenido vacío para evitar errores
          fileContents.push({
            path: normalizedPath,
            content: `// Archivo no encontrado: ${normalizedPath}\n// Este es un marcador de posición para evitar errores.`,
            notFound: true
          });
        }
      } catch (error) {
        console.error(`Error al leer archivo ${file.path}:`, error);
        
        // Añadir un contenido vacío para evitar errores
        fileContents.push({
          path: file.path,
          content: `// Error al leer archivo: ${file.path}\n// ${error instanceof Error ? error.message : 'Error desconocido'}`,
          error: true
        });
      }
    }
    
    return fileContents;
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
