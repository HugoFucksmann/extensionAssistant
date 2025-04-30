import { ToolRegistry } from '../../tools/core/toolRegistry';
import { Logger } from '../../utils/logger';
import { BaseAPI } from '../../models/baseAPI';
import { OrchestrationContext } from '../../core/context/orchestrationContext';

export interface ExaminationModuleResult {
  success: boolean;
  analyzedFiles: string[];
  findings: any;
  error?: string;
}

export class ExaminationModule {
  constructor(
    private toolRegistry: ToolRegistry,
    private logger: Logger,
    private modelApi: BaseAPI
  ) {
    this.logger.info('ExaminationModule inicializado');
    console.log(`[ExaminationModule] Inicializado`);
  }
  
  public async executeExaminationPlan(plan: any, context: OrchestrationContext): Promise<ExaminationModuleResult> {
    try {
      this.logger.info('ExaminationModule: Ejecutando plan de examen', { plan });
      console.log(`[ExaminationModule] Iniciando ejecución de plan de examen con ${plan.steps?.length || 0} pasos`);
      
      const result: ExaminationModuleResult = {
        success: true,
        analyzedFiles: [],
        findings: {}
      };
      
      // Ejecutar cada paso del plan
      if (plan.steps && Array.isArray(plan.steps)) {
        for (const step of plan.steps) {
          console.log(`[ExaminationModule] Ejecutando paso: ${step.description}`);
          
          const tool = this.toolRegistry.getByName(step.toolName);
          if (!tool) {
            throw new Error(`Herramienta no encontrada: ${step.toolName}`);
          }
          
          const stepResult = await tool.execute(step.params);
          console.log(`[ExaminationModule] Resultado del paso: ${JSON.stringify(stepResult).substring(0, 200)}...`);
          
          // Guardar el resultado del paso
          if (step.resultKey) {
            result.findings[step.resultKey] = stepResult;
          }
          
          // Si el paso analiza un archivo, añadirlo a la lista
          if (step.params.file || step.params.path) {
            result.analyzedFiles.push(step.params.file || step.params.path);
          }
        }
      }
      
      return result;
    } catch (error) {
      this.logger.error('ExaminationModule: Error ejecutando plan', { error });
      console.error(`[ExaminationModule] Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      
      return {
        success: false,
        analyzedFiles: [],
        findings: {},
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
}
