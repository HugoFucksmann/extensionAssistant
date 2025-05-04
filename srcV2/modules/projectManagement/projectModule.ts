/* import { ToolRegistry } from '../../tools/core/toolRegistry';
import { LoggerService } from '../../utils/logger';
import { OrchestrationContext } from '../../core/context/orchestrationContext';

export interface ProjectModuleResult {
  success: boolean;
  managedFiles: string[];
  error?: string;
}

export class ProjectModule {
  constructor(
    private toolRegistry: ToolRegistry,
    private logger: LoggerService,
  ) {
    this.logger.info('ProjectModule inicializado');
    console.log(`[ProjectModule] Inicializado`);
  }
  
  public async executeProjectPlan(plan: any, context: OrchestrationContext): Promise<ProjectModuleResult> {
    try {
      this.logger.info('ProjectModule: Ejecutando plan de gestión de proyecto', { plan });
      console.log(`[ProjectModule] Iniciando ejecución de plan con ${plan.steps?.length || 0} pasos`);
      
      const result: ProjectModuleResult = {
        success: true,
        managedFiles: []
      };
      
      // Ejecutar cada paso del plan
      if (plan.steps && Array.isArray(plan.steps)) {
        for (const step of plan.steps) {
          console.log(`[ProjectModule] Ejecutando paso: ${step.description}`);
          
          const tool = this.toolRegistry.getByName(step.toolName);
          if (!tool) {
            throw new Error(`Herramienta no encontrada: ${step.toolName}`);
          }
          
          const stepResult = await tool.execute(step.params);
          console.log(`[ProjectModule] Resultado del paso: ${JSON.stringify(stepResult)}`);
          
          // Si el paso maneja un archivo, añadirlo a la lista
          if (step.params.file || step.params.path) {
            result.managedFiles.push(step.params.file || step.params.path);
          }
        }
      }
      
      return result;
    } catch (error) {
      this.logger.error('ProjectModule: Error ejecutando plan', { error });
      console.error(`[ProjectModule] Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      
      return {
        success: false,
        managedFiles: [],
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
}
 */