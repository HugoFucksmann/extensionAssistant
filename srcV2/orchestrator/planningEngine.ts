/**
 * Motor de Planificación
 * 
 * Responsabilidad: Generar planes detallados para tareas complejas.
 * Este componente crea planes de ejecución paso a paso para resolver
 * tareas complejas que requieren múltiples herramientas.
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
import { ToolSelector } from './toolSelector';

/**
 * Interfaz que define un plan de ejecución
 */
export interface ExecutionPlan {
  taskUnderstanding: string;
  plan: {
    stepNumber: number;
    description: string;
    toolName: string;
    toolParams: object;
    expectedOutput: string;
    isRequired: boolean;
    fallbackStep: number | null;
  }[];
  estimatedComplexity: "simple" | "moderate" | "complex";
  potentialChallenges: string[];
}

/**
 * Clase para generar planes de ejecución
 */
export class PlanningEngine {
  private sessionContext: SessionContext;
  private projectContext: ProjectContext;
  private codeContext: CodeContext;
  private configManager: ConfigManager;
  private logger: Logger;
  private eventBus: EventBus;
  private modelApi: BaseAPI;
  private toolRegistry: ToolRegistry;
  private toolSelector: ToolSelector;

  constructor(
    sessionContext: SessionContext,
    projectContext: ProjectContext,
    codeContext: CodeContext,
    configManager: ConfigManager,
    logger: Logger,
    eventBus: EventBus,
    modelApi: BaseAPI,
    toolRegistry: ToolRegistry,
    toolSelector: ToolSelector
  ) {
    this.sessionContext = sessionContext;
    this.projectContext = projectContext;
    this.codeContext = codeContext;
    this.configManager = configManager;
    this.logger = logger;
    this.eventBus = eventBus;
    this.modelApi = modelApi;
    this.toolRegistry = toolRegistry;
    this.toolSelector = toolSelector;
  }

