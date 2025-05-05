
import { OrchestrationContext } from '../core/context/orchestrationContext';
import { executeModelInteraction } from '../core/promptSystem/promptSystem';
import { log } from '../utils/logger';

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

  ) {}

  public async analyzeInput(input: string): Promise<InputAnalysis> {
    try {
      log(`InputAnalyzer: Analyzing input ${input}`, 'info');
      
      return await executeModelInteraction<InputAnalysis>(
        'inputAnalyzer', 
        {
          userPrompt: input,
          context: {
            ...this.orchestrationContext.get(),
            userPrompt: input
          }
        }
      );
    } catch (error) {
      log(`InputAnalyzer: Error analyzing input ${error}`, 'error');
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