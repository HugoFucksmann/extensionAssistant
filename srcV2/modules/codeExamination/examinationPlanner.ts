import { ConfigManager } from '../../core/config/configManager';
import { Logger } from '../../utils/logger';
import { BaseAPI } from '../../models/baseAPI';
import { PromptType } from '../../core/prompts/promptManager';

export interface ExaminationPlan {
  objective: string;
  steps: {
    toolName: string;
    params: any;
    description: string;
    resultKey?: string;
  }[];
  estimatedComplexity: 'simple' | 'moderate' | 'complex';
}

export class ExaminationPlanner {
  constructor(
    private configManager: ConfigManager,
    private logger: Logger,
    private modelApi: BaseAPI
  ) {
    this.logger.info('ExaminationPlanner inicializado');
    console.log(`[ExaminationPlanner] Inicializado`);
  }
  
  public async createExaminationPlan(input: string, codeContext: any): Promise<ExaminationPlan> {
    try {
      this.logger.info('ExaminationPlanner: Creando plan de examen', { input });
      console.log(`[ExaminationPlanner] Creando plan para: ${input}`);
      
      // Obtener el prompt template
      const promptTemplate = this.configManager.getPromptTemplate('examination' as PromptType);
      
      // Preparar variables para el template
      const variables = {
        userPrompt: input,
        codeContext: JSON.stringify(codeContext),
        availableTools: JSON.stringify(this.getAvailableExaminationTools())
      };
      
      // Llenar el template con las variables
      const filledPrompt = Object.entries(variables).reduce(
        (prompt, [key, value]) => prompt.replace(new RegExp(`{{${key}}}`, 'g'), value),
        promptTemplate
      );
      
      console.log(`[ExaminationPlanner] Enviando prompt al modelo (longitud: ${filledPrompt.length})`);
      
      // Obtener respuesta del modelo
      const modelResponse = await this.modelApi.generateResponse(filledPrompt);
      
      console.log(`[ExaminationPlanner] Respuesta recibida (longitud: ${modelResponse.length})`);
      
      // Parsear la respuesta
      const plan = this.parseModelResponse(modelResponse);
      
      console.log(`[ExaminationPlanner] Plan creado con ${plan.steps.length} pasos`);
      
      return plan;
    } catch (error) {
      this.logger.error('ExaminationPlanner: Error creando plan', { error });
      console.error(`[ExaminationPlanner] Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      
      // Devolver un plan por defecto en caso de error
      return {
        objective: 'Plan por defecto debido a un error',
        steps: [],
        estimatedComplexity: 'simple'
      };
    }
  }
  
  private parseModelResponse(response: string): ExaminationPlan {
    try {
      // Intentar parsear la respuesta como JSON
      const parsedResponse = JSON.parse(response);
      
      // Validar la estructura del plan
      if (!parsedResponse.objective || !Array.isArray(parsedResponse.steps)) {
        throw new Error('Estructura de plan inválida');
      }
      
      return parsedResponse;
    } catch (error) {
      this.logger.error('ExaminationPlanner: Error parseando respuesta', { error, response });
      throw new Error(`Error parseando respuesta del modelo: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }
  
  private getAvailableExaminationTools(): any[] {
    // Aquí deberías devolver la lista de herramientas disponibles para examen de código
    return [
      {
        name: 'readFile',
        description: 'Lee el contenido de un archivo',
        parameters: {
          file: 'Ruta al archivo a leer'
        }
      },
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
        name: 'analyzeCode',
        description: 'Analiza el código en busca de patrones o problemas',
        parameters: {
          file: 'Ruta al archivo a analizar',
          type: 'Tipo de análisis (estructura, dependencias, complejidad)'
        }
      }
    ];
  }
}
