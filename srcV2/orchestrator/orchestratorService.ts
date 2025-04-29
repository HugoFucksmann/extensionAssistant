/**
 * Servicio Central de Orquestación
 * 
 * Responsabilidad: Coordinar el flujo de trabajo entre todos los componentes del sistema.
 * Este servicio actúa como el punto central que gestiona la ejecución de solicitudes,
 * delegando en los componentes apropiados y coordinando el flujo de información.
 */

import { EventBus } from '../core/event/eventBus';
import { SessionContext } from '../core/context/sessionContext';
import { ConfigManager } from '../core/config/configManager';
import { Logger } from '../utils/logger';
import { ErrorHandler } from '../utils/errorHandler';
import { DirectActionRouter } from './directActionRouter';
import { InputAnalyzer, InputAnalysis } from './inputAnalyzer';
import { PlanningEngine, ExecutionPlan } from './planningEngine';
import { ResultEvaluator } from './resultEvaluator';
import { ToolSelector } from './toolSelector';
import { WorkflowManager } from './workflowManager';
import { FeedbackManager } from './feedbackManager';
import { SessionManager } from './sessionManager';

/**
 * Interfaz que define el resultado de una orquestación
 */
export interface OrchestrationResult {
  success: boolean;
  executionId: string;
  steps: {
    stepId: string;
    component: string;
    status: 'success' | 'failure' | 'skipped';
    result: any;
  }[];
  finalResult: any;
  error?: {
    message: string;
    component: string;
    recoverable: boolean;
  };
}

/**
 * Servicio de orquestación principal
 */
export class OrchestratorService {
  private eventBus: EventBus;
  private sessionContext: SessionContext;
  private configManager: ConfigManager;
  private logger: Logger;
  private errorHandler: ErrorHandler;
  
  // Componentes de orquestación
  private inputAnalyzer: InputAnalyzer;
  private directActionRouter: DirectActionRouter;
  private planningEngine: PlanningEngine; 
  private resultEvaluator: ResultEvaluator;
  private toolSelector: ToolSelector;
  private workflowManager: WorkflowManager;
  private feedbackManager: FeedbackManager;
  private sessionManager: SessionManager;

  constructor(
    eventBus: EventBus,
    sessionContext: SessionContext,
    configManager: ConfigManager,
    logger: Logger,
    errorHandler: ErrorHandler,
    inputAnalyzer: InputAnalyzer,
    directActionRouter: DirectActionRouter,
    planningEngine: PlanningEngine,
    resultEvaluator: ResultEvaluator,
    toolSelector: ToolSelector,
    workflowManager: WorkflowManager,
    feedbackManager: FeedbackManager,
    sessionManager: SessionManager
  ) {
    this.eventBus = eventBus;
    this.sessionContext = sessionContext;
    this.configManager = configManager;
    this.logger = logger;
    this.errorHandler = errorHandler;
    this.inputAnalyzer = inputAnalyzer;
    this.directActionRouter = directActionRouter;
    this.planningEngine = planningEngine;
    this.resultEvaluator = resultEvaluator;
    this.toolSelector = toolSelector;
    this.workflowManager = workflowManager;
    this.feedbackManager = feedbackManager;
    this.sessionManager = sessionManager;
    
    this.initializeEventListeners();
  }

  /**
   * Inicializa los escuchadores de eventos
   */
  private initializeEventListeners(): void {
    this.eventBus.on('input:received', this.handleInput.bind(this));
    this.eventBus.on('plan:completed', this.executePlan.bind(this));
    this.eventBus.on('execution:completed', this.evaluateResult.bind(this));
    this.eventBus.on('error:occurred', this.handleError.bind(this));
  }

