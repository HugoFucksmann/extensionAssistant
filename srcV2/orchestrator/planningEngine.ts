/**
 * Motor de Planificación
 * 
 * Responsabilidad: Generar planes detallados para tareas complejas.
 * Este componente crea planes de ejecución paso a paso para resolver
 * tareas complejas que requieren múltiples herramientas.
 */

import { OrchestrationContext } from '../core/context/orchestrationContext';
import { ConfigManager } from '../core/config/configManager';
import { Logger } from '../utils/logger';
import { EventBus } from '../core/event/eventBus';
import { BaseAPI } from '../models/baseAPI';
import { ToolRegistry } from '../tools/core/toolRegistry';
import { InputAnalysis } from './inputAnalyzer';
import { ToolSelector } from './toolSelector';
import { FeedbackManager } from './feedbackManager';

// Importar planificadores de módulos
import { EditingPlanner } from '../modules/codeEditing/editingPlanner';
import { ExaminationPlanner } from '../modules/codeExamination/examinationPlanner';
import { ProjectPlanner } from '../modules/projectManagement/projectPlanner';
import { ProjectSearchPlanner } from '../modules/projectSearch/projectSearchPlanner';
import { CommunicationPlanner } from '../modules/communication/communicationPlanner';

/**
 * Interfaz que define un plan de ejecución
 */
export interface ExecutionPlan {
  taskUnderstanding: string;
  goals: string[];
  plan: PlanStep[];
  estimatedComplexity: "simple" | "moderate" | "complex";
  potentialChallenges: string[];
}

export interface PlanStep {
  stepNumber: number;
  description: string;
  toolName: string;
  toolParams: Record<string, any>;
  expectedOutput: string;
  isRequired: boolean;
  fallbackStep: number | null;
}

/**
 * Clase para generar planes de ejecución
 */
export class PlanningEngine {
  // Planificadores de módulos
  private editingPlanner: EditingPlanner;
  private examinationPlanner: ExaminationPlanner;
  private projectPlanner: ProjectPlanner;
  private projectSearchPlanner: ProjectSearchPlanner;
  private communicationPlanner: CommunicationPlanner;

  constructor(
    private orchestrationContext: OrchestrationContext,
    private configManager: ConfigManager,
    private logger: Logger,
    private eventBus: EventBus,
    private modelApi: BaseAPI,
    private toolRegistry: ToolRegistry,
    private toolSelector: ToolSelector,
    private feedbackManager: FeedbackManager
  ) {
    // Inicializar planificadores de módulos
    this.editingPlanner = new EditingPlanner(configManager, logger, modelApi);
    this.examinationPlanner = new ExaminationPlanner(configManager, logger, modelApi);
    this.projectPlanner = new ProjectPlanner(configManager, logger, modelApi);
    this.projectSearchPlanner = new ProjectSearchPlanner(configManager, logger, modelApi);
    this.communicationPlanner = new CommunicationPlanner(configManager, logger, modelApi);
    
    this.logger.info('PlanningEngine inicializado con planificadores de módulos');
  }

