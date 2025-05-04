/* import { LoggerService } from '../../utils/logger';

import { executeModelInteraction } from '../../core/promptSystem/promptSystem';

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
    private logger: LoggerService,
 
  ) {
    this.logger.info('ProjectSearchPlanner initialized');
  }
  
  public async createSearchPlan(input: string, projectContext: any): Promise<ProjectSearchPlan> {
    try {
      this.logger.info('Creating search plan', { input });
      
      const context = {
        userPrompt: input,
        projectContext,
        availableTools: this.getAvailableSearchTools()
      };

      const plan = await executeModelInteraction<ProjectSearchPlan>(
        'projectSearch',
        context,
      );

      this.logger.info(`Search plan created with ${plan.steps.length} steps`);
      return plan;
    } catch (error) {
      this.logger.error('Error creating search plan', { error });
      return this.getDefaultPlan();
    }
  }
  
  private getAvailableSearchTools() {
    return [
      {
        name: 'searchFiles',
        description: 'Busca archivos en el proyecto',
        parameters: {
          pattern: 'Patrón de búsqueda (glob)',
          path: 'Ruta donde buscar (opcional)'
        }
      },
      // ... otras herramientas
    ];
  }

  private getDefaultPlan(): ProjectSearchPlan {
    return {
      objective: 'Default plan due to error',
      steps: [],
      estimatedComplexity: 'simple'
    };
  }
}
 */