/**
 * Gestor de prompts para la arquitectura Windsurf
 * Centraliza la definición y gestión de todos los prompts utilizados en el sistema
 */

import { ChatPromptTemplate, BasePromptTemplate } from '@langchain/core/prompts';

/**
 * Tipo de prompts disponibles en el sistema
 */
export type PromptType = 
  | 'analysis'
  | 'reasoning'
  | 'action'
  | 'response';

/**
 * Gestor centralizado de prompts
 * Proporciona acceso a todos los prompts del sistema y maneja su formateo
 */
export class PromptManager {
  private prompts: Map<PromptType, BasePromptTemplate>;
  private _promptGenerators: Record<PromptType, Function> = {} as Record<PromptType, Function>;

  constructor() {
    this.prompts = new Map();
    this.registerPrompts();
    console.log('[PromptManager] Inicializado con prompts:', Array.from(this.prompts.keys()).join(', '));
  }

  /**
   * Registra todos los prompts disponibles en el sistema
   */
  private registerPrompts(): void {
    // Importar dinámicamente para evitar dependencias circulares
    const { generateAnalysisPrompt } = require('./prompts/optimized/analysisPrompt');
    const { generateReasoningPrompt } = require('./prompts/optimized/reasoningPrompt');
    const { generateActionPrompt } = require('./prompts/optimized/actionPrompt');
    const { generateResponsePrompt } = require('./prompts/optimized/responsePrompt');
    
    // Prompt para el análisis inicial
    this.prompts.set('analysis', ChatPromptTemplate.fromTemplate(
      // Usamos un template simple que será reemplazado en tiempo de ejecución
      // con los valores reales cuando se llame a formatPrompt
      '{prompt}'
    ));
    
    // Prompt para la fase de razonamiento
    this.prompts.set('reasoning', ChatPromptTemplate.fromTemplate(
      '{prompt}'
    ));
    
    // Prompt para la fase de acción
    this.prompts.set('action', ChatPromptTemplate.fromTemplate(
      '{prompt}'
    ));
    
    // Prompt para la generación de respuestas finales
    this.prompts.set('response', ChatPromptTemplate.fromTemplate(
      '{prompt}'
    ));
    
    // Guardamos las funciones generadoras para usarlas en formatPrompt
    this._promptGenerators = {
      analysis: generateAnalysisPrompt,
      reasoning: generateReasoningPrompt,
      action: generateActionPrompt,
      response: generateResponsePrompt
    };
  }
  
  /**
   * Obtiene un prompt por su tipo
   * @param type Tipo de prompt a obtener
   * @returns El prompt solicitado
   */
  public getPrompt(type: PromptType): BasePromptTemplate {
    const prompt = this.prompts.get(type);
    if (!prompt) {
      throw new Error(`[PromptManager] No se encontró el prompt de tipo: ${type}`);
    }
    return prompt;
  }
  
  /**
   * Formatea un prompt con los valores proporcionados
   * @param type Tipo de prompt a formatear
   * @param values Valores para formatear el prompt
   * @returns Prompt formateado listo para enviar al modelo
   */
  public async formatPrompt(type: PromptType, values: Record<string, any>): Promise<string> {
    const prompt = this.getPrompt(type);
    try {
      // Generamos el prompt real usando la función generadora correspondiente
      const generator = this._promptGenerators[type];
      if (!generator) {
        throw new Error(`No se encontró un generador para el prompt de tipo: ${type}`);
      }
      
      // Generamos el prompt usando los valores proporcionados
      let generatedPrompt;
      switch (type) {
        case 'analysis':
          generatedPrompt = generator(
            values.userQuery || '',
            values.availableTools || [],
            values.codeContext,
            values.memoryContext
          );
          break;
        case 'reasoning':
          generatedPrompt = generator(
            values.userQuery || '',
            values.analysisResult || {},
            values.toolsDescription || '',
            values.previousToolResults || [],
            values.memoryContext
          );
          break;
        case 'action':
          generatedPrompt = generator(
            values.userQuery || '',
            values.toolName || '',
            values.toolResult || {},
            values.previousSteps || [],
            values.memoryContext
          );
          break;
        case 'response':
          generatedPrompt = generator(
            values.userQuery || '',
            values.conversationHistory || '',
            values.finalAnswer || '',
            values.memoryContext
          );
          break;
        default:
          throw new Error(`Tipo de prompt no soportado: ${type}`);
      }
      
      // Formateamos el prompt con el contenido generado
      return await prompt.format({ prompt: generatedPrompt });
    } catch (error) {
      console.error(`[PromptManager] Error al formatear el prompt ${type}:`, error);
      throw new Error(`Error al formatear el prompt: ${error}`);
    }
  }
  
  /**
   * Registra un nuevo prompt o reemplaza uno existente
   * Útil para personalizar prompts en tiempo de ejecución
   * @param type Tipo de prompt a registrar
   * @param prompt Plantilla del prompt
   */
  public registerPrompt(type: PromptType, prompt: BasePromptTemplate): void {
    this.prompts.set(type, prompt);
    console.log(`[PromptManager] Prompt '${type}' registrado/actualizado`);
  }
}

// Exportar una instancia singleton
export const promptManager = new PromptManager();
