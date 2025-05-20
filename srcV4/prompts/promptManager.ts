/**
 * Gestor de prompts para la arquitectura Windsurf
 * Centraliza la definición y gestión de todos los prompts utilizados en el sistema
 */

import { PromptTemplate } from '@langchain/core/prompts';
import { initialAnalysisPrompt } from './templates/initialAnalysis';
import { reasoningPrompt } from './templates/reasoning';
import { reflectionPrompt } from './templates/reflection';
import { correctionPrompt } from './templates/correction';
import { responseGenerationPrompt } from './templates/responseGeneration';

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
  private prompts: Map<PromptType, PromptTemplate>;
  
  constructor() {
    this.prompts = new Map();
    this.registerPrompts();
    console.log('[PromptManager] Initialized with prompts:', Array.from(this.prompts.keys()).join(', '));
  }
  
  /**
   * Registra todos los prompts disponibles en el sistema
   */
  private registerPrompts(): void {
    // Prompt para el análisis inicial del mensaje del usuario
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
  public getPrompt(type: PromptType): PromptTemplate {
    const prompt = this.prompts.get(type);
    if (!prompt) {
      throw new Error(`Prompt not found: ${type}`);
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
    const formattedPrompt = await prompt.format(values);
    return formattedPrompt;
  }
  
  /**
   * Registra un nuevo prompt o reemplaza uno existente
   * Útil para personalizar prompts en tiempo de ejecución
   * @param type Tipo de prompt a registrar
   * @param prompt Plantilla del prompt
   */
  public registerPrompt(type: PromptType, prompt: PromptTemplate): void {
    this.prompts.set(type, prompt);
    console.log(`[PromptManager] Registered prompt: ${type}`);
  }
}
