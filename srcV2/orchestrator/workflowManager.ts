import { Logger } from '../utils/logger';
import { ErrorHandler } from '../utils/errorHandler';
import { ExecutionPlan } from './planningEngine';
import { ToolSelector } from './toolSelector';
import { ToolRegistry } from '../tools/core/toolRegistry';
// import { ResultEvaluator } from './resultEvaluator'; // Temporalmente comentado para pruebas
import { OrchestrationContext } from '../core/context/orchestrationContext';
import { FeedbackManager } from './feedbackManager';

// Importar módulos
import { EditingModule } from '../modules/codeEditing/editingModule';
import { ExaminationModule } from '../modules/codeExamination/examinationModule';
import { ProjectModule } from '../modules/projectManagement/projectModule';
import { ProjectSearchModule } from '../modules/projectSearch/projectSearchModule';
import { CommunicationModule } from '../modules/communication/communicationModule';
import { BaseAPI } from '../models/baseAPI';

export class WorkflowManager {
  // Módulos especializados
  private editingModule: EditingModule;
  private examinationModule: ExaminationModule;
  private projectModule: ProjectModule;
  private projectSearchModule: ProjectSearchModule;
  private communicationModule: CommunicationModule;

  constructor(
    private logger: Logger,
    private errorHandler: ErrorHandler,
    private toolSelector: ToolSelector,
    private toolRegistry: ToolRegistry,
    // private resultEvaluator: ResultEvaluator, // Temporalmente comentado para pruebas
    private feedbackManager: FeedbackManager,
    private modelApi: BaseAPI
  ) {
    // Inicializar módulos
    this.editingModule = new EditingModule(toolRegistry, logger, modelApi);
    this.examinationModule = new ExaminationModule(toolRegistry, logger, modelApi);
    this.projectModule = new ProjectModule(toolRegistry, logger, modelApi);
    this.projectSearchModule = new ProjectSearchModule(toolRegistry, logger, modelApi);
    this.communicationModule = new CommunicationModule(logger, modelApi);
    
    this.logger.info('WorkflowManager inicializado con módulos especializados');
  }

  public async startWorkflow(plan: ExecutionPlan, context: OrchestrationContext): Promise<any> {
    console.log(`[WorkflowManager] Iniciando ejecución de workflow con ${plan.plan.length} pasos`);
    
    // Verificar si existe la propiedad metadata antes de intentar acceder a ella
    if (plan.hasOwnProperty('metadata')) {
      console.log(`[WorkflowManager] Plan de ejecución: ${JSON.stringify((plan as any).metadata)}`);
      
      // Si el plan tiene una categoría, usar el módulo correspondiente
      const category = (plan as any).metadata.category;
      if (category) {
        console.log(`[WorkflowManager] Usando módulo especializado para categoría: ${category}`);
        
        try {
          let moduleResult;
          
          switch (category) {
            case 'codeEditing':
              console.log(`[WorkflowManager] Delegando ejecución a EditingModule`);
              moduleResult = await this.editingModule.executeEditingPlan(plan, context);
              break;
              
            case 'codeExamination':
              console.log(`[WorkflowManager] Delegando ejecución a ExaminationModule`);
              moduleResult = await this.examinationModule.executeExaminationPlan(plan, context);
              break;
              
            case 'projectManagement':
              console.log(`[WorkflowManager] Delegando ejecución a ProjectModule`);
              moduleResult = await this.projectModule.executeProjectPlan(plan, context);
              break;
              
            case 'projectSearch':
              console.log(`[WorkflowManager] Delegando ejecución a ProjectSearchModule`);
              moduleResult = await this.projectSearchModule.executeSearchPlan(plan, context);
              break;
              
            case 'communication':
              // Para comunicación, no ejecutamos un plan sino que generamos una respuesta directamente
              console.log(`[WorkflowManager] Delegando ejecución a CommunicationModule`);
              // Aquí deberíamos obtener la solicitud original y los resultados de acciones previas
              const originalRequest = context.get().originalRequest || '';
              const actionResults = context.get().executedSteps || [];
              moduleResult = await this.communicationModule.generateResponse(originalRequest, actionResults, context);
              break;
              
            default:
              console.log(`[WorkflowManager] No hay módulo específico para categoría: ${category}, ejecutando plan genérico`);
              // Continuar con la ejecución genérica
              return await this.executeGenericPlan(plan, context);
          }
          
          // Guardar el resultado en el contexto
          context.set({ moduleResult });
          
          // Notificar sobre la finalización del workflow
          this.feedbackManager.notify({
            type: 'info',
            message: 'Workflow finalizado con éxito',
            userNotification: {
              show: true,
              message: 'Tarea completada con éxito',
              type: 'info'
            }
          });
          
          return { ...context.get(), moduleResult };
        } catch (error) {
          console.error(`[WorkflowManager] Error en módulo especializado: ${error instanceof Error ? error.message : 'Error desconocido'}`);
          this.feedbackManager.notify({
            type: 'error',
            message: `Error en la ejecución del módulo: ${error instanceof Error ? error.message : 'Error desconocido'}`,
            userNotification: {
              show: true,
              message: 'Error al procesar la solicitud',
              type: 'error'
            }
          });
          
          // En caso de error, intentar con la ejecución genérica
          return await this.executeGenericPlan(plan, context);
        }
      }
    } else {
      console.log(`[WorkflowManager] Plan de ejecución sin metadatos, ejecutando plan genérico`);
    }
    
    // Si llegamos aquí, ejecutar el plan genérico
    return await this.executeGenericPlan(plan, context);
  }

  /**
   * Ejecuta un plan genérico paso a paso
   * @param plan Plan de ejecución
   * @param context Contexto de orquestación
   * @returns Contexto actualizado
   */
  private async executeGenericPlan(plan: ExecutionPlan, context: OrchestrationContext): Promise<any> {
    console.log(`[WorkflowManager] Ejecutando plan genérico con ${plan.plan.length} pasos`);
    
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