import { OrchestrationContext } from '../core/context/orchestrationContext';
import { ToolRegistry } from '../tools/core/toolRegistry';
import { Logger } from '../utils/logger';
import { BaseAPI } from '../models/baseAPI';
import { runPrompt } from '../core/promptSystem/promptSystem';
import { InputAnalysis } from './inputAnalyzer';

export interface ToolSelection {
  tool: string;
  reason: string;
  confidence: number;
}

export class ToolSelector {
  constructor(
    private orchestrationContext: OrchestrationContext,
    private toolRegistry: ToolRegistry,
    private logger: Logger,
    private modelApi: BaseAPI
  ) {}

  public async selectTool(
    taskDescription: string,
    stepDescription: string,
    inputAnalysis: InputAnalysis
  ): Promise<ToolSelection> {
    try {
      const context = {
        ...this.orchestrationContext.get(),
        taskDescription,
        stepDescription,
        inputAnalysis,
        availableTools: this.toolRegistry.getAvailableTools()
      };

      const selection = await runPrompt<ToolSelection>(
        'toolSelector',
        context,
        this.modelApi
      );

      if (!this.validateSelection(selection)) {
        throw new Error('Invalid tool selection from model');
      }

      return selection;
    } catch (err) {
      this.logger.error('[ToolSelector] Error in selectTool:', {err});
      
      // Fallback robusto
      const fallbackTools = this.toolRegistry.getAvailableTools();
      const fallbackTool = fallbackTools[0]?.name || 'defaultTool';
      return {
        tool: fallbackTool,
        reason: 'Fallback: error in automatic selection',
        confidence: 0
      };
    }
  }

  private validateSelection(selection: ToolSelection): boolean {
    const availableTools = this.toolRegistry.getAvailableTools();
    return availableTools.some(tool => tool.name === selection.tool);
  }
}