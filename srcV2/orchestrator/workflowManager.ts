// src/services/workflowManager.ts

/**
 * Gestor de Flujos de Trabajo
 * * Responsabilidad: Gestionar la ejecución de flujos de trabajo complejos,
 * típicamente basados en un ExecutionPlan. Controla el avance paso a paso,
 * maneja dependencias entre pasos, y gestiona el estado general del flujo.
 */

import { Logger } from '../utils/logger';
import { ErrorHandler } from '../utils/errorHandler';
import { EventBus } from '../core/event/eventBus';
import { ExecutionPlan } from './planningEngine';
import { ToolSelector, ToolSelection } from './toolSelector'; // Puede necesitar re-seleccionar herramienta si un paso falla
import { ToolRegistry } from '../tools/core/toolRegistry';
import { ResultEvaluator, ResultEvaluation } from './resultEvaluator';
import { SessionContext } from '../core/context/sessionContext'; // Para actualizar contexto entre pasos

/**
 * Interfaz que define el estado de un flujo de trabajo
 */
export interface WorkflowStatus {
  workflowId: string; // Identificador único para esta ejecución del flujo
  status: 'running' | 'completed' | 'failed' | 'paused';
  currentStep: number; // Número del paso actual (o el siguiente a ejecutar)
  totalSteps: number;
  completedSteps: number[]; // Números de los pasos completados exitosamente
  failedSteps: number[];   // Números de los pasos que fallaron
  results: { // Almacena resultados de cada paso completado
    [stepNumber: number]: any; 
  };
  startTime: number; // Timestamp de inicio
  endTime?: number; // Timestamp de fin (si aplica)
  estimatedTimeRemaining?: number; // Estimación (opcional)
}

/**
 * Clase para gestionar la ejecución de flujos de trabajo
 */
export class WorkflowManager {
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private eventBus: EventBus;
  private toolSelector: ToolSelector;
  private toolRegistry: ToolRegistry;
  private resultEvaluator: ResultEvaluator;
  private sessionContext: SessionContext;

  // Podría mantener un registro de flujos activos si maneja múltiples simultáneamente
  private activeWorkflows: Map<string, WorkflowStatus> = new Map(); 
  // Necesitará acceso a las herramientas para ejecutarlas
  // private toolExecutor: ToolExecutor; // Una abstracción para ejecutar herramientas? O usa ToolRegistry directamente?

  constructor(
    logger: Logger,
    errorHandler: ErrorHandler,
    eventBus: EventBus,
    toolSelector: ToolSelector,
    toolRegistry: ToolRegistry,
    resultEvaluator: ResultEvaluator,
    sessionContext: SessionContext
    // toolExecutor: ToolExecutor // Si se crea una clase específica para ejecutar
  ) {
    this.logger = logger;
    this.errorHandler = errorHandler;
    this.eventBus = eventBus;
    this.toolSelector = toolSelector;
    this.toolRegistry = toolRegistry;
    this.resultEvaluator = resultEvaluator;
    this.sessionContext = sessionContext;
    // this.toolExecutor = toolExecutor;
  }

