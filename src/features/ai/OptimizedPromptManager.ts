// src/features/ai/OptimizedPromptManager.ts
import { runOptimizedAnalysisChain } from './lcel/OptimizedAnalysisChain';
import { runOptimizedReasoningChain } from './lcel/OptimizedReasoningChain';
import { runOptimizedActionChain } from './lcel/OptimizedActionChain';
import { runOptimizedResponseChain } from './lcel/OptimizedResponseChain';
import { ModelManager } from './ModelManager';
import { AnalysisOutput } from './prompts/optimized/analysisPrompt';
import { ReasoningOutput } from './prompts/optimized/reasoningPrompt';
import { ActionOutput } from './prompts/optimized/actionPrompt';
import { ResponseOutput } from './prompts/optimized/responsePrompt';


export type OptimizedPromptType =
  | 'analysis'
  | 'reasoning'
  | 'action'
  | 'response';

export class OptimizedPromptManager {
  constructor(private modelManager: ModelManager) {
    console.log('[OptimizedPromptManager] Inicializado');
  }


  private simplifyToolResult(result: any): any {
    if (!result) return result;


    if (typeof result === 'string') {
      return result.length > 500 ? result.substring(0, 500) + '...' : result;
    }


    if (typeof result === 'object') {
      const simplified: Record<string, any> = {};


      if (Array.isArray(result)) {

        const limitedArray = result.length > 10 ? result.slice(0, 10) : result;
        return limitedArray.map(item => this.simplifyToolResult(item));
      }


      for (const [key, value] of Object.entries(result)) {
        // Omitir propiedades internas o muy grandes
        if (key.startsWith('_') || key === 'rawContent' || key === 'fullContent') {
          continue;
        }


        simplified[key] = this.simplifyToolResult(value);
      }

      return simplified;
    }


    return result;
  }


  private truncateMemoryContext(memoryContext: string): string {
    const maxLength = 1000;
    if (memoryContext.length <= maxLength) return memoryContext;

    return memoryContext.substring(0, maxLength) +
      `\n... [Contexto truncado. Longitud original: ${memoryContext.length} caracteres]`;
  }


  public async generateAnalysis(
    userQuery: string,
    availableTools: string[],
    codeContext?: string,
    memoryContext?: string
  ): Promise<AnalysisOutput> {
    console.log('[OptimizedPromptManager] Generando análisis inicial (LCEL)');
    const model = this.modelManager.getActiveModel();
    return await runOptimizedAnalysisChain({
      userQuery,
      availableTools,
      codeContext,
      memoryContext,
      model
    }) as AnalysisOutput;
  }


  public async generateReasoning(
    userQuery: string,
    analysisResult: any,
    toolsDescription: string,
    previousToolResults: Array<{ name: string, result: any }> = [],
    memoryContext?: string
  ): Promise<ReasoningOutput> {
    console.log('[OptimizedPromptManager] Generando razonamiento (LCEL)');
    const model = this.modelManager.getActiveModel();
    return await runOptimizedReasoningChain({
      userQuery,
      analysisResult,
      toolsDescription,
      previousToolResults,
      memoryContext,
      model
    }) as ReasoningOutput;
  }


  public async generateAction(
    userQuery: string,
    lastToolName: string,
    lastToolResult: any,
    previousActions: Array<{ tool: string, result: any }> = [],
    memoryContext?: string
  ): Promise<ActionOutput> {
    console.log('[OptimizedPromptManager] Generando acción (LCEL)');
    const model = this.modelManager.getActiveModel();
    return await runOptimizedActionChain({
      userQuery,
      lastToolName,
      lastToolResult,
      previousActions,
      memoryContext,
      model
    }) as ActionOutput;
  }


  public async generateResponse(
    userQuery: string,
    toolResults: Array<{ tool: string, result: any }>,
    analysisResult: any,
    memoryContext?: string
  ): Promise<ResponseOutput> {
    console.log('[OptimizedPromptManager] Generando respuesta final (LCEL)');
    const model = this.modelManager.getActiveModel();
    return await runOptimizedResponseChain({
      userQuery,
      toolResults,
      analysisResult,
      memoryContext,
      model
    }) as ResponseOutput;
  }
}
