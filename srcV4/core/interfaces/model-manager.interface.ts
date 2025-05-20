/**
 * Interfaz para el gestor de modelos de la arquitectura Windsurf
 * Define el contrato que debe implementar cualquier gestor de modelos
 */

export interface ModelOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stopSequences?: string[];
  [key: string]: any;
}

export interface ModelResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata?: Record<string, any>;
}

export interface IModelManager {
  /**
   * Genera texto a partir de un prompt usando el modelo predeterminado
   * @param prompt Texto de entrada para el modelo
   * @param options Opciones de generación
   * @returns Respuesta generada por el modelo
   */
  generateText(prompt: string, options?: ModelOptions): Promise<string>;

  /**
   * Genera texto a partir de un prompt usando un modelo específico
   * @param modelName Nombre del modelo a utilizar
   * @param prompt Texto de entrada para el modelo
   * @param options Opciones de generación
   * @returns Respuesta completa del modelo
   */
  generateWithModel(modelName: string, prompt: string, options?: ModelOptions): Promise<ModelResponse>;

  /**
   * Obtiene la lista de modelos disponibles
   * @returns Lista de nombres de modelos
   */
  getAvailableModels(): Promise<string[]>;

  /**
   * Establece el modelo predeterminado
   * @param modelName Nombre del modelo
   */
  setDefaultModel(modelName: string): void;

  /**
   * Obtiene el nombre del modelo predeterminado
   * @returns Nombre del modelo predeterminado
   */
  getDefaultModel(): string;
}
