import { ToolRegistry } from '../../tools/core/toolRegistry';
import { LoggerService } from '../../utils/logger';
import { BaseAPI } from '../../models/baseAPI';
import { OrchestrationContext } from '../../core/context/orchestrationContext';

export interface ProjectSearchModuleResult {
  success: boolean;
  searchResults: any;
  error?: string;
}

export class ProjectSearchModule {
  constructor(
    private toolRegistry: ToolRegistry,
    private logger: LoggerService,
    private modelApi: BaseAPI
  ) {
    this.logger.info('ProjectSearchModule inicializado');
    console.log(`[ProjectSearchModule] Inicializado`);
  }
  
  public async executeSearchPlan(plan: any, context: OrchestrationContext): Promise<ProjectSearchModuleResult> {
    try {
      this.logger.info('ProjectSearchModule: Ejecutando plan de búsqueda', { plan });
      console.log(`[ProjectSearchModule] Iniciando ejecución de plan con ${plan.steps?.length || 0} pasos`);
      
      const result: ProjectSearchModuleResult = {
        success: true,
        searchResults: {}
      };
      
      // Ejecutar cada paso del plan
      if (plan.steps && Array.isArray(plan.steps)) {
        for (const step of plan.steps) {
          console.log(`[ProjectSearchModule] Ejecutando paso: ${step.description}`);
          
          const tool = this.toolRegistry.getByName(step.toolName);
          if (!tool) {
            throw new Error(`Herramienta no encontrada: ${step.toolName}`);
          }
          
          const stepResult = await tool.execute(step.params);
          console.log(`[ProjectSearchModule] Resultado del paso: ${JSON.stringify(stepResult).substring(0, 200)}...`);
          
          // Guardar el resultado del paso
          if (step.resultKey) {
            result.searchResults[step.resultKey] = stepResult;
          }
        }
      }
      
      return result;
    } catch (error) {
      this.logger.error('ProjectSearchModule: Error ejecutando plan', { error });
      console.error(`[ProjectSearchModule] Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      
      return {
        success: false,
        searchResults: {},
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
}
