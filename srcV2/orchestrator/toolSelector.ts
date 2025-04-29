/**
 * Selector de Herramientas
 * 
 * Responsabilidad: Seleccionar la herramienta más adecuada para un paso específico.
 * Este componente analiza el contexto y requisitos para elegir la mejor herramienta
 * para ejecutar un paso determinado dentro de un plan.
 */

import { SessionContext } from '../core/context/sessionContext';
import { ProjectContext } from '../core/context/projectContext';
import { CodeContext } from '../core/context/codeContext';
import { ConfigManager } from '../core/config/configManager';
import { Logger } from '../utils/logger';
import { EventBus } from '../core/event/eventBus';
import { BaseAPI } from '../models/baseAPI';
import { ToolRegistry } from '../tools/core/toolRegistry';
import { InputAnalysis } from './inputAnalyzer';

/**
 * Interfaz que define la selección de una herramienta
 */
export interface ToolSelection {
  selectedTool: string;
  parameters: object;
  reasoning: string;
  requiredContext: string[];
  expectedOutcome: string;
  alternativeTools: string[];
}

/**
 * Clase para seleccionar herramientas
 */
export class ToolSelector {
  private sessionContext: SessionContext;
  private projectContext: ProjectContext;
  private codeContext: CodeContext;
  private configManager: ConfigManager;
  private logger: Logger;
  private eventBus: EventBus;
  private modelApi: BaseAPI;
  private toolRegistry: ToolRegistry;

  constructor(
    sessionContext: SessionContext,
    projectContext: ProjectContext,
    codeContext: CodeContext,
    configManager: ConfigManager,
    logger: Logger,
    eventBus: EventBus,
    modelApi: BaseAPI,
    toolRegistry: ToolRegistry
  ) {
    this.sessionContext = sessionContext;
    this.projectContext = projectContext;
    this.codeContext = codeContext;
    this.configManager = configManager;
    this.logger = logger;
    this.eventBus = eventBus;
    this.modelApi = modelApi;
    this.toolRegistry = toolRegistry;
  }

  /**
   * Selecciona la herramienta más adecuada para un paso específico
   * @param taskDescription La descripción de la tarea a realizar
   * @param stepDescription La descripción del paso específico
   * @param inputAnalysis El análisis de la entrada del usuario
   * @returns La selección de herramienta
   */
  public async selectTool(
    taskDescription: string,
    stepDescription: string,
    inputAnalysis: InputAnalysis
  ): Promise<ToolSelection> {
    try {
      this.logger.info('ToolSelector: Selecting tool', { 
        taskDescription,
        stepDescription,
        category: inputAnalysis.category
      });
      
      // Obtener el contexto relevante
      const sessionData = this.sessionContext.getSessionData();
      const projectData = this.projectContext.getContextData();
      const codeData = this.codeContext.getContextData();
      
      // Obtener las herramientas disponibles
      const availableTools = this.toolRegistry.availableTools;
      
      // Preparar el prompt para el modelo
      const prompt = this.preparePrompt(
        taskDescription,
        stepDescription,
        inputAnalysis,
        sessionData,
        projectData,
        codeData,
        availableTools
      );
      
      // Obtener la selección del modelo
      const modelResponse = await this.modelApi.getCompletion(prompt, {
        temperature: 0.2,
        max_tokens: 1000,
        prompt_name: 'tool_selector'
      });
      
      // Parsear la respuesta del modelo
      const toolSelection = this.parseModelResponse(modelResponse);
      
      // Validar que la herramienta seleccionada existe
      this.validateToolSelection(toolSelection);
      
      // Emitir evento de selección de herramienta
      this.eventBus.emit('tool:selected', toolSelection);
      
      return toolSelection;
    } catch (error) {
      this.logger.error('ToolSelector: Error selecting tool', { error });
      return this.getFallbackToolSelection(taskDescription, stepDescription, inputAnalysis);
    }
  }

