import { EventBus } from '../core/event/eventBus';
import { OrchestrationContext } from '../core/context/orchestrationContext';
import { ConfigurationManager } from '../core/config/ConfigurationManager';
import { log } from '../utils/logger';
import { ErrorHandler } from '../utils/errorHandler';
import { DirectActionRouter } from './directActionRouter';
import { InputAnalyzer, InputAnalysis } from './inputAnalyzer';
import { PlanningEngine, ExecutionPlan } from './planningEngine';
// import { ResultEvaluator } from './resultEvaluator'; // Temporalmente comentado para pruebas
import { ToolSelector } from './toolSelector';
import { WorkflowManager } from './workflowManager';
import { FeedbackManager } from './feedbackManager';
import { ModuleManager } from '../modules/moduleManager'; // Added missing dependency
import * as vscode from 'vscode';
import { ToolRegistry } from '../tools/core/toolRegistry';

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
  };
}

export interface OrchestratorCreateOptions {
  eventBus: EventBus;

  errorHandler: ErrorHandler;
  configurationManager: ConfigurationManager;
  context: vscode.ExtensionContext;
}

export class OrchestratorService {
  private eventBus: EventBus;
  private orchestrationContext: OrchestrationContext;
  private configurationManager: ConfigurationManager;

  private errorHandler: ErrorHandler;
  private inputAnalyzer: InputAnalyzer;
  private directActionRouter: DirectActionRouter;
  private planningEngine: PlanningEngine;
  // private resultEvaluator: ResultEvaluator; // Temporalmente comentado para pruebas
  private toolSelector: ToolSelector;
  private workflowManager: WorkflowManager;
  private feedbackManager: FeedbackManager;
  private disposed: boolean = false;

  /**
   * Método estático para crear una instancia de OrchestratorService
   * Compatible con el patrón usado en extensionHandler.ts
   */
  public static async create(options: OrchestratorCreateOptions): Promise<OrchestratorService> {
    const { eventBus,  errorHandler, configurationManager, context } = options;
    
    // Crear o obtener instancias de componentes necesarios
    const orchestrationContext = new OrchestrationContext();
    const toolRegistry = new ToolRegistry();
    
    // Inicializar componentes del orquestador
    const inputAnalyzer = new InputAnalyzer(
      orchestrationContext,

    );

    const directActionRouter = new DirectActionRouter(
    
      errorHandler,
      eventBus,
      toolRegistry,
      orchestrationContext
    );

    const feedbackManager = new FeedbackManager(
      errorHandler,
      eventBus,
      context
    );

    const moduleManager = new ModuleManager(

      toolRegistry,
      eventBus,
      errorHandler
    );

    const toolSelector = new ToolSelector(
      orchestrationContext,
      toolRegistry,
 
     
    );

    const workflowManager = new WorkflowManager(

      errorHandler,
      toolSelector,
      toolRegistry,
      feedbackManager,
      moduleManager
    );

    const planningEngine = new PlanningEngine(
      orchestrationContext,
  
      eventBus,
      toolRegistry,
      toolSelector,
      feedbackManager,
      moduleManager
    );

    // Crear y retornar la instancia de OrchestratorService
    return new OrchestratorService(
      eventBus,
      orchestrationContext,
      configurationManager,
   
      errorHandler,
      inputAnalyzer,
      directActionRouter,
      planningEngine,
      toolSelector,
      workflowManager,
      feedbackManager
    );
  }

