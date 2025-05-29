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

// Tipos de prompts optimizados disponibles
export type OptimizedPromptType = 
  | 'analysis'
  | 'reasoning'
  | 'action'
  | 'response';

export class OptimizedPromptManager {
  constructor(private modelManager: ModelManager) {
    console.log('[OptimizedPromptManager] Inicializado');
  }
  
  /**
   * Simplifica el resultado de una herramienta para reducir tokens
   * Elimina información innecesaria y trunca textos largos
   */
  private simplifyToolResult(result: any): any {
    if (!result) return result;
    
    // Si es un string, truncarlo
    if (typeof result === 'string') {
      return result.length > 500 ? result.substring(0, 500) + '...' : result;
    }
    
    // Si es un objeto o array, procesarlo recursivamente
    if (typeof result === 'object') {
      const simplified: Record<string, any> = {};
      
      // Si es un array, convertirlo a objeto con índices
      if (Array.isArray(result)) {
        // Si el array es muy grande, tomar solo los primeros elementos
        const limitedArray = result.length > 10 ? result.slice(0, 10) : result;
        return limitedArray.map(item => this.simplifyToolResult(item));
      }
      
      // Procesar cada propiedad del objeto
      for (const [key, value] of Object.entries(result)) {
        // Omitir propiedades internas o muy grandes
        if (key.startsWith('_') || key === 'rawContent' || key === 'fullContent') {
          continue;
        }
        
        // Simplificar el valor recursivamente
        simplified[key] = this.simplifyToolResult(value);
      }
      
      return simplified;
    }
    
    // Devolver valores primitivos sin cambios
    return result;
  }
  
  /**
   * Trunca el contexto de memoria para reducir tokens
   */
  private truncateMemoryContext(memoryContext: string): string {
    const maxLength = 1000; // Ajustar según necesidades
    if (memoryContext.length <= maxLength) return memoryContext;
    
    return memoryContext.substring(0, maxLength) + 
      `\n... [Contexto truncado. Longitud original: ${memoryContext.length} caracteres]`;
  }

  /**
 * Genera un análisis inicial de la consulta del usuario usando la cadena LCEL
 */
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

/**
 * Genera razonamiento sobre qué herramienta usar usando la cadena LCEL
 */
public async generateReasoning(
  userQuery: string,
  analysisResult: any,
  toolsDescription: string,
  previousToolResults: Array<{name: string, result: any}> = [],
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

/**
 * Genera interpretación de los resultados de una herramienta usando la cadena LCEL
 */
public async generateAction(
  userQuery: string,
  lastToolName: string,
  lastToolResult: any,
  previousActions: Array<{tool: string, result: any}> = [],
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

/**
 * Genera la respuesta final para el usuario usando la cadena LCEL
 */
public async generateResponse(
  userQuery: string,
  toolResults: Array<{tool: string, result: any}>,
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
