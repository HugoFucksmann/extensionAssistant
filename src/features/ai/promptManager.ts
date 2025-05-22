/**
 * Gestor de prompts para la arquitectura Windsurf
 * Centraliza la definición y gestión de todos los prompts utilizados en el sistema
 */

import { ChatPromptTemplate, BasePromptTemplate } from '@langchain/core/prompts';
import { initialAnalysisPrompt } from './prompts/initialAnalysisPrompt';
import { reasoningPrompt } from './prompts/reasoningPrompt';
import { reflectionPrompt } from './prompts/reflectionPrompt';
import { correctionPrompt } from './prompts/correctionPrompt';
import { responseGenerationPrompt } from './prompts/responseGenerationPrompt';

/**
 * Tipo de prompts disponibles en el sistema
 */
export type PromptType = 
  | 'initialAnalysis'
  | 'reasoning'
  | 'reflection'
  | 'correction'
  | 'responseGeneration';

/**
 * Gestor centralizado de prompts
 * Proporciona acceso a todos los prompts del sistema y maneja su formateo
 */
export class PromptManager {
  private prompts: Map<PromptType, BasePromptTemplate>;

  constructor() {
    this.prompts = new Map();
    this.registerPrompts();
    console.log('[PromptManager] Inicializado con prompts:', Array.from(this.prompts.keys()).join(', '));
  }

  /**
   * Registra todos los prompts disponibles en el sistema
   */
  private registerPrompts(): void {
    // Prompt para el análisis inicial
    this.prompts.set('initialAnalysis', initialAnalysisPrompt);
    
    // Prompt para la fase de razonamiento
    this.prompts.set('reasoning', reasoningPrompt);
    
    // Prompt para la fase de reflexión
    this.prompts.set('reflection', reflectionPrompt);
    
    // Prompt para la fase de corrección
    this.prompts.set('correction', correctionPrompt);
    
    // Prompt para la generación de respuestas finales
    this.prompts.set('responseGeneration', responseGenerationPrompt);
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
      return await prompt.format(values);
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
