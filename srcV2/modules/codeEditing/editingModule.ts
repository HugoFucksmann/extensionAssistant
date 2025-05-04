import { ToolRegistry } from '../../tools/core/toolRegistry';
import { LoggerService } from '../../utils/logger';
import { OrchestrationContext } from '../../core/context/orchestrationContext';

export interface EditingModuleResult {
  success: boolean;
  editedFiles: string[];
  error?: string;
}

export class EditingModule {
  constructor(
    private toolRegistry: ToolRegistry,
    private logger: LoggerService,
  ) {
    this.logger.info('EditingModule inicializado');
    console.log(`[EditingModule] Inicializado`);
  }
  
  public async executeEditingPlan(plan: any, context: OrchestrationContext): Promise<EditingModuleResult> {
    try {
      this.logger.info('EditingModule: Ejecutando plan de edición', { plan });
      console.log(`[EditingModule] Iniciando ejecución de plan de edición con ${plan.steps?.length || 0} pasos`);
      
      const result: EditingModuleResult = {
        success: true,
        editedFiles: []
      };
      
      // Ejecutar cada paso del plan
      if (plan.steps && Array.isArray(plan.steps)) {
        for (const step of plan.steps) {
          console.log(`[EditingModule] Ejecutando paso: ${step.description}`);
          
          const tool = this.toolRegistry.getByName(step.toolName);
          if (!tool) {
            throw new Error(`Herramienta no encontrada: ${step.toolName}`);
          }
          
          const stepResult = await tool.execute(step.params);
          console.log(`[EditingModule] Resultado del paso: ${JSON.stringify(stepResult)}`);
          
          // Si el paso edita un archivo, añadirlo a la lista
          if (step.toolName.includes('edit') && step.params.file) {
            result.editedFiles.push(step.params.file);
          }
        }
      }
      
      return result;
    } catch (error) {
      this.logger.error('EditingModule: Error ejecutando plan', { error });
      console.error(`[EditingModule] Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      
      return {
        success: false,
        editedFiles: [],
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
}
