import { ConfigManager } from '../../core/config/configManager';
import { Logger } from '../../utils/logger';
import { BaseAPI } from '../../models/baseAPI';
import { PromptType } from '../../core/prompts/promptManager';

export interface EditingPlan {
  objective: string;
  steps: {
    toolName: string;
    params: any;
    description: string;
  }[];
  estimatedComplexity: 'simple' | 'moderate' | 'complex';
}

export class EditingPlanner {
  constructor(
    private configManager: ConfigManager,
    private logger: Logger,
    private modelApi: BaseAPI
  ) {
    this.logger.info('EditingPlanner inicializado');
    console.log(`[EditingPlanner] Inicializado`);
  }
  
  public async createEditingPlan(input: string, codeContext: any): Promise<EditingPlan> {
    try {
      this.logger.info('EditingPlanner: Creando plan de edición', { input });
      console.log(`[EditingPlanner] Creando plan para: ${input}`);
      
      // Obtener el prompt template
      const promptTemplate = this.configManager.getPromptTemplate('editing' as PromptType);
      
      // Preparar variables para el template
      const variables = {
        userPrompt: input,
        codeContext: JSON.stringify(codeContext),
        availableTools: JSON.stringify(this.getAvailableEditingTools())
      };
      
      // Llenar el template con las variables
      const filledPrompt = Object.entries(variables).reduce(
        (prompt, [key, value]) => prompt.replace(new RegExp(`{{${key}}}`, 'g'), value),
        promptTemplate
      );
      
      console.log(`[EditingPlanner] Enviando prompt al modelo (longitud: ${filledPrompt.length})`);
      
      // Obtener respuesta del modelo
      const modelResponse = await this.modelApi.generateResponse(filledPrompt);
      
      console.log(`[EditingPlanner] Respuesta recibida (longitud: ${modelResponse.length})`);
      
      // Parsear la respuesta
      const plan = this.parseModelResponse(modelResponse);
      
      console.log(`[EditingPlanner] Plan creado con ${plan.steps.length} pasos`);
      
      return plan;
    } catch (error) {
      this.logger.error('EditingPlanner: Error creando plan', { error });
      console.error(`[EditingPlanner] Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      
      // Devolver un plan por defecto en caso de error
      return {
        objective: 'Plan por defecto debido a un error',
        steps: [],
        estimatedComplexity: 'simple'
      };
    }
  }
  
  private parseModelResponse(response: string): EditingPlan {
    try {
      // Intentar parsear la respuesta como JSON
      const parsedResponse = JSON.parse(response);
      
      // Validar la estructura del plan
      if (!parsedResponse.objective || !Array.isArray(parsedResponse.steps)) {
        throw new Error('Estructura de plan inválida');
      }
      
      return parsedResponse;
    } catch (error) {
      this.logger.error('EditingPlanner: Error parseando respuesta', { error, response });
      throw new Error(`Error parseando respuesta del modelo: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }
  
  private getAvailableEditingTools(): any[] {
    // Aquí deberías devolver la lista de herramientas disponibles para edición
    return [
      {
        name: 'editFile',
        description: 'Edita un archivo existente',
        parameters: {
          file: 'Ruta al archivo a editar',
          content: 'Nuevo contenido del archivo o cambios a realizar'
        }
      },
      {
        name: 'createFile',
        description: 'Crea un nuevo archivo',
        parameters: {
          file: 'Ruta al nuevo archivo',
          content: 'Contenido del nuevo archivo'
        }
      },
      {
        name: 'deleteFile',
        description: 'Elimina un archivo existente',
        parameters: {
          file: 'Ruta al archivo a eliminar'
        }
      }
    ];
  }
}
