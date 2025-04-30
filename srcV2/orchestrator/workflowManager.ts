import { Logger } from '../utils/logger';
import { ErrorHandler } from '../utils/errorHandler';
import { ExecutionPlan } from './planningEngine';
import { ToolSelector } from './toolSelector';
import { ToolRegistry } from '../tools/core/toolRegistry';
// import { ResultEvaluator } from './resultEvaluator'; // Temporalmente comentado para pruebas
import { OrchestrationContext } from '../core/context/orchestrationContext';
import { FeedbackManager } from './feedbackManager';

export class WorkflowManager {
  constructor(
    private logger: Logger,
    private errorHandler: ErrorHandler,
    private toolSelector: ToolSelector,
    private toolRegistry: ToolRegistry,
    // private resultEvaluator: ResultEvaluator, // Temporalmente comentado para pruebas
    private feedbackManager: FeedbackManager
  ) {
    this.logger.info('WorkflowManager inicializado sin ResultEvaluator (modo prueba)');
  }

  public async startWorkflow(plan: ExecutionPlan, context: OrchestrationContext): Promise<any> {
    console.log(`[WorkflowManager] Iniciando ejecución de workflow con ${plan.plan.length} pasos`);
    // Verificar si existe la propiedad metadata antes de intentar acceder a ella
    if (plan.hasOwnProperty('metadata')) {
      console.log(`[WorkflowManager] Plan de ejecución: ${JSON.stringify((plan as any).metadata)}`);
    } else {
      console.log(`[WorkflowManager] Plan de ejecución sin metadatos`);
    }
    
    for (let i = 0; i < plan.plan.length; i++) {
      const step = plan.plan[i];
      console.log(`[WorkflowManager] Ejecutando paso ${i + 1}/${plan.plan.length}: ${step.description}`);
      console.log(`[WorkflowManager] Herramienta: ${step.toolName}, Parámetros: ${JSON.stringify(step.toolParams).substring(0, 200)}${JSON.stringify(step.toolParams).length > 200 ? '...' : ''}`);
      
      this.feedbackManager.notify({
        type: 'progress',
        message: `Ejecutando paso ${i + 1}: ${step.description}`,
        step: step.description,
        userNotification: {
          show: true,
          message: `Ejecutando paso ${i + 1}: ${step.description}`,
          type: 'info'
        }
      });

      try {
        console.log(`[WorkflowManager] Buscando herramienta: ${step.toolName}`);
        const tool = this.toolRegistry.getByName(step.toolName);
        if (!tool) {
          console.error(`[WorkflowManager] ERROR: Herramienta no encontrada: ${step.toolName}`);
          throw new Error(`Tool not found: ${step.toolName}`);
        }
        
        console.log(`[WorkflowManager] Validando parámetros para: ${step.toolName}`);
        if (!tool.validateParams(step.toolParams)) {
          console.error(`[WorkflowManager] ERROR: Parámetros inválidos para: ${step.toolName}`);
          throw new Error(`Invalid params for tool ${step.toolName}`);
        }

        console.log(`[WorkflowManager] Ejecutando herramienta: ${step.toolName}`);
        const startTime = Date.now();
        const result = await tool.execute(step.toolParams);
        const endTime = Date.now();
        console.log(`[WorkflowManager] Herramienta ${step.toolName} ejecutada en ${endTime - startTime}ms`);
        console.log(`[WorkflowManager] Resultado: ${typeof result === 'object' ? JSON.stringify(result).substring(0, 200) + (JSON.stringify(result).length > 200 ? '...' : '') : result}`);
        
        // Guardar resultado del paso en el contexto
        console.log(`[WorkflowManager] Guardando resultado en el contexto de orquestación`);
        const ctxData = context.get();
        let prevSteps = Array.isArray(ctxData.executedSteps) ? ctxData.executedSteps : [];
        context.set({ executedSteps: [...prevSteps, { step, result }] });
        console.log(`[WorkflowManager] Contexto actualizado con ${prevSteps.length + 1} pasos ejecutados`);

        // Si toolParams tiene archivos, notifícalo
        if (
          typeof step.toolParams === 'object' &&
          step.toolParams !== null &&
          Array.isArray((step.toolParams as any).files)
        ) {
          const filesArr = (step.toolParams as any).files as string[];
          this.feedbackManager.notify({
            type: 'file-selection',
            message: `Archivos analizados: ${filesArr.join(', ')}`,
            files: filesArr,
            step: step.description,
            userNotification: {
              show: true,
              message: `Archivos analizados: ${filesArr.join(', ')}`,
              type: 'info'
            }
          }
        );
        }

      } catch (error) {
        let errorMsg = 'Error desconocido';
        if (error instanceof Error) {
          errorMsg = error.message;
        } else if (typeof error === 'string') {
          errorMsg = error;
        }
        this.feedbackManager.notify({
          type: 'error',
          message: `Error en el paso ${i + 1}: ${errorMsg}`,
          step: step.description,
          userNotification: {
            show: true,
            message: `Error en el paso ${i + 1}: ${errorMsg}`,
            type: 'error'
          }
        });
        break;
      }
    }
    this.feedbackManager.notify({
      type: 'info',
      message: 'Workflow finalizado',
      userNotification: {
        show: true,
        message: 'Workflow finalizado',
        type: 'info'
      }
    });
    return context;
  }
}