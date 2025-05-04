import { OrchestrationContext } from '../core/context/orchestrationContext';
import { LoggerService } from '../utils/logger';
import { EventBus } from '../core/event/eventBus';
import { ToolRegistry } from '../tools/core/toolRegistry';
import { InputAnalysis } from './inputAnalyzer';
import { ToolSelector } from './toolSelector';
import { FeedbackManager } from './feedbackManager';
import { executeModelInteraction  } from '../core/promptSystem/promptSystem';

// Interfaces centralizadas
export interface ExecutionPlan {
  id: string; // Added for workflow tracking
  taskUnderstanding: string;
  goals: string[];
  plan: PlanStep[];
  estimatedComplexity: "simple" | "moderate" | "complex"; 
  potentialChallenges: string[];
}

export interface PlanStep {
  stepNumber: number;
  description: string;
  toolName: string;
  toolParams: Record<string, any>;
  expectedOutput: string;
  isRequired: boolean;
  fallbackStep: number | null;
}

// Tipo para los planificadores específicos
interface ModulePlanner {
  createPlan(input: string, context: Record<string, any>): Promise<any>;
}

export class PlanningEngine {
  private modulePlanners: Record<string, ModulePlanner>;

  constructor(
    private orchestrationContext: OrchestrationContext,
    private logger: LoggerService,
    private eventBus: EventBus,
    private toolRegistry: ToolRegistry,
    private toolSelector: ToolSelector,
    private feedbackManager: FeedbackManager,
    modulePlanners: Record<string, ModulePlanner>
  ) {
    this.modulePlanners = modulePlanners;
    this.logger.info('PlanningEngine initialized with module planners');
  }

  public async createPlan(userInput: string, inputAnalysis: InputAnalysis): Promise<ExecutionPlan> {
    try {
      this.logProgress('Creating execution plan...');
      
      const context = this.getPlanContext(userInput, inputAnalysis);
      let executionPlan: ExecutionPlan;

      // Intentar usar planificador específico primero
      const modulePlan = await this.tryCreateModulePlan(inputAnalysis.category, userInput, context);
      
      if (modulePlan) {
        executionPlan = this.convertToExecutionPlan(modulePlan);
      } else {
        // Usar planificador genérico
        executionPlan = await this.createGenericPlan(userInput, inputAnalysis, context);
      }

      const enrichedPlan = await this.enrichPlan(executionPlan, inputAnalysis);
      this.notifyPlanCreated(enrichedPlan);
      
      return enrichedPlan;
    } catch (error) {
      this.logger.error('Error creating execution plan', { error });
      return this.createFallbackPlan(userInput, inputAnalysis);
    }
  }

  private async tryCreateModulePlan(category: string, userInput: string, context: any): Promise<any> {
    const planner = this.modulePlanners[category];
    if (!planner) return null;

    try {
      return await planner.createPlan(userInput, context);
    } catch (error) {
      this.logger.warn(`Module planner failed for category ${category}`, { error });
      return null;
    }
  }

  private async createGenericPlan(
    userInput: string,
    inputAnalysis: InputAnalysis,
    context: any
  ): Promise<ExecutionPlan> {
    const promptContext = {
      ...context,
      userInput,
      inputAnalysis,
      availableTools: this.toolRegistry.getAvailableTools()
    };

    return executeModelInteraction <ExecutionPlan>(
      'planningEngine',
      promptContext,
    );
  }

  private convertToExecutionPlan(modulePlan: any): ExecutionPlan {
    return {
      id: modulePlan.id,
      taskUnderstanding: modulePlan.objective,
      goals: [modulePlan.objective],
      plan: modulePlan.steps.map((step: any, index: number) => ({
        stepNumber: index + 1,
        description: step.description,
        toolName: step.toolName,
        toolParams: step.params,
        expectedOutput: step.resultKey ? `Resultado en ${step.resultKey}` : 'Ejecución exitosa',
        isRequired: true,
        fallbackStep: null
      })),
      estimatedComplexity: modulePlan.estimatedComplexity || 'moderate',
      potentialChallenges: []
    };
  }

  private async enrichPlan(plan: ExecutionPlan, inputAnalysis: InputAnalysis): Promise<ExecutionPlan> {
    const enrichedPlan = { ...plan };
    
    for (const [index, step] of enrichedPlan.plan.entries()) {
      this.logProgress(`Validating step ${index + 1}: ${step.description}`);
      
      if (!this.toolRegistry.getByName(step.toolName)) {
        const alternative = await this.toolSelector.selectTool(
          plan.taskUnderstanding
        );
        step.toolName = alternative.toolName;
      }
    }
    
    return enrichedPlan;
  }

  private getPlanContext(userInput: string, inputAnalysis: InputAnalysis) {
    return {
      ...this.orchestrationContext.get(),
      userInput,
      relevantContext: inputAnalysis.relevantContext
    };
  }

  private createFallbackPlan(userInput: string, inputAnalysis: InputAnalysis): ExecutionPlan {
    const toolName = this.getFallbackTool(inputAnalysis.category);
    return {
      id: 'fallback-plan',
      taskUnderstanding: `Fallback plan for: ${userInput}`,
      goals: ["Respond to user request with simplified approach"],
      plan: [{
        stepNumber: 1,
        description: `Process user request: "${userInput}"`,
        toolName,
        toolParams: { query: userInput },
        expectedOutput: "Basic response to user request",
        isRequired: true,
        fallbackStep: null
      }],
      estimatedComplexity: "simple",
      potentialChallenges: ["This is a simplified fallback plan"]
    };
  }

  private getFallbackTool(category: string): string {
    const toolsByCategory: Record<string, string> = {
      'codeExamination': 'codeExaminer',
      'codeEditing': 'codeEditor',
      'projectManagement': 'projectAnalyzer',
      'projectSearch': 'fileSearcher',
      'communication': 'communicationHandler'
    };
    
    return toolsByCategory[category] || 
           this.toolRegistry.getAvailableTools()[0]?.name || 
           'noopTool';
  }

  private logProgress(message: string) {
    this.feedbackManager.notify({
      type: 'progress',
      message,
      userNotification: { show: true, message, type: 'info' }
    });
  }

  private notifyPlanCreated(plan: ExecutionPlan) {
    this.eventBus.emit('plan:created', plan);
    this.feedbackManager.notify({
      type: 'info',
      message: `Plan created with ${plan.plan.length} steps`,
      userNotification: {
        show: true,
        message: `Plan created with ${plan.plan.length} steps`,
        type: 'info'
      }
    });
  }
}
