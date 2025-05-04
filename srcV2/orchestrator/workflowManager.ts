import { log } from '../utils/logger';
import { ErrorHandler } from '../utils/errorHandler';
import { ExecutionPlan } from './planningEngine';
import { ToolSelector } from './toolSelector';
import { ToolRegistry } from '../tools/core/toolRegistry';
import { OrchestrationContext } from '../core/context/orchestrationContext';
import { FeedbackManager } from './feedbackManager';
import { ModuleManager } from '../modules/moduleManager';

export class WorkflowManager {
  constructor(
    
    private errorHandler: ErrorHandler,
    private toolSelector: ToolSelector,
    private toolRegistry: ToolRegistry,
    private feedbackManager: FeedbackManager,
    private moduleManager: ModuleManager
  ) {
   
  }

  public async startWorkflow(plan: ExecutionPlan, context: OrchestrationContext): Promise<any> {
    // Comprobamos si el plan tiene metadatos que indiquen la categoría
    const category = plan.metadata?.category;
    
    if (category) {
      try {
        // Intentamos ejecutar el plan usando un módulo especializado
        return await this.executeSpecializedPlan(category, plan, context);
      } catch (error) {
        // Si hay un error en la ejecución especializada, lo registramos
        this.errorHandler.handleError({
          error,
          context: 'SpecializedWorkflowExecution',
          metadata: { 
            workflowId: plan.id,
            category
          }
        });
        
        // Y caemos a la ejecución genérica
        log(`Falling back to generic execution for plan ${plan.id}` , 'info');
        return this.executeGenericPlan(plan, context);
      }
    }
    
    // Si no hay categoría, usamos la ejecución genérica
    return this.executeGenericPlan(plan, context);
  }
  
  private async executeSpecializedPlan(
    category: string, 
    plan: ExecutionPlan, 
    context: OrchestrationContext
  ): Promise<any> {
    log(`Executing specialized plan for category: ${category}` , 'info');
    this.feedbackManager.notify({
      type: 'progress',
      message: `Starting specialized execution for ${category}`,
      userNotification: {
        show: true,
        message: `Processing with ${category} module`,
        type: 'info'
      }
    });
    
    try {
      // Intentamos ejecutar el plan a través del ModuleManager
      return await this.moduleManager.executePlan(plan, context);
    } catch (error) {
      log(`Error in specialized execution: ${error instanceof Error ? error.message : String(error)}` , 'error');
      throw error;
    }
  }

  private async executeGenericPlan(plan: ExecutionPlan, context: OrchestrationContext): Promise<any> {
    log(`Executing generic plan with ${plan.plan.length} steps` , 'info');
    const results: any[] = [];
    
    for (let i = 0; i < plan.plan.length; i++) {
      const step = plan.plan[i];
      const progressPercentage = ((i + 1) / plan.plan.length) * 100;
      
      // Notificar progreso
      this.feedbackManager.notifyProgress(
        `${plan.id}-${i}`,
        `Processing step ${i + 1}/${plan.plan.length}: ${step.description}`,
        progressPercentage
      );

      try {
        // Obtener la herramienta por nombre
        const tool = this.toolRegistry.getByName(step.toolName);
        if (!tool) {
          throw new Error(`Tool not found: ${step.toolName}`);
        }
        
        // Validar parámetros
        if (!tool.validateParams(step.toolParams)) {
          throw new Error(`Invalid parameters for tool: ${step.toolName}`);
        }

        // Ejecutar la herramienta
        const startTime = Date.now();
        const result = await tool.execute(step.toolParams);
        const duration = Date.now() - startTime;
        
        log(`Step ${i + 1} executed in ${duration}ms ${step.description} ${step.toolName}`, 'info');
        
        // Guardar resultado
        results.push(result);

        // Actualizar contexto
        const ctxData = context.get();
        const prevSteps = Array.isArray(ctxData.executedSteps) ? ctxData.executedSteps : [];
        context.set({ 
          executedSteps: [...prevSteps, { step, result }],
          lastStepResult: result,
          currentStepIndex: i,
          totalSteps: plan.plan.length
        });

        // Notificar archivos procesados si es necesario
        if (Array.isArray((step.toolParams as any)?.files)) {
          this.feedbackManager.notifyFileProcessing(
            (step.toolParams as any).files,
            step.description
          );
        }

      } catch (error) {
        const errorInfo = this.errorHandler.handleError({
          error,
          context: 'WorkflowStepExecution',
          metadata: {
            workflowId: plan.id,
            stepIndex: i,
            stepDescription: step.description,
            toolName: step.toolName
          }
        });
        
        // Verificar si hay un paso de fallback
        if (step.fallbackStep !== null && typeof step.fallbackStep === 'number') {
          log(`Using fallback step ${step.fallbackStep}` , 'info');
          
          // Notificar el uso del fallback
          this.feedbackManager.notify({
            type: 'warning',
            message: `Step failed, using fallback step ${step.fallbackStep}`,
            userNotification: {
              show: true,
              message: 'Using alternative approach due to an issue',
              type: 'warning'
            }
          });
          
          // Ajustar el índice para ejecutar el paso de fallback
          i = step.fallbackStep - 1; // -1 porque el bucle incrementará i
          continue;
        }
        
        // Si es un paso requerido y no hay fallback, falla todo el workflow
        if (step.isRequired) {
          log(`Required step failed without fallback`, 'error');
          throw error;
        } else {
          // Si el paso no es requerido, continuamos con el siguiente
          log(`Non-required step failed, continuing workflow` , 'warn');
          continue;
        }
      }
    }
    
    // Notificar finalización exitosa
    this.feedbackManager.notifyCompletion();
    
    // Devolvemos el contexto actualizado y los resultados
    return {
      context: context.get(),
      results
    };
  }
}