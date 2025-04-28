import * as vscode from 'vscode';
import { EventBus } from '../core/eventBus';
import { MemoryManager } from '../core/memoryManager';

import { ModelResponse, UIResponse } from '../interfaces';
import { BaseAPI } from '../models/baseAPI';

// Importar los agentes
import { PromptAnalysisAgent } from './promptAnalysisAgent';
import { FileSelectionAgent } from './fileSelectionAgent';
import { CodeExaminationAgent } from './codeExaminationAgent';
// ResponseGenerationAgent no longer needed as BaseAPI now has the functionality

/**
 * OrchestratorAgent es responsable de coordinar el flujo de procesamiento.
 * Recibe mensajes del usuario, los procesa y devuelve respuestas.
 */
export class OrchestratorAgent {
  // Agentes especializados
  private promptAnalysisAgent: PromptAnalysisAgent;
  private fileSelectionAgent: FileSelectionAgent;
  private codeExaminationAgent: CodeExaminationAgent;

  constructor(
    private eventBus: EventBus,
    private modelAPI: BaseAPI,
    private memoryManager: MemoryManager
  ) {
    console.log('OrchestratorAgent inicializado');
    
    // Inicializar agentes
    this.promptAnalysisAgent = new PromptAnalysisAgent(modelAPI);
    this.fileSelectionAgent = new FileSelectionAgent(modelAPI);
    this.codeExaminationAgent = new CodeExaminationAgent(modelAPI, memoryManager);
    
    // Suscribirse a eventos relevantes
    this.setupEventListeners();
  }

  /**
   * Configura los listeners de eventos
   */
  private setupEventListeners(): void {
    // Escuchar mensajes de usuario para procesar
    this.eventBus.on('message:send', async (payload) => {
      await this.processUserMessage(payload.message);
    });
    
    // No necesitamos escuchar cambios de modelo aquí ya que BaseAPI ya maneja esos eventos
  }

  /**
   * Inicializa el agente orquestrador
   * @param context El contexto de la extensión
   */
  public async initialize(context: vscode.ExtensionContext): Promise<void> {
    console.log('Inicializando OrchestratorAgent...');
    // Cualquier inicialización específica del orquestrador
  }
  
  /**
   * Procesa un mensaje del usuario
   * @param message El texto del mensaje del usuario
   */
  public async processUserMessage(message: string): Promise<void> {
    console.log(`OrchestratorAgent procesando mensaje: ${message}`);
    
    try {
      // 1. Emitir evento para indicar que se está procesando
      await this.eventBus.emit('message:processing', { isProcessing: true });
      
      // 2. Ejecutar flujo RAG con generación de plan
      console.log('Iniciando flujo RAG con generación de plan');
      const response = await this.executeRagFlow(message);
      console.log('Respuesta generada por el flujo RAG');
      
      // 3. Emitir evento con la respuesta completa
      await this.eventBus.emit('message:receive', {
        type: 'receiveMessage',
        userMessage: message,
        message: response,
        isUser: false,
        modelType: this.modelAPI.getCurrentModel()
      });
      
      // 4. Indicar que se ha completado el procesamiento
      await this.eventBus.emit('message:processing', { isProcessing: false });
      
      // 5. Limpiar la memoria temporal después de completar la interacción
      this.memoryManager.clearTemporaryMemory();
      console.log('Memoria temporal limpiada después de la interacción');
      
    } catch (error) {
      console.error('Error procesando mensaje:', error);
      
      // Emitir evento de error
      await this.eventBus.emit('error', {
        message: `Error procesando mensaje: ${error instanceof Error ? error.message : 'Error desconocido'}`
      });
      
      // Indicar que se ha completado el procesamiento (con error)
      await this.eventBus.emit('message:processing', { isProcessing: false });
    }
  }
  
