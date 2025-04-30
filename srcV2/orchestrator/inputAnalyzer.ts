import { OrchestrationContext } from '../core/context/orchestrationContext';
import { Logger } from '../utils/logger';
import { EventBus } from '../core/event/eventBus';
import { BaseAPI } from '../models/baseAPI';
import { runPrompt } from '../core/promptSystem/promptSystem';

export interface InputAnalysis {
  needsFullPlanning: boolean;
  category: "codeExamination" | "codeEditing" | "projectManagement" | "communication" | "projectSearch";
  directAction: {
    tool: string;
    params: object;
  } | null;
  confidence: number;
  relevantContext: string[];
  intentClassification: string;
}

export class InputAnalyzer {
  constructor(
    private orchestrationContext: OrchestrationContext,
    private logger: Logger,
    private eventBus: EventBus,
    private modelApi: BaseAPI
  ) {}

  public async analyzeInput(input: string): Promise<InputAnalysis> {
    try {
      this.logger.info('InputAnalyzer: Analyzing input', { input });
      
      const contextData = {
        ...this.orchestrationContext.get(),
        userPrompt: input
      };

      const analysis = await runPrompt<InputAnalysis>(
        'inputAnalyzer',
        contextData,
        this.modelApi
      );

      this.eventBus.emit('input:analyzed', analysis);
      return analysis;
    } catch (error) {
      this.logger.error('InputAnalyzer: Error analyzing input', { error });
      return this.getDefaultAnalysis(input);
    }
  }

  private getDefaultAnalysis(input: string): InputAnalysis {
    return {
      needsFullPlanning: true,
      category: 'communication',
      directAction: null,
      confidence: 0.5,
      relevantContext: [],
      intentClassification: 'general_query'
    };
  }
}