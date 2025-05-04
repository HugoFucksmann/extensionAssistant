// BaseAPI.ts (Refactorizado)
import { ConfigurationManager, ModelType } from "../core/config/ConfigurationManager";
import { GeminiAPI } from "./providers/gemini";
import { OllamaAPI } from "./providers/ollama";

// Interfaz para implementaciones específicas de modelos
export interface ModelAPI {
  generateResponse(prompt: string): Promise<string>;
  abortRequest(): void;
}

/**
 * Clase base para la API de modelos de IA.
 * Maneja la lógica de cambio de modelos y la comunicación con el modelo activo.
 */
export class BaseAPI {
  private modelInstance: ModelAPI | null = null;
  private configurationManager: ConfigurationManager;
  private modelSubscription: () => void;

  /**
   * Constructor de la clase BaseAPI.
   * @param ConfigurationManager Instancia de ConfigurationManager para gestión de configuración.
   */
  constructor(ConfigurationManager: ConfigurationManager) {
    this.configurationManager = ConfigurationManager;
    
    // Suscribirse a cambios de modelo
    this.modelSubscription = this.configurationManager.onChange('modelType', () => {
      this.modelInstance = null; // Forzar recreación del modelo en el próximo uso
    });
    
    console.log(`[BaseAPI] Inicializado con modelo: ${this.configurationManager.getModelType()}`);
  }

  /**
   * Inicializa la API con el modelo preferido.
   */
  public async initialize(): Promise<void> {
    this.modelInstance = null; // Forzar creación a demanda
  }

  /**
   * Cambia el modelo de IA en tiempo de ejecución.
   */
  async setModel(modelType: ModelType): Promise<void> {
    const validModels: ModelType[] = ["ollama", "gemini"];
    if (!modelType || !validModels.includes(modelType)) {
      console.error(`[BaseAPI] Intento de cambiar a modelo inválido: ${modelType}`);
      throw new Error(`Modelo no soportado o inválido: ${modelType}`);
    }

    const currentModel = this.configurationManager.getModelType();
    if (currentModel === modelType) {
      console.log(`[BaseAPI] Modelo ya configurado como ${modelType}.`);
      return; // No hay cambio necesario
    }

    console.log(`[BaseAPI] Cambiando modelo: ${currentModel} -> ${modelType}`);
    
    try {
      // Actualizar la configuración
      await this.configurationManager.setModelType(modelType);
      
      // Reiniciar instancia del modelo
      this.modelInstance = null;
      
      console.log(`[BaseAPI] Modelo cambiado a ${modelType}.`);
    } catch (error) {
      console.error(`[BaseAPI] Error durante el cambio de modelo a ${modelType}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene el tipo de modelo actualmente activo.
   */
  getCurrentModel(): ModelType {
    return this.configurationManager.getModelType();
  }

  /**
   * Obtiene o crea una instancia del modelo según la configuración actual.
   */
  private getModelInstance(): ModelAPI {
    if (!this.modelInstance) {
      const modelType = this.configurationManager.getModelType();
      
      if (modelType === "ollama") {
        this.modelInstance = new OllamaAPI();
      } else if (modelType === "gemini") {
        // Obtener la clave API de manera segura
        const apiKey = process.env.GEMINI_API_KEY || "AIzaSyBXGZbSj099c4bUOpLxbXKJgysGKKF3sR0";
        if (!process.env.GEMINI_API_KEY) {
          console.warn("[BaseAPI] Clave API de Gemini no encontrada. Usando valor por defecto.");
        }
        this.modelInstance = new GeminiAPI(apiKey);
      } else {
        throw new Error(`Modelo no soportado: ${modelType}`);
      }
    }
    
    return this.modelInstance;
  }

  /**
   * Genera una respuesta utilizando el modelo de IA configurado.
   * @deprecated Use el sistema de prompts en su lugar
   */
  async generateResponseInternal(prompt: string): Promise<string> {
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      console.error("[BaseAPI] Intento de generar respuesta con prompt inválido.");
      throw new Error("El prompt no puede estar vacío.");
    }

    try {
      const modelType = this.configurationManager.getModelType();
      console.log(`[BaseAPI] Generando respuesta con ${modelType} (Prompt len: ${prompt.length})`);
      console.log(`[BaseAPI] PROMPT:\n${prompt.substring(0, 500)}${prompt.length > 500 ? '...' : ''}`);
      
      const response = await this.getModelInstance().generateResponse(prompt);
      
      console.log(`[BaseAPI] Respuesta recibida (len: ${response.length})`);
      console.log(`[BaseAPI] RESPUESTA:\n${response.substring(0, 500)}${response.length > 500 ? '...' : ''}`);
      
      return response;
    } catch (error: any) {
      console.error(`[BaseAPI] Error generando respuesta:`, error.message);
      throw new Error(`Error al generar respuesta: ${error.message}`);
    }
  }

  /**
   * Método público para generar respuestas.
   * @deprecated Use el sistema de prompts en su lugar
   */
  async generateResponse(prompt: string): Promise<string> {
    console.warn('[BaseAPI] El método generateResponse está deprecado. Use el sistema de prompts.');
    
    try {
      // Importar dinámicamente para evitar dependencias circulares
      const { executeModelInteraction } = await import('../core/promptSystem/promptSystem');
      
      return await executeModelInteraction<string>(
        'communication',
        { userMessage: prompt }
      );
    } catch (error) {
      console.error('[BaseAPI] Error al usar el sistema de prompts:', error);
      // Fallback al método interno en caso de error
      return this.generateResponseInternal(prompt);
    }
  }

  /**
   * Método para enviar un mensaje (interfaz pública)
   */
  async sendMessage(message: string): Promise<string> {
    return this.generateResponse(message);
  }

  /**
   * Aborta cualquier solicitud de generación en curso.
   */
  abortRequest(): void {
    if (this.modelInstance) {
      console.log(`[BaseAPI] Abortando petición para ${this.configurationManager.getModelType()}`);
      this.modelInstance.abortRequest();
    } else {
      console.log(`[BaseAPI] No hay instancia de modelo activa para abortar.`);
    }
  }

  /**
   * Libera recursos
   */
  dispose(): void {
    this.abortRequest();
    this.modelSubscription();
    this.modelInstance = null;
  }
}