  /**
   * Maneja una entrada del usuario
   * @param input La entrada del usuario
   * @returns Promesa que resuelve al resultado de la orquestación
   */
  public async handleInput(input: string): Promise<OrchestrationResult> {
    try {
      this.logger.info('OrchestratorService: Handling input', { input });
      
      // Crear un ID de ejecución único
      const executionId = this.generateExecutionId();
      
      // Actualizar el contexto de la sesión
      this.sessionManager.updateSession({
        lastInput: input,
        timestamp: Date.now()
      });
      
      // Analizar la entrada
      const inputAnalysis = await this.inputAnalyzer.analyzeInput(input);
      
      // Crear el resultado de orquestación inicial
      const orchestrationResult: OrchestrationResult = {
        success: false,
        executionId,
        steps: [{
          stepId: 'input-analysis',
          component: 'InputAnalyzer',
          status: 'success',
          result: inputAnalysis
        }],
        finalResult: null
      };
      
      // Decidir si se necesita planificación completa o una acción directa
      if (!inputAnalysis.needsFullPlanning && inputAnalysis.directAction) {
        // Ejecutar acción directa
        const actionResult = await this.directActionRouter.executeAction(
          inputAnalysis.directAction.tool,
          inputAnalysis.directAction.params
        );
        
        orchestrationResult.steps.push({
          stepId: 'direct-action',
          component: 'DirectActionRouter',
          status: actionResult.success ? 'success' : 'failure',
          result: actionResult
        });
        
        orchestrationResult.success = actionResult.success;
        orchestrationResult.finalResult = actionResult.result;
        
        if (!actionResult.success) {
          orchestrationResult.error = {
            message: actionResult.error || 'Unknown error in direct action',
            component: 'DirectActionRouter',
            recoverable: false
          };
        }
      } else {
        // Necesita planificación completa
        const executionPlan = await this.planningEngine.createPlan(input, inputAnalysis);
        
        orchestrationResult.steps.push({
          stepId: 'planning',
          component: 'PlanningEngine',
          status: 'success',
          result: executionPlan
        });
        
        // Ejecutar el plan a través del WorkflowManager
        const workflowResult = await this.workflowManager.executeWorkflow(executionPlan);
        
        orchestrationResult.steps.push({
          stepId: 'workflow-execution',
          component: 'WorkflowManager',
          status: workflowResult.status === 'completed' ? 'success' : 'failure',
          result: workflowResult
        });
        
        // Evaluar el resultado final
        const evaluation = await this.resultEvaluator.evaluateResult(
          workflowResult,
          executionPlan,
          input
        );
        
        orchestrationResult.steps.push({
          stepId: 'result-evaluation',
          component: 'ResultEvaluator',
          status: 'success',
          result: evaluation
        });
        
        orchestrationResult.success = evaluation.success;
        orchestrationResult.finalResult = workflowResult.results;
        
        if (!evaluation.success) {
          orchestrationResult.error = {
            message: 'Execution did not fully satisfy the requirements',
            component: 'ResultEvaluator',
            recoverable: true
          };
        }
      }
      
      // Emitir evento de finalización
      this.eventBus.emit('orchestration:completed', orchestrationResult);
      
      return orchestrationResult;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Ejecuta un plan de ejecución
   * @param plan El plan a ejecutar
   */
  private async executePlan(plan: ExecutionPlan): Promise<void> {
    try {
      await this.workflowManager.executeWorkflow(plan);
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Evalúa el resultado de una ejecución
   * @param result El resultado a evaluar
   * @param plan El plan de ejecución
   * @param originalInput La entrada original
   */
  private async evaluateResult(result: any, plan: ExecutionPlan, originalInput: string): Promise<void> {
    try {
      await this.resultEvaluator.evaluateResult(result, plan, originalInput);
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Maneja un error durante la orquestación
   * @param error El error ocurrido
   * @returns Un resultado de orquestación con el error
   */
  private handleError(error: any): OrchestrationResult {
    const errorInfo = this.errorHandler.handleError(error);
    this.logger.error('OrchestratorService: Error during orchestration', { error: errorInfo });
    
    // Intentar recuperarse del error si es posible
    this.feedbackManager.handleFeedback({
      errorHandled: false,
      severity: 'error',
      message: errorInfo.message,
      source: errorInfo.source || 'OrchestratorService',
      userNotification: {
        show: true,
        message: 'An error occurred while processing your request',
        type: 'error'
      }
    });
    
    return {
      success: false,
      executionId: this.generateExecutionId(),
      steps: [],
      finalResult: null,
      error: {
        message: errorInfo.message,
        component: errorInfo.source || 'OrchestratorService',
        recoverable: errorInfo.recoverable || false
      }
    };
  }

  /**
   * Genera un ID de ejecución único
   * @returns Un ID de ejecución único
   */
  private generateExecutionId(): string {
    return `exec-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }
}