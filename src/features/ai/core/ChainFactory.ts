// src/core/ChainFactory.ts
import { BaseLanguageModel } from '@langchain/core/language_models/base';
import { runOptimizedAnalysisChain } from '../features/ai/lcel/OptimizedAnalysisChain';
import { runOptimizedReasoningChain } from '../features/ai/lcel/OptimizedReasoningChain';
import { runOptimizedActionChain } from '../features/ai/lcel/OptimizedActionChain';
import { runOptimizedResponseChain } from '../features/ai/lcel/OptimizedResponseChain';
import { AIResponseParser } from '../shared/utils/aiResponseParser';

export interface ChainInputs {
  analysis: {
    userQuery: string;
    availableTools: string[];
    codeContext: string;
    memoryContext: string;
    model: BaseLanguageModel;
  };
  reasoning: {
    userQuery: string;
    analysisResult: any;
    toolsDescription: string;
    previousToolResults: Array<{ name: string; result: any }>;
    memoryContext: string;
    model: BaseLanguageModel;
  };
  action: {
    userQuery: string;
    lastToolName: string;
    lastToolResult: any;
    previousActions: Array<{ tool: string; result: any }>;
    memoryContext: string;
    model: BaseLanguageModel;
  };
  response: {
    userQuery: string;
    toolResults: Array<{ tool: string; result: any }>;
    analysisResult: any;
    memoryContext: string;
    model: BaseLanguageModel;
  };
}

export class ChainFactory {
  private parser: AIResponseParser;
  private chainCache: Map<string, any> = new Map();

  constructor() {
    this.parser = new AIResponseParser({
      maxAttempts: 2,
      verbose: false,
      throwOnError: false
    });
  }

  /**
   * Execute analysis chain with error handling and retries
   */
  async executeAnalysisChain(inputs: ChainInputs['analysis']): Promise<any> {
    const cacheKey = `analysis_${this.hashInputs(inputs)}`;
    
    if (this.chainCache.has(cacheKey)) {
      return this.chainCache.get(cacheKey);
    }

    try {
      const result = await runOptimizedAnalysisChain(inputs);
      
      // Cache successful results for a short time
      this.chainCache.set(cacheKey, result);
      setTimeout(() => this.chainCache.delete(cacheKey), 5 * 60 * 1000); // 5 minutes
      
      return result;
    } catch (error) {
      console.error('[ChainFactory] Analysis chain error:', error);
      throw new Error(`Analysis chain failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute reasoning chain with enhanced error handling
   */
  async executeReasoningChain(inputs: ChainInputs['reasoning']): Promise<any> {
    try {
      return await runOptimizedReasoningChain(inputs);
    } catch (error) {
      console.error('[ChainFactory] Reasoning chain error:', error);
      
      // Fallback reasoning result
      return {
        nextAction: 'respond',
        response: 'I encountered an issue with my reasoning process. Could you please rephrase your request?',
        confidence: 0.1,
        reasoning: 'Fallback due to chain execution error'
      };
    }
  }

  /**
   * Execute action chain with result validation
   */
  async executeActionChain(inputs: ChainInputs['action']): Promise<any> {
    try {
      const result = await runOptimizedActionChain(inputs);
      
      // Validate action result structure
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid action chain result structure');
      }
      
      return result;
    } catch (error) {
      console.error('[ChainFactory] Action chain error:', error);
      
      // Return a safe fallback
      return {
        nextAction: 'continue',
        analysis: `Tool ${inputs.lastToolName} executed. Continuing with analysis.`,
        shouldContinue: true
      };
    }
  }

  /**
   * Execute response chain with content validation
   */
  async executeResponseChain(inputs: ChainInputs['response']): Promise<any> {
    try {
      const result = await runOptimizedResponseChain(inputs);
      
      // Ensure we have a valid response
      if (!result?.response || typeof result.response !== 'string') {
        return {
          response: this.generateFallbackResponse(inputs),
          confidence: 0.3,
          reasoning: 'Generated fallback response due to chain issues'
        };
      }
      
      return result;
    } catch (error) {
      console.error('[ChainFactory] Response chain error:', error);
      
      return {
        response: this.generateFallbackResponse(inputs),
        confidence: 0.1,
        reasoning: 'Fallback response due to chain execution error'
      };
    }
  }

  /**
   * Execute all chains in sequence with comprehensive error handling
   */
  async executeChainSequence(
    analysisInputs: ChainInputs['analysis'],
    getReasoningInputs: (analysis: any) => ChainInputs['reasoning'],
    getActionInputs: (reasoning: any) => ChainInputs['action'],
    getResponseInputs: (actions: any[]) => ChainInputs['response']
  ): Promise<{
    analysis: any;
    reasoning: any[];
    actions: any[];
    response: any;
    success: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    const reasoning: any[] = [];
    const actions: any[] = [];
    
    try {
      // Analysis phase
      const analysis = await this.executeAnalysisChain(analysisInputs);
      
      // Reasoning phase
      try {
        const reasoningResult = await this.executeReasoningChain(getReasoningInputs(analysis));
        reasoning.push(reasoningResult);
        
        // Action phase (if needed)
        if (reasoningResult.nextAction === 'use_tool') {
          try {
            const actionResult = await this.executeActionChain(getActionInputs(reasoningResult));
            actions.push(actionResult);
          } catch (actionError) {
            errors.push(`Action phase error: ${actionError instanceof Error ? actionError.message : 'Unknown'}`);
          }
        }
      } catch (reasoningError) {
        errors.push(`Reasoning phase error: ${reasoningError instanceof Error ? reasoningError.message : 'Unknown'}`);
      }
      
      // Response phase
      const response = await this.executeResponseChain(getResponseInputs(actions));
      
      return {
        analysis,
        reasoning,
        actions,
        response,
        success: errors.length === 0,
        errors
      };
      
    } catch (analysisError) {
      errors.push(`Analysis phase error: ${analysisError instanceof Error ? analysisError.message : 'Unknown'}`);
      
      // Return minimal fallback result
      return {
        analysis: { understanding: 'Analysis failed', requirements: [] },
        reasoning: [],
        actions: [],
        response: { response: 'I encountered issues processing your request. Please try again.' },
        success: false,
        errors
      };
    }
  }

  /**
   * Generate fallback response based on context
   */
  private generateFallbackResponse(inputs: ChainInputs['response']): string {
    const hasToolResults = inputs.toolResults && inputs.toolResults.length > 0;
    
    if (hasToolResults) {
      const toolNames = inputs.toolResults.map(tr => tr.tool).join(', ');
      return `I executed the following tools: ${toolNames}. However, I encountered an issue generating a detailed response. The operations were completed, but I may need more specific guidance to provide a comprehensive answer.`;
    }
    
    return `I'm working on your request: "${inputs.userQuery}", but I encountered some processing issues. Could you please provide more details or try rephrasing your question?`;
  }

  /**
   * Hash inputs for caching
   */
  private hashInputs(inputs: any): string {
    try {
      const str = JSON.stringify(inputs, (key, value) => {
        // Exclude model from hash as it's not serializable
        if (key === 'model') return '[MODEL]';
        return value;
      });
      
      // Simple hash function
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return hash.toString();
    } catch {
      return Date.now().toString();
    }
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.chainCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.chainCache.size,
      keys: Array.from(this.chainCache.keys())
    };
  }
}