
import { OrchestrationContext } from '../core/context/orchestrationContext';
import { executeModelInteraction } from '../core/promptSystem/promptSystem';
import { LoggerService } from '../utils/logger';

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
    private logger: LoggerService,
  ) {}

  public async analyzeInput(input: string): Promise<InputAnalysis> {
    try {
      this.logger.info('InputAnalyzer: Analyzing input', { input });
      
      return await executeModelInteraction<InputAnalysis>(
        'inputAnalyzer', 
        {
          userMessage: input,  // Changed from userInput to userMessage
          context: this.orchestrationContext.get()
        }
      );
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