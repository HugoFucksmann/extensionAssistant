import { OrchestrationContext } from '../core/context/orchestrationContext';
import { LoggerService } from '../utils/logger';
import { ExecutionPlan } from './planningEngine';
import { executeModelInteraction } from '../core/promptSystem/promptSystem';

export interface ResultEvaluation {
  success: boolean;
  confidence: number;
  missingRequirements?: string[];
  suggestions?: {
    action: string;
    tool?: string;
    reason: string;
  }[];
}

export class ResultEvaluator {
  constructor(
    private orchestrationContext: OrchestrationContext,
    private logger: LoggerService,
  ) {}

  public async evaluateResult(
    workflowResult: any,
    executionPlan: ExecutionPlan,
    originalInput: string
  ): Promise<ResultEvaluation> {
    try {
      const context = {
        ...this.orchestrationContext.get(),
        workflowResult,
        executionPlan,
        originalInput
      };

      return await executeModelInteraction<ResultEvaluation>(
        'resultEvaluator',
        context,
      );
    } catch (error) {
      this.logger.error('[ResultEvaluator] Error evaluating result:', {error});
      return {
        success: false,
        confidence: 0,
        missingRequirements: ['Error during evaluation'],
        suggestions: [{
          action: 'Retry evaluation',
          reason: 'The evaluation process failed'
        }]
      };
    }
  }
}