  /**
   * Ejecuta el flujo RAG completo con generación de plan
   * @param message Mensaje del usuario
   * @returns Respuesta generada
   */
  private async executeRagFlow(message: string): Promise<string> {
    // 1. Analizar el prompt y generar plan inicial
    console.log('Analizando prompt y generando plan...');
    const analysis = await this.promptAnalysisAgent.analyze(message);
    
    // Guardar análisis en memoria temporal
    this.memoryManager.storeTemporaryMemory('analysis', analysis);
    console.log('Plan generado:', analysis.actionPlan);
    
    // 2. Seleccionar archivos relevantes
    console.log('Seleccionando archivos relevantes...');
    let relevantFiles = await this.fileSelectionAgent.selectFiles(analysis);
    
    // Guardar archivos relevantes en memoria temporal
    this.memoryManager.storeTemporaryMemory('relevantFiles', relevantFiles);
    console.log('Archivos seleccionados inicialmente:', relevantFiles.relevantFiles?.length || 0);
    
    // 3. Examinar código de archivos seleccionados
    console.log('Examinando código...');
    let codeExamination = await this.codeExaminationAgent.examineCode(analysis, relevantFiles);
    
    // 3.1 Verificar si se necesitan examinar archivos adicionales
    if (codeExamination.needsAdditionalFiles && 
        codeExamination.additionalFilesToExamine && 
        codeExamination.additionalFilesToExamine.length > 0) {
      
      console.log(`Se sugieren ${codeExamination.additionalFilesToExamine.length} archivos adicionales para examinar`);
      
      // Convertir las sugerencias de archivos al formato esperado por el agente de examen
      const additionalFiles = {
        relevantFiles: codeExamination.additionalFilesToExamine.map((file: { suggestedPath: string; reason?: string }) => ({
          path: file.suggestedPath,
          relevance: "alta",
          reason: file.reason || "Sugerido durante el análisis de código"
        }))
      };
      
      // Examinar los archivos adicionales
      console.log('Examinando archivos adicionales...');
      const additionalExamination = await this.codeExaminationAgent.examineCode(analysis, additionalFiles);
      
      // Guardar resultado del examen adicional en memoria temporal
      this.memoryManager.storeTemporaryMemory('additionalCodeExamination', additionalExamination);
      
      // Combinar los resultados
      console.log('Combinando resultados de examen de código...');
      
      // Combinar extractos de código
      const allCodeExtracts = [
        ...(codeExamination.consolidatedCodeExtracts || []),
        ...(additionalExamination.consolidatedCodeExtracts || [])
      ];
      
      // Combinar posibles problemas
      const allPossibleIssues = [
        ...(codeExamination.possibleIssues || []),
        ...(additionalExamination.possibleIssues || [])
      ];
      
      // Actualizar el objeto de examen de código
      codeExamination = {
        ...codeExamination,
        consolidatedCodeExtracts: allCodeExtracts,
        possibleIssues: allPossibleIssues,
        // Combinar análisis de causa raíz
        rootCauseAnalysis: `${codeExamination.rootCauseAnalysis || ''} \n\nAnálisis adicional: ${additionalExamination.rootCauseAnalysis || ''}`
      };
    }
    
    // Guardar resultado final del examen en memoria temporal
    this.memoryManager.storeTemporaryMemory('codeExamination', codeExamination);
    console.log('Código examinado, extractos consolidados:', codeExamination.consolidatedCodeExtracts?.length || 0);
    console.log('Posibles problemas identificados:', codeExamination.possibleIssues?.length || 0);
    
    // 4. Generar respuesta final
    console.log('Generando respuesta final usando BaseAPI directamente...');
    const response = await this.modelAPI.generateAdvancedResponse({
      userQuery: message,
      analysis,
      relevantFiles,
      codeExamination
    });
    
    return response;
  }

  /**
   * Libera los recursos utilizados por el agente orquestrador
   */
  public dispose(): void {
    console.log('Liberando recursos del OrchestratorAgent');
    // Cualquier limpieza necesaria
  }
}