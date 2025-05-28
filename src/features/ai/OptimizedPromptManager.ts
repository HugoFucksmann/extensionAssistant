/**
 * Gestor de prompts optimizados
 * Centraliza la gestión de prompts optimizados para reducir tokens y mejorar la estructura
 */

import { generateAnalysisPrompt, analysisOutputSchema, AnalysisOutput } from './prompts/optimized/analysisPrompt';
import { generateReasoningPrompt, reasoningOutputSchema, ReasoningOutput } from './prompts/optimized/reasoningPrompt';
import { generateActionPrompt, actionOutputSchema, ActionOutput } from './prompts/optimized/actionPrompt';
import { generateResponsePrompt, responseOutputSchema, ResponseOutput } from './prompts/optimized/responsePrompt';
import { extractStructuredResponse } from './prompts/optimizedPromptUtils';
import { ModelManager } from './ModelManager';

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
   * Genera un análisis inicial de la consulta del usuario
   */
  public async generateAnalysis(
    userQuery: string,
    availableTools: string[],
    codeContext?: string,
    memoryContext?: string
  ): Promise<AnalysisOutput> {
    console.log('[OptimizedPromptManager] Generando análisis inicial');
    
    // Limitar la cantidad de herramientas para reducir tokens
    const limitedTools = availableTools.slice(0, 15); // Solo las primeras 15 herramientas
    
    // Truncar el contexto de código si es muy largo
    const truncatedCodeContext = codeContext && codeContext.length > 1000 ? 
      codeContext.substring(0, 1000) + '...' : codeContext;
    
    const prompt = generateAnalysisPrompt(
      userQuery,
      limitedTools,
      truncatedCodeContext,
      memoryContext ? this.truncateMemoryContext(memoryContext) : undefined
    );
    
    const response = await this.modelManager.generateText(prompt);
    
    // Valor por defecto en caso de error
    const defaultValue: AnalysisOutput = {
      understanding: 'No se pudo analizar correctamente la consulta del usuario',
      taskType: 'information_request',
      requiredTools: [],
      requiredContext: [],
      initialPlan: ['Solicitar más información al usuario']
    };
    
    try {
      // Usar el valor por defecto si hay un error
      return extractStructuredResponse(response, analysisOutputSchema, defaultValue);
    } catch (error) {
      console.error('[OptimizedPromptManager] Error al extraer análisis:', error);
      return defaultValue;
    }
  }

  /**
   * Genera razonamiento sobre qué herramienta usar
   */
  public async generateReasoning(
    userQuery: string,
    analysisResult: any,
    toolsDescription: string,
    previousToolResults: Array<{name: string, result: any}> = [],
    memoryContext?: string
  ): Promise<ReasoningOutput> {
    console.log('[OptimizedPromptManager] Generando razonamiento');
    
    // Simplificar el resultado del análisis
    const simplifiedAnalysis = this.simplifyToolResult(analysisResult);
    
    // Truncar la descripción de herramientas si es muy larga
    const truncatedToolsDescription = toolsDescription.length > 1000 ? 
      toolsDescription.substring(0, 1000) + '...' : toolsDescription;
    
    // Simplificar y limitar los resultados previos
    const simplifiedPreviousResults = previousToolResults
      .slice(-2) // Solo los últimos 2 resultados
      .map(item => ({
        name: item.name,
        result: this.simplifyToolResult(item.result)
      }));
    
    const prompt = generateReasoningPrompt(
      userQuery,
      simplifiedAnalysis,
      truncatedToolsDescription,
      simplifiedPreviousResults,
      memoryContext ? this.truncateMemoryContext(memoryContext) : undefined
    );
    
    const response = await this.modelManager.generateText(prompt);
    
    // Valor por defecto en caso de error
    const defaultValue: ReasoningOutput = {
      reasoning: 'No se pudo generar un razonamiento válido',
      action: 'respond',
      response: 'No pude procesar correctamente tu consulta. ¿Podrías reformularla?'
    };
    
    try {
      // Usar el valor por defecto si hay un error
      return extractStructuredResponse(response, reasoningOutputSchema, defaultValue);
    } catch (error) {
      console.error('[OptimizedPromptManager] Error al extraer razonamiento:', error);
      return defaultValue;
    }
  }

  /**
   * Genera interpretación de los resultados de una herramienta
   */
  public async generateAction(
    userQuery: string,
    lastToolName: string,
    lastToolResult: any,
    previousActions: Array<{tool: string, result: any}> = [],
    memoryContext?: string
  ): Promise<ActionOutput> {
    console.log('[OptimizedPromptManager] Generando acción');
    
    // Simplificar y limitar los datos que se pasan al prompt
    const simplifiedLastResult = this.simplifyToolResult(lastToolResult);
    const simplifiedPreviousActions = previousActions.map(action => ({
      tool: action.tool,
      result: this.simplifyToolResult(action.result)
    }));
    
    // Limitar la cantidad de acciones previas para reducir tokens
    const limitedPreviousActions = simplifiedPreviousActions.slice(-2); // Solo las últimas 2 acciones
    
    const prompt = generateActionPrompt(
      userQuery,
      lastToolName,
      simplifiedLastResult,
      limitedPreviousActions,
      memoryContext ? this.truncateMemoryContext(memoryContext) : undefined
    );
    
    const response = await this.modelManager.generateText(prompt);
    
    // Valor por defecto en caso de error
    const defaultValue: ActionOutput = {
      interpretation: 'No se pudo interpretar correctamente el resultado de la herramienta',
      nextAction: 'respond',
      response: 'No pude procesar correctamente los resultados. ¿Podrías intentar con una consulta diferente?'
    };
    
    try {
      // Usar el valor por defecto si hay un error
      return extractStructuredResponse(response, actionOutputSchema, defaultValue);
    } catch (error) {
      console.error('[OptimizedPromptManager] Error al extraer acción:', error);
      return defaultValue;
    }
  }

  /**
   * Genera la respuesta final para el usuario
   */
  public async generateResponse(
    userQuery: string,
    toolResults: Array<{tool: string, result: any}>,
    analysisResult: any,
    memoryContext?: string
  ): Promise<ResponseOutput> {
    console.log('[OptimizedPromptManager] Generando respuesta final');
    
    // Simplificar el resultado del análisis
    const simplifiedAnalysis = this.simplifyToolResult(analysisResult);
    
    // Simplificar y limitar los resultados de herramientas
    const simplifiedToolResults = toolResults
      .slice(-5) // Solo los últimos 5 resultados
      .map(item => ({
        tool: item.tool,
        result: this.simplifyToolResult(item.result)
      }));
    
    const prompt = generateResponsePrompt(
      userQuery,
      simplifiedToolResults,
      simplifiedAnalysis,
      memoryContext ? this.truncateMemoryContext(memoryContext) : undefined
    );
    
    const response = await this.modelManager.generateText(prompt);
    
    // Valor por defecto en caso de error
    const defaultValue: ResponseOutput = {
      response: 'No pude generar una respuesta adecuada. Por favor, intenta con una consulta diferente.'
    };
    
    try {
      // Usar el valor por defecto si hay un error
      return extractStructuredResponse(response, responseOutputSchema, defaultValue);
    } catch (error) {
      console.error('[OptimizedPromptManager] Error al extraer respuesta:', error);
      return defaultValue;
    }
  }
}