  /**
   * Prepara el prompt para el modelo
   * @param taskDescription La descripción de la tarea
   * @param stepDescription La descripción del paso
   * @param inputAnalysis El análisis de la entrada
   * @param sessionData Los datos de la sesión
   * @param projectData Los datos del proyecto
   * @param codeData Los datos del código
   * @param availableTools Las herramientas disponibles
   * @returns El prompt preparado
   */
  private preparePrompt(
    taskDescription: string,
    stepDescription: string,
    inputAnalysis: InputAnalysis,
    sessionData: any,
    projectData: any,
    codeData: any,
    availableTools: any[]
  ): string {
    // Obtener el prompt desde el sistema de prompts
    const promptTemplate = this.configManager.getPromptTemplate('toolSelector');
    
    // Reemplazar variables en el prompt
    const filledPrompt = promptTemplate
      .replace('{{taskDescription}}', taskDescription)
      .replace('{{stepDescription}}', stepDescription)
      .replace('{{category}}', inputAnalysis.category)
      .replace('{{sessionContext}}', JSON.stringify(sessionData))
      .replace('{{projectContext}}', JSON.stringify(projectData))
      .replace('{{codeContext}}', JSON.stringify(codeData))
      .replace('{{availableTools}}', JSON.stringify(availableTools));
      
    return filledPrompt;
  }

  /**
   * Parsea la respuesta del modelo a un objeto ToolSelection
   * @param modelResponse La respuesta del modelo
   * @returns Un objeto ToolSelection
   */
  private parseModelResponse(modelResponse: string): ToolSelection {
    try {
      // Intentar parsear la respuesta como JSON
      const parsedResponse = JSON.parse(modelResponse);
      
      // Validar que la respuesta tenga la estructura esperada
      if (!this.validateSelectionStructure(parsedResponse)) {
        throw new Error('Invalid response structure from model');
      }
      
      return parsedResponse as ToolSelection;
    } catch (error) {
      this.logger.error('ToolSelector: Error parsing model response', { error, modelResponse });
      throw new Error(`Failed to parse model response: ${error.message}`);
    }
  }

  /**
   * Valida que un objeto tenga la estructura esperada para ToolSelection
   * @param obj El objeto a validar
   * @returns true si el objeto tiene la estructura esperada, false en caso contrario
   */
  private validateSelectionStructure(obj: any): boolean {
    const requiredFields = [
      'selectedTool',
      'parameters',
      'reasoning',
      'requiredContext',
      'expectedOutcome',
      'alternativeTools'
    ];
    
    // Verificar que todos los campos requeridos existan
    return requiredFields.every(field => field in obj);
  }

  /**
   * Valida que la herramienta seleccionada exista en el registro de herramientas
   * @param toolSelection La selección de herramienta a validar
   * @throws Error si la herramienta no existe
   */
  private validateToolSelection(toolSelection: ToolSelection): void {
    const tool = this.toolRegistry.getByName(toolSelection.selectedTool);
    if (!tool) {
      throw new Error(`Selected tool not found: ${toolSelection.selectedTool}`);
    }
    
    // Validar que los parámetros son válidos para la herramienta
    if (!tool.validateParams(toolSelection.parameters)) {
      throw new Error(`Invalid parameters for tool: ${toolSelection.selectedTool}`);
    }
  }

  /**
   * Obtiene una selección de herramienta por defecto en caso de error
   * @param taskDescription La descripción de la tarea
   * @param stepDescription La descripción del paso
   * @param inputAnalysis El análisis de la entrada
   * @returns Una selección de herramienta por defecto
   */
  private getFallbackToolSelection(
    taskDescription: string,
    stepDescription: string,
    inputAnalysis: InputAnalysis
  ): ToolSelection {
    // Seleccionar una herramienta básica según la categoría
    let toolName: string;
    let parameters: object = {};
    
    switch (inputAnalysis.category) {
      case 'codeExamination':
        toolName = 'codeExaminer';
        break;
      case 'codeEditing':
        toolName = 'codeEditor';
        break;
      case 'projectManagement':
        toolName = 'projectAnalyzer';
        break;
      case 'projectSearch':
        toolName = 'fileSelector';
        break;
      case 'communication':
      default:
        toolName = 'communicationModule';
        parameters = { message: taskDescription };
        break;
    }
    
    return {
      selectedTool: toolName,
      parameters: parameters,
      reasoning: 'Fallback selection due to error in tool selection process',
      requiredContext: [],
      expectedOutcome: 'Basic functionality for the requested category',
      alternativeTools: []
    };
  }
}