  constructor(
    eventBus: EventBus,
    orchestrationContext: OrchestrationContext,
    configurationManager: ConfigurationManager,
  
    errorHandler: ErrorHandler,
    inputAnalyzer: InputAnalyzer,
    directActionRouter: DirectActionRouter,
    planningEngine: PlanningEngine,
    // resultEvaluator: ResultEvaluator, // Temporalmente comentado para pruebas
    toolSelector: ToolSelector,
    workflowManager: WorkflowManager,
    feedbackManager: FeedbackManager
  ) {
    this.eventBus = eventBus;
    this.orchestrationContext = orchestrationContext;
    this.configurationManager = configurationManager;
  
    this.errorHandler = errorHandler;
    this.inputAnalyzer = inputAnalyzer;
    this.directActionRouter = directActionRouter;
    this.planningEngine = planningEngine;
    // this.resultEvaluator = resultEvaluator; // Temporalmente comentado para pruebas
    this.toolSelector = toolSelector;
    this.workflowManager = workflowManager;
    this.feedbackManager = feedbackManager;
    
    log('OrchestratorService inicializado sin ResultEvaluator (modo prueba)', 'info');
  }

/**
 * Orquesta una solicitud completa de usuario
 * Simplificado para siempre iniciar con InputAnalyzer
 * @param input La entrada del usuario
 * @returns Promesa que resuelve al resultado de la orquestación
 */
public async orchestrateRequest(input: string): Promise<OrchestrationResult> {
  if (this.disposed) {
    throw new Error('OrchestratorService has been disposed');
  }

  try {
    console.log(`[OrchestratorService] Iniciando orquestación para entrada: "${input.substring(0, 100)}${input.length > 100 ? '...' : ''}"`);
    log('OrchestratorService: Handling input ${ input }', 'info');

    const executionId = this.generateExecutionId();
    console.log(`[OrchestratorService] ID de ejecución generado: ${executionId}`);

    console.log(`[OrchestratorService] Actualizando contexto de orquestación...`);
    this.orchestrationContext.set({
      lastInput: input,
      originalRequest: input,
      timestamp: Date.now()
    });

    // SIEMPRE empezamos con InputAnalyzer como primer paso
    console.log(`[OrchestratorService] Analizando entrada con InputAnalyzer...`);
    const startAnalysis = Date.now();
    const inputAnalysis = await this.inputAnalyzer.analyzeInput(input);
    const endAnalysis = Date.now();
    console.log(`[OrchestratorService] Análisis completado en ${endAnalysis - startAnalysis}ms`);
    console.log(`[OrchestratorService] Resultado del análisis: needsFullPlanning=${inputAnalysis.needsFullPlanning}, category=${inputAnalysis.category}, confidence=${inputAnalysis.confidence}`);

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

    if (!inputAnalysis.needsFullPlanning && inputAnalysis.directAction) {
      // Acción directa basada en análisis
      console.log(`[OrchestratorService] Ejecutando acción directa: ${inputAnalysis.directAction.tool}`);
      console.log(`[OrchestratorService] Parámetros: ${JSON.stringify(inputAnalysis.directAction.params).substring(0, 200)}${JSON.stringify(inputAnalysis.directAction.params).length > 200 ? '...' : ''}`);
      
      const startAction = Date.now();
      const actionResult = await this.directActionRouter.executeAction(
        inputAnalysis.directAction.tool,
        inputAnalysis.directAction.params
      );
      const endAction = Date.now();
      
      console.log(`[OrchestratorService] Acción directa completada en ${endAction - startAction}ms`);
      console.log(`[OrchestratorService] Resultado: ${actionResult.success ? 'ÉXITO' : 'FALLO'}, ${JSON.stringify(actionResult.result).substring(0, 200)}${JSON.stringify(actionResult.result).length > 200 ? '...' : ''}`);

      orchestrationResult.steps.push({
        stepId: 'direct-action',
        component: 'DirectActionRouter',
        status: actionResult.success ? 'success' : 'failure',
        result: actionResult
      });

      orchestrationResult.success = actionResult.success;
      orchestrationResult.finalResult = actionResult.result;

      if (!actionResult.success) {
        console.error(`[OrchestratorService] ERROR en acción directa: ${actionResult.error || 'Error desconocido'}`);
        orchestrationResult.error = {
          message: actionResult.error || 'Unknown error in direct action',
          component: 'DirectActionRouter',
        };
      }
    } else {
      // Planificación y ejecución de workflow
      console.log(`[OrchestratorService] Se requiere planificación completa, creando plan de ejecución...`);
      const startPlanning = Date.now();
      const executionPlan = await this.planningEngine.createPlan(input, inputAnalysis);
      const endPlanning = Date.now();
      console.log(`[OrchestratorService] Plan de ejecución creado en ${endPlanning - startPlanning}ms`);
      console.log(`[OrchestratorService] Plan contiene ${executionPlan.plan.length} pasos`);

      orchestrationResult.steps.push({
        stepId: 'planning',
        component: 'PlanningEngine',
        status: 'success',
        result: executionPlan
      });

      console.log(`[OrchestratorService] Iniciando ejecución del workflow...`);
      const startWorkflow = Date.now();
      const workflowResult = await this.workflowManager.startWorkflow(executionPlan, this.orchestrationContext);
      const endWorkflow = Date.now();
      console.log(`[OrchestratorService] Workflow completado en ${endWorkflow - startWorkflow}ms`);
      console.log(`[OrchestratorService] Resultado del workflow: ${JSON.stringify(workflowResult).substring(0, 200)}${JSON.stringify(workflowResult).length > 200 ? '...' : ''}`);

      orchestrationResult.steps.push({
        stepId: 'workflow-execution',
        component: 'WorkflowManager',
        status: 'success',
        result: workflowResult
      });

      // Modo prueba: asumimos éxito siempre
      console.log(`[OrchestratorService] Asumiendo éxito en modo prueba`);
      orchestrationResult.success = true;
      orchestrationResult.finalResult = workflowResult;
      
      orchestrationResult.steps.push({
        stepId: 'result-evaluation',
        component: 'TestMode',
        status: 'success',
        result: { success: true, message: 'Evaluación omitida en modo prueba' }
      });
    }

    console.log(`[OrchestratorService] Orquestación completada con ${orchestrationResult.success ? 'ÉXITO' : 'FALLO'}`);
    console.log(`[OrchestratorService] Pasos ejecutados: ${orchestrationResult.steps.length}`);
    console.log(`[OrchestratorService] Emitiendo evento 'orchestration:completed'`);
    this.eventBus.emit('orchestration:completed', orchestrationResult);

    return orchestrationResult;
  } catch (error) {
    console.error(`[OrchestratorService] ERROR durante la orquestación: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    return this.handleError(error);
  }
}

  private handleError(error: any): OrchestrationResult {
    console.log(`[OrchestratorService] Manejando error en orquestación...`);
    const errorInfo = this.errorHandler.handleError(error);
    console.log(`[OrchestratorService] Error procesado: ${errorInfo.message}`);
    console.log(`[OrchestratorService] Componente origen: ${errorInfo.source || 'OrchestratorService'}`);
    
    log('OrchestratorService: Error during orchestration { error: errorInfo }','error' );

    console.log(`[OrchestratorService] Notificando error a través de FeedbackManager...`);
    this.feedbackManager.notify({
      type: 'error',
      message: errorInfo.message,
      source: errorInfo.source || 'OrchestratorService',
      userNotification: {
        show: true,
        message: 'An error occurred while processing your request',
        type: 'error'
      }
    });

    const executionId = this.generateExecutionId();
    console.log(`[OrchestratorService] Generando resultado de error con ID: ${executionId}`);
    
    return {
      success: false,
      executionId,
      steps: [],
      finalResult: null,
      error: {
        message: errorInfo.message,
        component: errorInfo.source || 'OrchestratorService'
      }
    };
  }

  private generateExecutionId(): string {
    return `exec-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }

  /**
   * Libera los recursos utilizados por el orquestador
   * Este método es necesario para compatibilidad con ExtensionHandler.dispose()
   */
  public dispose(): void {
    if (this.disposed) {
      return;
    }

    console.log('[OrchestratorService] Disposing resources...');
    log('OrchestratorService: Disposing resources','info');
    
    // Limpiar listeners de eventos
    // (aquí podrías desregistrar listeners si los hubieras registrado)
    
    // Marcar como dispuesto
    this.disposed = true;
    
    console.log('[OrchestratorService] Resources disposed');
  }
}
