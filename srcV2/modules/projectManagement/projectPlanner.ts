import { Logger } from '../../utils/logger';
import { BaseAPI } from '../../models/baseAPI';
import { runPrompt } from '../../core/promptSystem/promptSystem';

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
    private logger: Logger,
    private modelApi: BaseAPI
  ) {
    this.logger.info('ProjectPlanner initialized');
  }
  
  public async createProjectPlan(input: string, projectContext: any): Promise<ProjectPlan> {
    try {
      this.logger.info('Creating project plan', { input });
      
      const context = {
        userPrompt: input,
        projectContext,
        availableTools: this.getAvailableProjectTools()
      };

      const plan = await runPrompt<ProjectPlan>(
        'projectManagement',
        context,
        this.modelApi
      );

      this.logger.info(`Project plan created with ${plan.steps.length} steps`);
      return plan;
    } catch (error) {
      this.logger.error('Error creating project plan', { error });
      return this.getDefaultPlan();
    }
  }
  
  private getAvailableProjectTools() {
    return [
      {
        name: 'createFile',
        description: 'Crea un nuevo archivo',
        parameters: {
          file: 'Ruta al nuevo archivo',
          content: 'Contenido del nuevo archivo'
        }
      },
      // ... otras herramientas
    ];
  }

  private getDefaultPlan(): ProjectPlan {
    return {
      objective: 'Default plan due to error',
      steps: [],
      estimatedComplexity: 'simple'
    };
  }
}