  /**
   * Crea un plan de ejecución para una tarea
   * @param userInput La entrada del usuario
   * @param inputAnalysis El análisis de la entrada
   * @returns Un plan de ejecución
   */
  public async createPlan(userInput: string, inputAnalysis: InputAnalysis): Promise<ExecutionPlan> {
    try {
      this.logger.info('PlanningEngine: Creando plan de ejecución', { 
        userInput,
        category: inputAnalysis.category
      });
      
      this.feedbackManager.notify({
        type: 'progress',
        message: 'Analizando la solicitud y preparando plan de ejecución...',
        step: 'plan-creation',
        userNotification: {
          show: true,
          message: 'Analizando la solicitud y preparando plan de ejecución...',
          type: 'info'
        }
      });
      
      // Obtener el contexto relevante
      const sessionData = this.orchestrationContext.get();
      
      // Variable para almacenar el plan específico del módulo
      let modulePlan: any = null;
      let needsGenericPlan = false;
      
      // Seleccionar el planificador adecuado según la categoría
      console.log(`[PlanningEngine] Creando plan para categoría: ${inputAnalysis.category}`);
      
      switch (inputAnalysis.category) {
        case 'codeEditing':
          console.log(`[PlanningEngine] Usando EditingPlanner`);
          modulePlan = await this.editingPlanner.createEditingPlan(userInput, {
            referencedFiles: inputAnalysis.relevantContext,
            projectData: sessionData.projectData || {}
          });
          break;
          
        case 'codeExamination':
          console.log(`[PlanningEngine] Usando ExaminationPlanner`);
          modulePlan = await this.examinationPlanner.createExaminationPlan(userInput, {
            referencedFiles: inputAnalysis.relevantContext,
            projectData: sessionData.projectData || {}
          });
          break;
          
        case 'projectManagement':
          console.log(`[PlanningEngine] Usando ProjectPlanner`);
          modulePlan = await this.projectPlanner.createProjectPlan(userInput, {
            projectData: sessionData.projectData || {}
          });
          break;
          
        case 'projectSearch':
          console.log(`[PlanningEngine] Usando ProjectSearchPlanner`);
          modulePlan = await this.projectSearchPlanner.createSearchPlan(userInput, {
            projectData: sessionData.projectData || {}
          });
          break;
          
        case 'communication':
          console.log(`[PlanningEngine] Usando CommunicationPlanner`);
          // Para comunicación, usaremos un enfoque diferente ya que no genera un plan de ejecución
          // sino que directamente genera una respuesta
          needsGenericPlan = true;
          break;
          
        default:
          console.log(`[PlanningEngine] Categoría no soportada: ${inputAnalysis.category}, usando planificador genérico`);
          needsGenericPlan = true;
      }
      
      let executionPlan: ExecutionPlan;
      
      // Si no se pudo crear un plan específico de módulo, usar el planificador genérico
      if (needsGenericPlan || !modulePlan) {
        console.log(`[PlanningEngine] Usando planificador genérico`);
        
        // Obtener herramientas disponibles
        const availableTools = this.toolRegistry.getAvailableTools();
        
        // Preparar el prompt para el modelo
        const prompt = this.preparePrompt(
          userInput, 
          inputAnalysis, 
          sessionData, 
          availableTools
        );
        
        // Obtener el plan del modelo
        const modelResponse = await this.modelApi.generateResponse(prompt);
        
        // Parsear la respuesta del modelo
        executionPlan = this.parseModelResponse(modelResponse);
      } else {
        // Convertir el plan específico del módulo a un ExecutionPlan
        console.log(`[PlanningEngine] Convirtiendo plan específico a ExecutionPlan`);
        
        executionPlan = this.convertModulePlanToExecutionPlan(modulePlan, inputAnalysis);
      }
      
      // Validar y enriquecer el plan
      const enrichedPlan = await this.enrichPlan(executionPlan, inputAnalysis);
      
      // Añadir metadatos al plan
      (enrichedPlan as any).metadata = {
        category: inputAnalysis.category,
        objective: enrichedPlan.taskUnderstanding,
        estimatedComplexity: enrichedPlan.estimatedComplexity
      };
      
      // Notificar sobre la creación del plan
      this.feedbackManager.notify({
        type: 'info',
        message: `Plan creado con ${enrichedPlan.plan.length} pasos. Complejidad: ${enrichedPlan.estimatedComplexity}`,
        detail: {
          planSteps: enrichedPlan.plan.length,
          complexity: enrichedPlan.estimatedComplexity
        },
        userNotification: {
          show: true,
          message: `Plan creado con ${enrichedPlan.plan.length} pasos. Complejidad: ${enrichedPlan.estimatedComplexity}`,
          type: 'info'
        }
      });
      
      // Emitir evento de plan creado
      this.eventBus.emit('plan:created', enrichedPlan);
      this.eventBus.emit('step:completed:plan-creation', {});
      
      return enrichedPlan;
    } catch (error) {
      this.logger.error('PlanningEngine: Error al crear plan de ejecución', { error });
      
      this.feedbackManager.notify({
        type: 'error',
        message: 'Error al crear el plan de ejecución. Utilizando plan alternativo.',
        detail: { error },
        userNotification: {
          show: true,
          message: 'Error al crear el plan de ejecución. Utilizando plan alternativo.',
          type: 'error'
        }
      });
      
      return this.getFallbackPlan(userInput, inputAnalysis);
    }
  }