  /**
   * Crea un plan de ejecución para una tarea
   * @param userInput La entrada del usuario
   * @param inputAnalysis El análisis de la entrada
   * @returns Un plan de ejecución
   */
  public async createPlan(userInput: string, inputAnalysis: InputAnalysis): Promise<ExecutionPlan> {
    try {
      this.logger.info('PlanningEngine: Creating execution plan', { 
        userInput,
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
        userInput,
        inputAnalysis,
        sessionData,
        projectData,
        codeData,
        availableTools
      );
      
      // Obtener el plan del modelo
      const modelResponse = await this.modelApi.getCompletion(prompt, {
        temperature: 0.2,
        max_tokens: 2000,
        prompt_name: 'planning_engine'
      });
      
      // Parsear la respuesta del modelo
      const executionPlan = this.parseModelResponse(modelResponse);
      
      // Validar y enriquecer el plan
      const enrichedPlan = await this.enrichPlan(executionPlan, inputAnalysis);
      
      // Emitir evento de plan creado
      this.eventBus.emit('plan:created', enrichedPlan);
      
      return enrichedPlan;
    } catch (error) {
      this.logger.error('PlanningEngine: Error creating execution plan', { error });
      return this.getFallbackPlan(userInput, inputAnalysis);
    }
  }

  /**
   * Prepara el prompt para el modelo
   * @param userInput La entrada del usuario
   * @param inputAnalysis El análisis de la entrada
   * @param sessionData Los datos de la sesión
   * @param projectData Los datos del proyecto
   * @param codeData Los datos del código
   * @param availableTools Las herramientas disponibles
   * @returns El prompt preparado
   */
  private preparePrompt(
    userInput: string,
    inputAnalysis: InputAnalysis,
    sessionData: any,
    projectData: any,
    codeData: any,
    availableTools: any[]
  ): string {
    // Obtener el prompt desde el sistema de prompts
    const promptTemplate = this.configManager.getPromptTemplate('planningEngine');
    
    // Reemplazar variables en el prompt
    const filledPrompt = promptTemplate
      .replace('{{userInput}}', userInput)
      .replace('{{inputAnalysis}}', JSON.stringify(inputAnalysis))
      .replace('{{sessionContext}}', JSON.stringify(sessionData))
      .replace('{{projectContext}}', JSON.stringify(projectData))
      .replace('{{codeContext}}', JSON.stringify(codeData))
      .replace('{{availableTools}}', JSON.stringify(availableTools));
      
    return filledPrompt;
  }

  /**
   * Parsea la respuesta del modelo a un objeto ExecutionPlan
   * @param modelResponse La respuesta del modelo
   * @returns Un objeto ExecutionPlan
   */
  private parseModelResponse(modelResponse: string): ExecutionPlan {
    try {
      // Intentar parsear la respuesta como JSON
      const parsedResponse = JSON.parse(modelResponse);
      
      // Validar que la respuesta tenga la estructura esperada
      if (!this.validatePlanStructure(parsedResponse)) {
        throw new Error('Invalid response structure from model');
      }
      
      return parsedResponse as ExecutionPlan;
    } catch (error) {
      this.logger.error('PlanningEngine: Error parsing model response', { error, modelResponse });
      throw new Error(`Failed to parse model response: ${error.message}`);
    }
  }

  /**
   * Valida que un objeto tenga la estructura esperada para ExecutionPlan
   * @param obj El objeto a validar
   * @returns true si el objeto tiene la estructura esperada, false en caso contrario
   */
  private validatePlanStructure(obj: any): boolean {
    const requiredFields = [
      'taskUnderstanding',
      'plan',
      'estimatedComplexity',
      'potentialChallenges'
    ];
    
    // Verificar que todos los campos requeridos existan
    const hasAllFields = requiredFields.every(field => field in obj);
    
    // Verificar que el plan tenga al menos un paso
    const hasPlanSteps = Array.isArray(obj.plan) && obj.plan.length > 0;
    
    // Verificar que la complejidad estimada sea válida
    const validComplexities = ['simple', 'moderate', 'complex'];
    const hasValidComplexity = validComplexities.includes(obj.estimatedComplexity);
    
    return hasAllFields && hasPlanSteps && hasValidComplexity;
  }

  /**
   * Enriquece el plan con información adicional y valida las herramientas
   * @param plan El plan a enriquecer
   * @param inputAnalysis El análisis de la entrada
   * @returns El plan enriquecido
   */
  private async enrichPlan(plan: ExecutionPlan, inputAnalysis: InputAnalysis): Promise<ExecutionPlan> {
    // Clonar el plan para no modificar el original
    const enrichedPlan: ExecutionPlan = JSON.parse(JSON.stringify(plan));
    
    // Procesar cada paso del plan
    for (let i = 0; i < enrichedPlan.plan.length; i++) {
      const step = enrichedPlan.plan[i];
      
      // Verificar si la herramienta existe
      const tool = this.toolRegistry.getByName(step.toolName);
      if (!tool) {
        // Si la herramienta no existe, seleccionar una alternativa
        const toolSelection = await this.toolSelector.selectTool(
          plan.taskUnderstanding,
          step.description,
          inputAnalysis
        );
        
        // Actualizar el paso con la herramienta seleccionada
        step.toolName = toolSelection.selectedTool;
        step.toolParams = toolSelection.parameters;
        step.expectedOutput = toolSelection.expectedOutcome;
      }
      
      // Validar los parámetros de la herramienta
      if (tool && !tool.validateParams(step.toolParams)) {
        // Si los parámetros no son válidos, intentar corregirlos
        try {
          // Obtener el esquema de parámetros de la herramienta
          const paramSchema = tool.getParameterSchema();
          
          // Corregir o completar los parámetros basados en el esquema
          step.toolParams = this.correctToolParams(step.toolParams, paramSchema);
        } catch (error) {
          this.logger.warn('PlanningEngine: Error correcting tool parameters', { 
            step: step.stepNumber,
            tool: step.toolName,
            error
          });
        }
      }
    }
    
    return enrichedPlan;
  }

  /**
   * Corrige o completa los parámetros de una herramienta basados en su esquema
   * @param params Los parámetros actuales
   * @param schema El esquema de parámetros
   * @returns Los parámetros corregidos
   */
  private correctToolParams(params: object, schema: any): object {
    // Implementación simple para corregir parámetros
    // En una implementación real, esto sería más complejo y basado en el esquema
    
    const correctedParams = { ...params };
    
    // Ejemplo simple: asegurar que los parámetros requeridos existan con valores por defecto
    if (schema && schema.required && Array.isArray(schema.required)) {
      schema.required.forEach(param => {
        if (!(param in correctedParams)) {
          // Asignar un valor por defecto si el parámetro no existe
          correctedParams[param] = this.getDefaultValue(schema.properties[param]);
        }
      });
    }
    
    return correctedParams;
  }

  /**
   * Obtiene un valor por defecto para un tipo de parámetro
   * @param propertySchema El esquema de la propiedad
   * @returns Un valor por defecto
   */
  private getDefaultValue(propertySchema: any): any {
    if (!propertySchema || !propertySchema.type) {
      return null;
    }
    
    switch (propertySchema.type) {
      case 'string':
        return propertySchema.default || '';
      case 'number':
        return propertySchema.default || 0;
      case 'boolean':
        return propertySchema.default || false;
      case 'array':
        return propertySchema.default || [];
      case 'object':
        return propertySchema.default || {};
      default:
        return null;
    }
  }

  /**
   * Obtiene un plan por defecto en caso de error
   * @param userInput La entrada del usuario
   * @param inputAnalysis El análisis de la entrada
   * @returns Un plan por defecto
   */
  private getFallbackPlan(userInput: string, inputAnalysis: InputAnalysis): ExecutionPlan {
    // Crear un plan básico basado en la categoría
    let toolName: string;
    let toolParams: object = {};
    
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
        toolParams = { message: userInput };
        break;
    }
    
    return {
      taskUnderstanding: `Procesar la solicitud: ${userInput}`,
      plan: [
        {
          stepNumber: 1,
          description: `Ejecutar ${toolName} para procesar la solicitud`,
          toolName: toolName,
          toolParams: toolParams,
          expectedOutput: 'Respuesta básica a la solicitud del usuario',
          isRequired: true,
          fallbackStep: null
        }
      ],
      estimatedComplexity: 'simple',
      potentialChallenges: ['Plan de respaldo generado debido a un error en la planificación']
    };
  }
}