import { ConfigManager } from "../core/config/configManager";
import { UIStateContext } from "../core/context/uiStateContext";
import { GeminiAPI } from "./providers/gemini";
import { OllamaAPI } from "./providers/ollama";

/**
 * Tipo de modelo de IA soportado.
 */
export type ModelType = "ollama" | "gemini";

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
  private currentModel: ModelType;
  private configManager: ConfigManager;
  private uiStateContext: UIStateContext;
  private unsubscribeModelType: () => void;

  /**
   * Constructor de la clase BaseAPI.
   * @param configManager Instancia de ConfigManager para la gestión de configuración.
   * @param uiStateContext Instancia de UIStateContext para la gestión de cambios de estado.
   * @param initialModelType Tipo de modelo inicial. Por defecto, "gemini".
   */
  constructor(
    configManager: ConfigManager,
    uiStateContext: UIStateContext,
    initialModelType: ModelType = "gemini"
  ) {
    this.configManager = configManager;
    this.uiStateContext = uiStateContext;
    this.currentModel = initialModelType;

    // Escuchar cambios de modelo a través de UIStateContext
    this.unsubscribeModelType = this.uiStateContext.subscribe('modelType', (newModel: ModelType) => {
      if (newModel && newModel !== this.currentModel) {
        this.setModel(newModel);
      }
    });
    console.log(`[BaseAPI] Instanciado con modelo inicial: ${this.currentModel}`);
  }

  /**
   * Inicializa la API con el modelo preferido.
   */
  public async initialize(): Promise<void> {
    this.currentModel = this.configManager.getModelType();
    this.modelInstance = this.createModelInstance(this.currentModel);
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

    if (this.currentModel === modelType && this.modelInstance) {
      console.log(`[BaseAPI] Modelo ya configurado como ${modelType}.`);
      return; // No hay cambio necesario
    }

    console.log(`[BaseAPI] Cambiando modelo: ${this.currentModel} -> ${modelType}`);
    this.currentModel = modelType;
    this.modelInstance = null; // Forza la recreación de la instancia

    try {
      // Notifica después de que el cambio interno se haya completado
      console.log(`[BaseAPI] Modelo cambiado a ${this.currentModel}.`);
    } catch (error) {
      console.error(`[BaseAPI] Error durante el cambio de modelo a ${modelType}:`, error);
      throw error; // Re-lanza para informar al llamador
    }
  }

  /**
   * Obtiene el tipo de modelo actualmente activo.
   */
  getCurrentModel(): ModelType {
    return this.currentModel;
  }

  /**
   * Crea una instancia del modelo según el tipo especificado.
   * @param modelType Tipo de modelo a instanciar.
   * @returns Instancia del modelo.
   */
  private createModelInstance(modelType: ModelType): ModelAPI {
    if (modelType === "ollama") {
      return new OllamaAPI();
    } else if (modelType === "gemini") {
      // ¡ADVERTENCIA! Claves hardcodeadas son inseguras. Usar variables de entorno.
      const apiKey = process.env.GEMINI_API_KEY || "AIzaSyBXGZbSj099c4bUOpLxbXKJgysGKKF3sR0";
      if (!process.env.GEMINI_API_KEY) {
          console.warn("[BaseAPI] Clave API de Gemini no encontrada en process.env.GEMINI_API_KEY. Usando valor por defecto/hardcodeado.");
      }
      return new GeminiAPI(apiKey);
    } else {
      // Esta rama no debería ser alcanzable si setModel valida correctamente
      throw new Error(`Modelo no soportado encontrado internamente: ${modelType}`);
    }
  }

  /**
   * Genera una respuesta utilizando el modelo de IA configurado.
   * Recibe un prompt ya construido y devuelve la respuesta del modelo.
   * @deprecated Use el sistema de prompts en su lugar (executeModelInteraction)
   * Este método solo debe ser usado internamente por el sistema de prompts.
   */
  async generateResponseInternal(prompt: string): Promise<string> {
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
        console.error("[BaseAPI] Intento de generar respuesta con prompt inválido.");
        throw new Error("El prompt no puede estar vacío.");
    }

    try {
      // Log detallado del prompt
      console.log(`[BaseAPI] Generando respuesta con ${this.currentModel} (Prompt len: ${prompt.length})`);
      console.log(`[BaseAPI] PROMPT ENVIADO:\n${prompt.substring(0, 500)}${prompt.length > 500 ? '...' : ''}`);
      
      const modelInstance = this.createModelInstance(this.currentModel);
      const response = await modelInstance.generateResponse(prompt);
      
      // Log detallado de la respuesta
      console.log(`[BaseAPI] Respuesta recibida de ${this.currentModel} (Resp len: ${response.length})`);
      console.log(`[BaseAPI] RESPUESTA RECIBIDA:\n${response.substring(0, 500)}${response.length > 500 ? '...' : ''}`);
      
      return response;
    } catch (error: any) {
      console.error(`[BaseAPI] Error generando respuesta con ${this.currentModel}:`, error.message);
      // Re-lanzar un error más genérico o específico de BaseAPI si se prefiere
      throw new Error(`Error al generar respuesta con ${this.currentModel}: ${error.message}`);
    }
  }

  /**
   * Método público para generar respuestas. Este método ya no debe ser usado directamente.
   * En su lugar, use el sistema de prompts a través de executeModelInteraction.
   * @deprecated Use el sistema de prompts en su lugar
   */
  async generateResponse(prompt: string): Promise<string> {
    console.warn('[BaseAPI] El método generateResponse está deprecado. Use el sistema de prompts en su lugar.');
    
    // Importar dinámicamente para evitar dependencias circulares
    const { executeModelInteraction } = await import('../core/promptSystem/promptSystem');
    
    try {
      // Redirigir al sistema de prompts usando el tipo 'communication'
      return await executeModelInteraction<string>(
        'communication',
        { userMessage: prompt },
        this
      );
    } catch (error) {
      console.error('[BaseAPI] Error al usar el sistema de prompts:', error);
      // Fallback al método interno en caso de error
      return this.generateResponseInternal(prompt);
    }
  }

  /**
   * Aborta cualquier solicitud de generación en curso.
   */
  abortRequest(): void {
    if (this.modelInstance) {
      console.log(`[BaseAPI] Solicitando abortar petición para ${this.currentModel}`);
      this.modelInstance.abortRequest();
    } else {
       console.log(`[BaseAPI] No hay instancia de modelo activa para abortar.`);
    }
  }
}