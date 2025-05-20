/**
 * Adaptador para el ModelManager que implementa la interfaz IModelManager
 * Permite utilizar el ModelManager existente a través de la interfaz definida
 */

import { IModelManager, ModelOptions, ModelResponse } from '../core/interfaces/model-manager.interface';
import { ModelManager, ModelProvider } from './modelManager';
import { IEventBus } from '../core/interfaces/event-bus.interface';

/**
 * Adaptador para el ModelManager que implementa la interfaz IModelManager
 */
export class ModelManagerAdapter implements IModelManager {
  private modelManager: ModelManager;
  private eventBus: IEventBus;
  private defaultModel: string;
  
  /**
   * Constructor del adaptador
   * @param modelManager Instancia del ModelManager original
   * @param eventBus Bus de eventos para notificaciones
   * @param defaultModel Modelo predeterminado
   */
  constructor(modelManager: ModelManager, eventBus: IEventBus, defaultModel: string = 'gemini-pro') {
    this.modelManager = modelManager;
    this.eventBus = eventBus;
    this.defaultModel = defaultModel;
  }
  
  /**
   * Genera texto a partir de un prompt usando el modelo predeterminado
   * @param prompt Texto de entrada para el modelo
   * @param options Opciones de generación
   * @returns Respuesta generada por el modelo
   */
  public async generateText(prompt: string, options?: ModelOptions): Promise<string> {
    try {
      const startTime = Date.now();
      this.eventBus.debug(`[ModelManagerAdapter] Generating text with model: ${this.defaultModel}`);
      
      // Usar el ModelManager existente para generar texto
      const response = await this.modelManager.generateText(prompt, this.defaultModel);
      
      const duration = Date.now() - startTime;
      this.eventBus.debug(`[ModelManagerAdapter] Text generated in ${duration}ms`);
      
      return response;
    } catch (error: any) {
      this.eventBus.debug(`[ModelManagerAdapter] Error generating text: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Genera texto a partir de un prompt usando un modelo específico
   * @param modelName Nombre del modelo a utilizar
   * @param prompt Texto de entrada para el modelo
   * @param options Opciones de generación
   * @returns Respuesta completa del modelo
   */
  public async generateWithModel(modelName: string, prompt: string, options?: ModelOptions): Promise<ModelResponse> {
    try {
      const startTime = Date.now();
      this.eventBus.debug(`[ModelManagerAdapter] Generating text with specific model: ${modelName}`);
      
      // Usar el ModelManager existente para generar texto
      const text = await this.modelManager.generateText(prompt, modelName);
      
      const duration = Date.now() - startTime;
      
      // Crear una respuesta estructurada
      const response: ModelResponse = {
        text,
        usage: {
          promptTokens: this.estimateTokenCount(prompt),
          completionTokens: this.estimateTokenCount(text),
          totalTokens: this.estimateTokenCount(prompt) + this.estimateTokenCount(text)
        },
        metadata: {
          model: modelName,
          duration
        }
      };
      
      this.eventBus.debug(`[ModelManagerAdapter] Text generated with model ${modelName} in ${duration}ms`);
      
      return response;
    } catch (error: any) {
      this.eventBus.debug(`[ModelManagerAdapter] Error generating text with model ${modelName}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Obtiene la lista de modelos disponibles
   * @returns Lista de nombres de modelos
   */
  public async getAvailableModels(): Promise<string[]> {
    // Obtener los modelos disponibles del ModelManager
    // Como el ModelManager actual no expone directamente esta información,
    // devolvemos una lista estática de modelos comunes
    return [
      'gemini-pro',
      'gpt-3.5-turbo',
      'llama3'
    ];
  }
  
  /**
   * Establece el modelo predeterminado
   * @param modelName Nombre del modelo
   */
  public setDefaultModel(modelName: string): void {
    this.defaultModel = modelName;
    
    // Intentar establecer el proveedor correspondiente en el ModelManager
    const providerMap: Record<string, ModelProvider> = {
      'gemini-pro': 'gemini',
      'gpt-3.5-turbo': 'openai',
      'llama3': 'ollama'
    };
    
    const provider = providerMap[modelName];
    if (provider) {
      this.modelManager.setActiveProvider(provider);
    }
    
    this.eventBus.debug(`[ModelManagerAdapter] Default model set to: ${modelName}`);
  }
  
  /**
   * Obtiene el nombre del modelo predeterminado
   * @returns Nombre del modelo predeterminado
   */
  public getDefaultModel(): string {
    return this.defaultModel;
  }
  
  /**
   * Estima el número de tokens en un texto
   * Esta es una estimación muy aproximada (4 caracteres ≈ 1 token)
   * @param text Texto para estimar tokens
   * @returns Número estimado de tokens
   */
  private estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
