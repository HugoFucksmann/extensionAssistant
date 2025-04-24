type ModelType = "ollama" | "gemini";

// Interfaz para implementaciones específicas de modelos
export interface ModelAPI {
  generateResponse(prompt: string): Promise<string>;
 
  abortRequest(): void;
}


export class BaseAPI {
  protected abortController: AbortController | null = null;
  private modelInstance: ModelAPI | null = null;
  private currentModel: ModelType;

  constructor(modelType: ModelType) {
    this.currentModel = modelType;
  }

  // Método para cambiar el modelo en tiempo de ejecución
  setModel(modelType: ModelType): void {
    console.log(`BaseAPI.setModel llamado con modelType: ${modelType}, modelo actual: ${this.currentModel}`);
    
    if (this.currentModel !== modelType) {
      console.log(`BaseAPI: Cambiando modelo de ${this.currentModel} a ${modelType}`);
      this.currentModel = modelType;
      this.modelInstance = null; // Forzar recreación de la instancia
      console.log(`BaseAPI: Modelo cambiado a ${this.currentModel}, instancia reseteada: ${this.modelInstance === null}`);
    } else {
      console.log(`BaseAPI: El modelo ya está configurado como ${modelType}, no se hace nada`);
    }
  }
  
  /**
   * Obtiene el tipo de modelo actual
   * @returns El tipo de modelo actual
   */
  getCurrentModel(): ModelType {
    return this.currentModel;
  }

  // Método para obtener la instancia del modelo actual
  private getModelInstance(): ModelAPI {
    console.log(`BaseAPI.getModelInstance llamado, modelo actual: ${this.currentModel}, instancia existente: ${!!this.modelInstance}`);
    
    if (!this.modelInstance) {
      console.log(`BaseAPI: Creando nueva instancia para modelo ${this.currentModel}`);
      
      // Importaciones dinámicas para evitar dependencias circulares
      const { OllamaAPI } = require("./ollama");
      const { GeminiAPI } = require("./gemini");

      if (this.currentModel === "ollama") {
        console.log(`BaseAPI: Creando instancia de OllamaAPI`);
        this.modelInstance = new OllamaAPI();
      } else if (this.currentModel === "gemini") {
        console.log(`BaseAPI: Creando instancia de GeminiAPI`);
        this.modelInstance = new GeminiAPI("AIzaSyBXGZbSj099c4bUOpLxbXKJgysGKKF3sR0");
      } else {
        console.error(`BaseAPI: Modelo no soportado: ${this.currentModel}`);
        throw new Error(`Modelo no soportado: ${this.currentModel}`);
      }
      
      console.log(`BaseAPI: Nueva instancia creada para ${this.currentModel}: ${!!this.modelInstance}`);
    }
    
    // Asegurarnos de que nunca devolvemos null
    if (!this.modelInstance) {
      console.error(`BaseAPI: No se pudo crear una instancia para el modelo: ${this.currentModel}`);
      throw new Error(`No se pudo crear una instancia para el modelo: ${this.currentModel}`);
    }
    
    return this.modelInstance;
  }

  // Implementación de los métodos que delegan a la instancia específica
  async generateResponse(prompt: string): Promise<string> {
    try {
      // Log del prompt enviado al modelo
      console.log(`[BaseAPI][${this.currentModel}] PROMPT::: `, prompt);
      
      console.log(`[BaseAPI] Generando respuesta con modelo: ${this.currentModel}`);
      const modelInstance = this.getModelInstance();
      console.log(`[BaseAPI] Instancia del modelo obtenida: ${!!modelInstance}, tipo: ${this.currentModel}`);
      
      const response = await modelInstance.generateResponse(prompt);
      
      // Log de la respuesta recibida
      console.log(`[BaseAPI][${this.currentModel}] RESPONSE::: `, response);
      
      // Procesamiento común para ambos modelos
      return this.normalizeResponse(response);
    } catch (error) {
      console.error(`[BaseAPI] Error generando respuesta con ${this.currentModel}:`, error);
      throw error;
    }
  }

  abortRequest(): void {
    if (this.modelInstance) {
      this.modelInstance.abortRequest();
    }
  }

  // Método para normalizar respuestas de diferentes modelos
  private normalizeResponse(response: string): string {
    if (!response) return "";
    
    // Normalización específica por modelo
    if (this.currentModel === "ollama") {
      // Procesamiento específico para Ollama si es necesario
      return response.trim();
    } else if (this.currentModel === "gemini") {
      // Procesamiento específico para Gemini si es necesario
      return response.trim();
    }
    
    return response.trim();
  }
}