  /**
   * Inicia la ejecución de un nuevo flujo de trabajo basado en un plan.
   * @param plan El ExecutionPlan a ejecutar.
   * @returns Una promesa que resuelve al estado inicial del flujo de trabajo.
   */
  public async startWorkflow(plan: ExecutionPlan): Promise<WorkflowStatus> {
    const workflowId = `wf-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const initialStatus: WorkflowStatus = {
      workflowId: workflowId,
      status: 'running',
      currentStep: 1, // Empezar por el primer paso
      totalSteps: plan.plan.length,
      completedSteps: [],
      failedSteps: [],
      results: {},
      startTime: Date.now(),
    };
    this.activeWorkflows.set(workflowId, initialStatus);
    this.logger.info('WorkflowManager: Starting workflow', { workflowId, totalSteps: plan.plan.length });
    
    // Iniciar la ejecución del primer paso (puede ser asíncrono y no bloquear)
    this.executeNextStep(workflowId, plan); 

    this.eventBus.emit('workflow:started', initialStatus);
    return initialStatus;
  }

  /**
   * Ejecuta el siguiente paso del flujo de trabajo especificado.
   * Esta función es probablemente el núcleo de la lógica del gestor.
   * @param workflowId El ID del flujo de trabajo.
   * @param plan El plan asociado al flujo.
   */
  private async executeNextStep(workflowId: string, plan: ExecutionPlan): Promise<void> {
    const status = this.activeWorkflows.get(workflowId);
    if (!status || status.status !== 'running') {
      this.logger.warn('WorkflowManager: Attempted to execute step on non-running workflow', { workflowId });
      return;
    }

    const stepIndex = status.currentStep - 1; // Índice basado en 0
    if (stepIndex >= plan.plan.length) {
        // Todos los pasos completados
        status.status = 'completed';
        status.endTime = Date.now();
        this.logger.info('WorkflowManager: Workflow completed', { workflowId });
        this.eventBus.emit('workflow:completed', status);
        this.activeWorkflows.delete(workflowId); // O mantenerlo para historial
        return;
    }

    const currentStepDetails = plan.plan[stepIndex];
    this.logger.info('WorkflowManager: Executing step', { workflowId, step: status.currentStep, description: currentStepDetails.description });
    this.eventBus.emit('workflow:step:started', { workflowId, stepNumber: status.currentStep, description: currentStepDetails.description });

    try {
        // 1. Obtener la herramienta
        const tool = this.toolRegistry.getByName(currentStepDetails.toolName);
        if (!tool) {
            throw new Error(`Tool not found: ${currentStepDetails.toolName}`);
        }

        // 2. Validar parámetros (idealmente ya hecho en planificación, pero doble check)
        if (!tool.validateParams(currentStepDetails.toolParams)) {
             throw new Error(`Invalid parameters for tool ${currentStepDetails.toolName} in step ${status.currentStep}`);
        }
        
        // 3. Ejecutar la herramienta
        // Aquí se necesitaría el contexto actual (posiblemente de sessionContext o pasado explícitamente)
        // const currentToolContext = this.sessionContext.getToolExecutionContext(); // Necesita definir esta obtención
        const stepResult = await tool.execute(currentStepDetails.toolParams /*, currentToolContext */);

        // 4. Evaluar el resultado del paso
        const evaluation: ResultEvaluation = await this.resultEvaluator.evaluateResult(
            currentStepDetails,
            stepResult,
            currentStepDetails.expectedOutput,
            plan
        );

        // 5. Actualizar estado basado en la evaluación
        if (evaluation.success && evaluation.completionLevel !== 'partial') { // O definir qué es "éxito"
            status.results[status.currentStep] = stepResult; // Guardar resultado
            status.completedSteps.push(status.currentStep);
            // Actualizar contexto de sesión con el resultado del paso
            this.sessionContext.updateContext({ [`step_${status.currentStep}_result`]: stepResult }); 
            
            this.logger.info('WorkflowManager: Step completed successfully', { workflowId, step: status.currentStep });
            this.eventBus.emit('workflow:step:completed', { workflowId, stepNumber: status.currentStep, result: stepResult, evaluation });
            
            status.currentStep++; // Avanzar al siguiente paso
            // Llamada recursiva o bucle para el siguiente paso
            this.executeNextStep(workflowId, plan); 

        } else {
            // El paso falló o está incompleto
            this.logger.warn('WorkflowManager: Step failed or incomplete', { workflowId, step: status.currentStep, evaluation });
            status.failedSteps.push(status.currentStep);
            this.eventBus.emit('workflow:step:failed', { workflowId, stepNumber: status.currentStep, result: stepResult, evaluation });

            // Lógica de manejo de fallos:
            // - ¿Hay un fallbackStep definido? Ir a ese paso.
            // - ¿Se requiere intervención del usuario (evaluation.requiresUserInput)? Pausar.
            // - ¿Es un paso no requerido (currentStepDetails.isRequired === false)? Continuar.
            // - ¿Fallar todo el workflow?

            if (currentStepDetails.fallbackStep !== null) {
                status.currentStep = currentStepDetails.fallbackStep;
                this.logger.info('WorkflowManager: Moving to fallback step', { workflowId, step: status.currentStep });
                this.executeNextStep(workflowId, plan);
            } else if (evaluation.requiresUserInput) {
                status.status = 'paused';
                this.logger.warn('WorkflowManager: Workflow paused, user input required', { workflowId });
                this.eventBus.emit('workflow:paused', status);
                // Aquí se necesitaría un mecanismo para reanudar el flujo
            } else if (!currentStepDetails.isRequired) {
                 this.logger.warn('WorkflowManager: Optional step failed, continuing', { workflowId, step: status.currentStep });
                 status.currentStep++; 
                 this.executeNextStep(workflowId, plan);
            } else {
                // Paso requerido falló sin fallback ni input -> Fallar workflow
                status.status = 'failed';
                status.endTime = Date.now();
                this.logger.error('WorkflowManager: Workflow failed', { workflowId, failedStep: status.currentStep });
                this.eventBus.emit('workflow:failed', status);
                this.activeWorkflows.delete(workflowId); // O mantener
            }
        }

    } catch (error: any) {
        // Error durante la ejecución del paso (ej. herramienta no encontrada, error interno)
        this.logger.error('WorkflowManager: Critical error during step execution', { workflowId, step: status.currentStep, error });
        const errorInfo = this.errorHandler.handleError(error);
        status.failedSteps.push(status.currentStep);
        status.status = 'failed';
        status.endTime = Date.now();
        this.eventBus.emit('workflow:step:failed', { workflowId, stepNumber: status.currentStep, error: errorInfo });
        this.eventBus.emit('workflow:failed', status);
        this.activeWorkflows.delete(workflowId); // O mantener
    }
  }

  // Métodos adicionales podrían ser: pauseWorkflow, resumeWorkflow, cancelWorkflow, getWorkflowStatus
}