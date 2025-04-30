import { ConfigManager } from '../../core/config/configManager';
import { Logger } from '../../utils/logger';
import { BaseAPI } from '../../models/baseAPI';
import { PromptType } from '../../core/prompts/promptManager';

export interface ProjectPlan {
  objective: string;
  steps: {
    toolName: string;
    params: any;
    description: string;
  }[];
  estimatedComplexity: 'simple' | 'moderate' | 'complex';
}

export class ProjectPlanner {
  constructor(
    private configManager: ConfigManager,
    private logger: Logger,
    private modelApi: BaseAPI
  ) {
    this.logger.info('ProjectPlanner inicializado');
    console.log(`[ProjectPlanner] Inicializado`);
  }
  
  public async createProjectPlan(input: string, projectContext: any): Promise<ProjectPlan> {
    try {
      this.logger.info('ProjectPlanner: Creando plan de gestión de proyecto', { input });
      console.log(`[ProjectPlanner] Creando plan para: ${input}`);
      
      // Obtener el prompt template
      const promptTemplate = this.configManager.getPromptTemplate('projectManagement' as PromptType);
      
      // Preparar variables para el template
      const variables = {
        userPrompt: input,
        projectContext: JSON.stringify(projectContext),
        availableTools: JSON.stringify(this.getAvailableProjectTools())
      };
      
      // Llenar el template con las variables
      const filledPrompt = Object.entries(variables).reduce(
        (prompt, [key, value]) => prompt.replace(new RegExp(`{{${key}}}`, 'g'), value),
        promptTemplate
      );
      
      console.log(`[ProjectPlanner] Enviando prompt al modelo (longitud: ${filledPrompt.length})`);
      
      // Obtener respuesta del modelo
      const modelResponse = await this.modelApi.generateResponse(filledPrompt);
      
      console.log(`[ProjectPlanner] Respuesta recibida (longitud: ${modelResponse.length})`);
      
      // Parsear la respuesta
      const plan = this.parseModelResponse(modelResponse);
      
      console.log(`[ProjectPlanner] Plan creado con ${plan.steps.length} pasos`);
      
      return plan;
    } catch (error) {
      this.logger.error('ProjectPlanner: Error creando plan', { error });
      console.error(`[ProjectPlanner] Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      
      // Devolver un plan por defecto en caso de error
      return {
        objective: 'Plan por defecto debido a un error',
        steps: [],
        estimatedComplexity: 'simple'
      };
    }
  }
  
  private parseModelResponse(response: string): ProjectPlan {
    try {
      // Intentar parsear la respuesta como JSON
      const parsedResponse = JSON.parse(response);
      
      // Validar la estructura del plan
      if (!parsedResponse.objective || !Array.isArray(parsedResponse.steps)) {
        throw new Error('Estructura de plan inválida');
      }
      
      return parsedResponse;
    } catch (error) {
      this.logger.error('ProjectPlanner: Error parseando respuesta', { error, response });
      throw new Error(`Error parseando respuesta del modelo: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }
  
  private getAvailableProjectTools(): any[] {
    // Aquí deberías devolver la lista de herramientas disponibles para gestión de proyectos
    return [
      {
        name: 'createFile',
        description: 'Crea un nuevo archivo',
        parameters: {
          file: 'Ruta al nuevo archivo',
          content: 'Contenido del nuevo archivo'
        }
      },
      {
        name: 'createDirectory',
        description: 'Crea un nuevo directorio',
        parameters: {
          path: 'Ruta al nuevo directorio'
        }
      },
      {
        name: 'installDependency',
        description: 'Instala una dependencia en el proyecto',
        parameters: {
          name: 'Nombre de la dependencia',
          version: 'Versión de la dependencia (opcional)',
          dev: 'Si es una dependencia de desarrollo (opcional)'
        }
      },
      {
        name: 'runCommand',
        description: 'Ejecuta un comando en el proyecto',
        parameters: {
          command: 'Comando a ejecutar',
          cwd: 'Directorio de trabajo (opcional)'
        }
      }
    ];
  }
}