  /**
   * Prepara el prompt para el modelo
   */
  private preparePrompt(
    userInput: string,
    inputAnalysis: InputAnalysis,
    sessionData: any,
    availableTools: any[]
  ): string {

   
    
    // Si no hay un template específico, usamos uno por defecto
    const basePrompt = `
      Tu tarea es crear un plan detallado para resolver la siguiente solicitud de usuario.
      
      # Solicitud del usuario
      {{userInput}}
      
      # Análisis de la solicitud
      {{inputAnalysis}}
      
      # Contexto de la sesión
      {{sessionContext}}
      
      # Contexto del proyecto
      {{projectContext}}
      
      # Contexto del código
      {{codeContext}}
      
      # Herramientas disponibles
      {{availableTools}}
      
      Devuelve un plan de ejecución en formato JSON con la siguiente estructura:
      {
        "taskUnderstanding": "Descripción clara de la tarea a realizar",
        "goals": ["Lista", "de", "objetivos", "concretos"],
        "plan": [
          {
            "stepNumber": 1,
            "description": "Descripción del paso",
            "toolName": "Nombre de la herramienta a usar",
            "toolParams": { "param1": "valor1", "param2": "valor2" },
            "expectedOutput": "Descripción de lo que se espera obtener",
            "isRequired": true,
            "fallbackStep": null
          }
        ],
        "estimatedComplexity": "simple | moderate | complex",
        "potentialChallenges": ["Lista", "de", "posibles", "desafíos"]
      }
    `;
    
    // Preparar las herramientas disponibles en formato legible
    const toolsFormatted = availableTools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.getParameterSchema() || 'No parameter schema available',
      capabilities: tool.capabilities || []
    }));
    
    // Reemplazar variables en el prompt
    return basePrompt
      .replace('{{userInput}}', userInput)
      .replace('{{inputAnalysis}}', JSON.stringify(inputAnalysis, null, 2))
      .replace('{{sessionContext}}', JSON.stringify(sessionData, null, 2))
      .replace('{{availableTools}}', JSON.stringify(toolsFormatted, null, 2));
  }

  /**
   * Parsea la respuesta del modelo a un objeto ExecutionPlan
   */
  private parseModelResponse(modelResponse: string): ExecutionPlan {
    try {
      // Extraer JSON de la respuesta (podría estar envuelto en texto)
      const jsonMatch = modelResponse.match(/```json\n([\s\S]*?)\n```/) || 
                       modelResponse.match(/{[\s\S]*}/);
      
      const jsonString = jsonMatch ? jsonMatch[0].replace(/```json\n|```/g, '') : modelResponse;
      
      // Intentar parsear la respuesta como JSON
      const parsedResponse = JSON.parse(jsonString);
      
      // Validar que la respuesta tenga la estructura esperada
      if (!this.validatePlanStructure(parsedResponse)) {
        throw new Error('Estructura de respuesta inválida del modelo');
      }
      
      return parsedResponse as ExecutionPlan;
    } catch (error) {
      this.logger.error('PlanningEngine: Error al parsear respuesta del modelo', { error, modelResponse });
      throw new Error(`Error al parsear respuesta del modelo: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Valida que un objeto tenga la estructura esperada para ExecutionPlan
   */
  private validatePlanStructure(obj: any): boolean {
    // Verificar campos obligatorios
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
    
    // Verificar que haya una lista de goals (añadido)
    const hasGoals = Array.isArray(obj.goals) && obj.goals.length > 0;
    
    // Si falta algún campo, añadirlo con un valor por defecto
    if (!obj.goals) {
      obj.goals = ["Completar la solicitud del usuario"];
    }
    
    return hasAllFields && hasPlanSteps && hasValidComplexity && hasGoals;
  }

  /**
   * Enriquece el plan con información adicional y valida las herramientas
   */
  private async enrichPlan(plan: ExecutionPlan, inputAnalysis: InputAnalysis): Promise<ExecutionPlan> {
    // Clonar el plan para no modificar el original
    const enrichedPlan: ExecutionPlan = JSON.parse(JSON.stringify(plan));
    
    // Procesar cada paso del plan
    for (let i = 0; i < enrichedPlan.plan.length; i++) {
      const step = enrichedPlan.plan[i];
      
      // Mostrar progreso
      this.feedbackManager.notify({
        type: 'progress',
        message: `Validando paso ${i + 1}: ${step.description}`,
        step: 'plan-enrichment',
        progress: Math.round((i / enrichedPlan.plan.length) * 100),
        userNotification: {
          show: true,
          message: `Validando paso ${i + 1}: ${step.description}`,
          type: 'info'
        }
      });
      
      // Verificar si la herramienta existe
      const tool = this.toolRegistry.getByName(step.toolName);
      if (!tool) {
        this.logger.warn(`PlanningEngine: Herramienta '${step.toolName}' no encontrada. Seleccionando alternativa.`);
        
        // Seleccionar una herramienta alternativa utilizando el selector
        const alternativeTool = await this.toolSelector.selectTool(
          plan.taskUnderstanding,
          step.description,
          inputAnalysis
        );
        
        // Actualizar el paso con la herramienta seleccionada
        step.toolName = alternativeTool.tool;
        // Preservar los parámetros existentes si son válidos
        // En caso contrario, el toolSelector debería proporcionar parámetros adecuados
        
        this.logger.info(`PlanningEngine: Se seleccionó la herramienta alternativa '${step.toolName}'`);
      }
      
      // Obtener la herramienta actualizada (la original o la alternativa)
      const updatedTool = this.toolRegistry.getByName(step.toolName);
      
      // Validar y corregir los parámetros de la herramienta
      if (updatedTool) {
        const paramSchema = updatedTool.getParameterSchema();
        
        if (paramSchema && !updatedTool.validateParams(step.toolParams)) {
          this.logger.warn(`PlanningEngine: Parámetros inválidos para '${step.toolName}'. Corrigiendo.`);
          
          // Corregir los parámetros basados en el esquema
          step.toolParams = this.correctToolParams(step.toolParams, paramSchema);
        }
      }
    }
    
    // Notificar finalización del enriquecimiento del plan
    this.eventBus.emit('step:completed:plan-enrichment', {});
    
    return enrichedPlan;
  }

  /**
   * Corrige o completa los parámetros de una herramienta basados en su esquema
   */
  private correctToolParams(params: Record<string, any>, schema: any): Record<string, any> {
    // Crear una copia del objeto de parámetros para no modificar el original
    const correctedParams = { ...params };
    
    // Si el esquema tiene un objeto de propiedades
    if (schema && schema.properties) {
      // Procesar cada propiedad en el esquema
      Object.entries(schema.properties).forEach(([paramName, paramSchema]: [string, any]) => {
        // Si el parámetro es requerido pero no está presente
        const isRequired = schema.required && schema.required.includes(paramName);
        
        if (isRequired && (correctedParams[paramName] === undefined || correctedParams[paramName] === null)) {
          // Asignar un valor por defecto si el parámetro no existe
          correctedParams[paramName] = this.getDefaultValue(paramSchema);
        }
        
        // Validar y corregir el tipo de dato según el esquema
        if (correctedParams[paramName] !== undefined) {
          correctedParams[paramName] = this.coerceValueToType(correctedParams[paramName], paramSchema);
        }
      });
    }
    
    return correctedParams;
  }

  /**
   * Obtiene un valor por defecto para un tipo de parámetro
   */
  /**
   * Convierte un plan específico de un módulo a un ExecutionPlan genérico
   * @param modulePlan Plan específico del módulo
   * @param inputAnalysis Análisis de la entrada
   * @returns Plan de ejecución genérico
   */
  private convertModulePlanToExecutionPlan(modulePlan: any, inputAnalysis: InputAnalysis): ExecutionPlan {
    try {
      this.logger.info('PlanningEngine: Convirtiendo plan específico a ExecutionPlan', { modulePlan });
      
      // Crear los pasos del plan de ejecución
      const planSteps: PlanStep[] = modulePlan.steps.map((step: any, index: number) => {
        return {
          stepNumber: index + 1,
          description: step.description,
          toolName: step.toolName,
          toolParams: step.params,
          expectedOutput: step.resultKey ? `Resultado guardado en ${step.resultKey}` : 'Ejecución exitosa',
          isRequired: true,
          fallbackStep: null
        };
      });
      
      // Crear el plan de ejecución
      const executionPlan: ExecutionPlan = {
        taskUnderstanding: modulePlan.objective,
        goals: [modulePlan.objective],
        plan: planSteps,
        estimatedComplexity: modulePlan.estimatedComplexity,
        potentialChallenges: []
      };
      
      return executionPlan;
    } catch (error) {
      this.logger.error('PlanningEngine: Error convirtiendo plan específico', { error });
      console.error(`[PlanningEngine] Error convirtiendo plan: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      
      // En caso de error, devolver un plan por defecto
      // Usar un valor por defecto para la entrada del usuario
      const userInput = 'Error al convertir plan específico';
      return this.getFallbackPlan(userInput, inputAnalysis);
    }
  }

  private getDefaultValue(propertySchema: any): any {
    if (!propertySchema || !propertySchema.type) {
      return null;
    }
    
    // Usar el valor por defecto definido en el esquema si existe
    if ('default' in propertySchema) {
      return propertySchema.default;
    }
    
    // Generar un valor por defecto según el tipo
    switch (propertySchema.type) {
      case 'string':
        return '';
      case 'number':
      case 'integer':
        return 0;
      case 'boolean':
        return false;
      case 'array':
        return [];
      case 'object':
        return {};
      default:
        return null;
    }
  }

  /**
   * Fuerza la conversión de un valor al tipo especificado en el esquema
   */
  private coerceValueToType(value: any, schema: any): any {
    if (!schema || !schema.type) {
      return value;
    }
    
    try {
      switch (schema.type) {
        case 'string':
          return String(value);
        
        case 'number':
        case 'integer':
          // Intentar convertir a número
          if (typeof value === 'string') {
            const num = Number(value);
            return isNaN(num) ? 0 : num;
          }
          return typeof value === 'number' ? value : 0;
        
        case 'boolean':
          // Convertir a booleano
          if (typeof value === 'string') {
            return value.toLowerCase() === 'true';
          }
          return Boolean(value);
        
        case 'array':
          // Asegurar que sea un array
          return Array.isArray(value) ? value : [value];
        
        case 'object':
          // Asegurar que sea un objeto
          return typeof value === 'object' && value !== null ? value : {};
        
        default:
          return value;
      }
    } catch (error) {
      this.logger.warn('Error al convertir valor al tipo esperado', { value, schema, error });
      return this.getDefaultValue(schema);
    }
  }

 /**
   * Obtiene un plan por defecto en caso de error
   */
 private getFallbackPlan(userInput: string, inputAnalysis: InputAnalysis): ExecutionPlan {
  // Crear un plan básico basado en la categoría del análisis
  let toolName: string;
  let toolParams: Record<string, any> = {};
  
  // Determinar la herramienta adecuada según la categoría
  switch (inputAnalysis.category) {
    case 'codeExamination':
      toolName = 'codeExaminer';
      toolParams = {
        query: userInput,
        executionMode: 'analyze'
      };
      break;
    
    case 'codeEditing':
      toolName = 'codeEditor';
      toolParams = {
        query: userInput,
        action: 'suggest'
      };
      break;
    
    case 'projectManagement':
      toolName = 'projectAnalyzer';
      toolParams = {
        query: userInput,
        scope: 'currentProject'
      };
      break;
      
    case 'projectSearch':
      toolName = 'fileSearcher';
      toolParams = {
        query: userInput,
        includeContent: true
      };
      break;
      
    case 'communication':
    default:
      toolName = 'communicationHandler';
      toolParams = {
        query: userInput,
        mode: 'respond'
      };
      break;
  }
  
  // Verificar si la herramienta seleccionada existe en el registro
  const selectedTool = this.toolRegistry.getByName(toolName);
  if (!selectedTool) {
    // Si la herramienta no existe, usar la primera herramienta disponible
    const availableTools = this.toolRegistry.getAvailableTools();
    if (availableTools.length > 0) {
      toolName = availableTools[0].name;
      // Mantener los parámetros simples
      toolParams = {
        query: userInput
      };
    } else {
      // Caso extremo: no hay herramientas disponibles
      this.logger.error('PlanningEngine: No hay herramientas disponibles para el plan alternativo');
      toolName = 'noopTool'; // Una herramienta que no hace nada
      toolParams = {};
    }
  }
  
  // Crear un plan de ejecución simplificado
  const fallbackPlan: ExecutionPlan = {
    taskUnderstanding: `Ejecutar un plan alternativo para: ${userInput}`,
    goals: ["Responder a la solicitud del usuario con un enfoque simplificado"],
    plan: [
      {
        stepNumber: 1,
        description: `Procesar la solicitud del usuario: "${userInput}"`,
        toolName: toolName,
        toolParams: toolParams,
        expectedOutput: "Respuesta o acción basada en la solicitud del usuario",
        isRequired: true,
        fallbackStep: null
      }
    ],
    estimatedComplexity: "simple",
    potentialChallenges: [
      "Este es un plan alternativo debido a un error en la planificación original",
      "Puede no cubrir todos los aspectos de la solicitud original"
    ]
  };
  
  // Notificar sobre el plan alternativo
  this.feedbackManager.notify({
    type: 'warning',
    message: 'Se está utilizando un plan alternativo simplificado debido a un error en la planificación.',
    detail: {
      originalInput: userInput,
      category: inputAnalysis.category,
      fallbackTool: toolName
    },
    userNotification: {
      show: true,
      message: 'Usando un enfoque simplificado para procesar su solicitud.',
      type: 'warning'
    }
  });
  
  // Emitir evento de plan alternativo creado
  this.eventBus.emit('plan:fallback-created', fallbackPlan);
  
  return fallbackPlan;
}}
