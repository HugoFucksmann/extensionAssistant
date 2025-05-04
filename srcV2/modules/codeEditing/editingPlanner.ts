import { LoggerService } from '../../utils/logger';
import { BaseAPI } from '../../models/baseAPI';
import { runPrompt } from '../../core/promptSystem/promptSystem';

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
    private logger: LoggerService,
    private modelApi: BaseAPI
  ) {
    this.logger.info('EditingPlanner initialized');
  }
  
  public async createEditingPlan(input: string, codeContext: any): Promise<EditingPlan> {
    try {
      this.logger.info('Creating editing plan', { input });
      
      const context = {
        userPrompt: input,
        codeContext,
        availableTools: this.getAvailableEditingTools()
      };

      const plan = await runPrompt<EditingPlan>(
        'editing',
        context,
        this.modelApi
      );

      this.logger.info(`Editing plan created with ${plan.steps.length} steps`);
      return plan;
    } catch (error) {
      this.logger.error('Error creating editing plan', { error });
      return this.getDefaultPlan();
    }
  }
  
  private getAvailableEditingTools() {
    return [
      {
        name: 'editFile',
        description: 'Edita un archivo existente',
        parameters: {
          file: 'Ruta al archivo a editar',
          content: 'Nuevo contenido del archivo o cambios a realizar'
        }
      },
      // ... otras herramientas
    ];
  }

  private getDefaultPlan(): EditingPlan {
    return {
      objective: 'Default plan due to error',
      steps: [],
      estimatedComplexity: 'simple'
    };
  }
}
