import { ConfigManager } from '../../core/config/configManager';
import { Logger } from '../../utils/logger';
import { BaseAPI } from '../../models/baseAPI';
import { PromptType } from '../../core/prompts/promptManager';

export interface ProjectSearchPlan {
  objective: string;
  steps: {
    toolName: string;
    params: any;
    description: string;
    resultKey?: string;
  }[];
  estimatedComplexity: 'simple' | 'moderate' | 'complex';
}

export class ProjectSearchPlanner {
  constructor(
    private configManager: ConfigManager,
    private logger: Logger,
    private modelApi: BaseAPI
  ) {
    this.logger.info('ProjectSearchPlanner inicializado');
    console.log(`[ProjectSearchPlanner] Inicializado`);
  }
  
  public async createSearchPlan(input: string, projectContext: any): Promise<ProjectSearchPlan> {
    try {
      this.logger.info('ProjectSearchPlanner: Creando plan de búsqueda', { input });
      console.log(`[ProjectSearchPlanner] Creando plan para: ${input}`);
      
      // Obtener el prompt template
      const promptTemplate = this.configManager.getPromptTemplate('projectSearch' as PromptType);
      
      // Preparar variables para el template
      const variables = {
        userPrompt: input,
        projectContext: JSON.stringify(projectContext),
        availableTools: JSON.stringify(this.getAvailableSearchTools())
      };
      
      // Llenar el template con las variables
      const filledPrompt = Object.entries(variables).reduce(
        (prompt, [key, value]) => prompt.replace(new RegExp(`{{${key}}}`, 'g'), value),
        promptTemplate
      );
      
      console.log(`[ProjectSearchPlanner] Enviando prompt al modelo (longitud: ${filledPrompt.length})`);
      
      // Obtener respuesta del modelo
      const modelResponse = await this.modelApi.generateResponse(filledPrompt);
      
      console.log(`[ProjectSearchPlanner] Respuesta recibida (longitud: ${modelResponse.length})`);
      
      // Parsear la respuesta
      const plan = this.parseModelResponse(modelResponse);
      
      console.log(`[ProjectSearchPlanner] Plan creado con ${plan.steps.length} pasos`);
      
      return plan;
    } catch (error) {
      this.logger.error('ProjectSearchPlanner: Error creando plan', { error });
      console.error(`[ProjectSearchPlanner] Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      
      // Devolver un plan por defecto en caso de error
      return {
        objective: 'Plan por defecto debido a un error',
        steps: [],
        estimatedComplexity: 'simple'
      };
    }
  }
  
  private parseModelResponse(response: string): ProjectSearchPlan {
    try {
      // Intentar parsear la respuesta como JSON
      const parsedResponse = JSON.parse(response);
      
      // Validar la estructura del plan
      if (!parsedResponse.objective || !Array.isArray(parsedResponse.steps)) {
        throw new Error('Estructura de plan inválida');
      }
      
      return parsedResponse;
    } catch (error) {
      this.logger.error('ProjectSearchPlanner: Error parseando respuesta', { error, response });
      throw new Error(`Error parseando respuesta del modelo: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }
  
  private getAvailableSearchTools(): any[] {
    // Aquí deberías devolver la lista de herramientas disponibles para búsqueda
    return [
      {
        name: 'searchFiles',
        description: 'Busca archivos en el proyecto',
        parameters: {
          pattern: 'Patrón de búsqueda (glob)',
          path: 'Ruta donde buscar (opcional)'
        }
      },
      {
        name: 'searchCode',
        description: 'Busca código en el proyecto',
        parameters: {
          query: 'Término de búsqueda',
          path: 'Ruta donde buscar (opcional)',
          language: 'Lenguaje de programación (opcional)'
        }
      },
      {
        name: 'listDirectory',
        description: 'Lista el contenido de un directorio',
        parameters: {
          path: 'Ruta al directorio'
        }
      },
      {
        name: 'readFile',
        description: 'Lee el contenido de un archivo',
        parameters: {
          file: 'Ruta al archivo a leer'
        }
      }
    ];
  }
}
