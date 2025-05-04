import { LoggerService } from '../utils/logger';
import { ErrorHandler } from '../utils/errorHandler';
import { ExecutionPlan } from './planningEngine';
import { ToolSelector } from './toolSelector';
import { ToolRegistry } from '../tools/core/toolRegistry';
import { OrchestrationContext } from '../core/context/orchestrationContext';
import { FeedbackManager } from './feedbackManager';

// Importar módulos
import { EditingModule } from '../modules/codeEditing/editingModule';
import { ExaminationModule } from '../modules/codeExamination/examinationModule';
import { ProjectModule } from '../modules/projectManagement/projectModule';
import { ProjectSearchModule } from '../modules/projectSearch/projectSearchModule';

export class WorkflowManager {

  
  // Módulos especializados
  private editingModule: EditingModule;
  private examinationModule: ExaminationModule;
  private projectModule: ProjectModule;
  private projectSearchModule: ProjectSearchModule;

  constructor(
    logger: LoggerService,
    private errorHandler: ErrorHandler,
    private toolSelector: ToolSelector,
    private toolRegistry: ToolRegistry,
    private feedbackManager: FeedbackManager
  ) {
  
    
    // Inicializar módulos sin BaseAPI
    this.editingModule = new EditingModule(toolRegistry, logger);
    this.examinationModule = new ExaminationModule(toolRegistry, logger);
    this.projectModule = new ProjectModule(toolRegistry, logger);
    this.projectSearchModule = new ProjectSearchModule(toolRegistry, logger);
    
  
  }

  public async startWorkflow(plan: ExecutionPlan, context: OrchestrationContext): Promise<any> {
   
    
    // Verificar si existe la propiedad metadata
    if (plan.hasOwnProperty('metadata')) {
   
      
      const category = (plan as any).metadata.category;
      if (category) {
       
        
        try {
          const result = await this.executeSpecializedPlan(category, plan, context);
          
          return result;
        } catch (error) {
          this.errorHandler.handleError({
            error,
            context: 'SpecializedWorkflowExecution',
            metadata: { 
              workflowId: plan.id,
              category
            }
          });
          
          // Fallback a ejecución genérica
          return this.executeGenericPlan(plan, context);
        }
      }
    }
    
    // Ejecución genérica
    return this.executeGenericPlan(plan, context);
  }
  
  private async executeSpecializedPlan(
    category: string, 
    plan: ExecutionPlan, 
    context: OrchestrationContext
  ): Promise<any> {
    switch (category) {
      case 'codeEditing':
        return this.editingModule.executeEditingPlan(plan, context);
      case 'codeExamination':
        return this.examinationModule.executeExaminationPlan(plan, context);
      case 'projectManagement':
        return this.projectModule.executeProjectPlan(plan, context);
      case 'projectSearch':
        return this.projectSearchModule.executeSearchPlan(plan, context);
      default:
        throw new Error(`Categoría de módulo no soportada: ${category}`);
    }
  }

  private async executeGenericPlan(plan: ExecutionPlan, context: OrchestrationContext): Promise<any> {
    
    
    for (let i = 0; i < plan.plan.length; i++) {
      const step = plan.plan[i];
     

      // Notificar progreso
      this.feedbackManager.notifyProgress(
        `${plan.id}-${i}`, // Use plan id + step index as unique identifier
        `Processing step ${i + 1}/${plan.plan.length}: ${step.description}`,
        ((i + 1) / plan.plan.length) * 100
      );

      try {
        const tool = this.toolRegistry.getByName(step.toolName);
        if (!tool) {
          throw new Error(`Herramienta no encontrada: ${step.toolName}`);
        }
        
        if (!tool.validateParams(step.toolParams)) {
          throw new Error(`Parámetros inválidos para: ${step.toolName}`);
        }

        const startTime = Date.now();
        const result = await tool.execute(step.toolParams);
        const duration = Date.now() - startTime;
        
       

        // Actualizar contexto
        const ctxData = context.get();
        const prevSteps = Array.isArray(ctxData.executedSteps) ? ctxData.executedSteps : [];
        context.set({ executedSteps: [...prevSteps, { step, result }] });

        // Notificar archivos si es necesario
        if (Array.isArray((step.toolParams as any)?.files)) {
          this.feedbackManager.notifyFileProcessing(
            (step.toolParams as any).files,
            step.description
          );
        }

      } catch (error) {
        this.errorHandler.handleError({
          error,
          context: 'WorkflowStepExecution',
          metadata: {
            workflowId: plan.id,
            stepIndex: i,
            stepDescription: step.description,
            toolName: step.toolName
          }
        });
        
        throw error; // Propagamos el error para manejo superior
      }
    }
    
    
    this.feedbackManager.notifyCompletion();
    return context;
  }
}
