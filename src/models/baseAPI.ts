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
    if (this.currentModel !== modelType) {
      this.currentModel = modelType;
      this.modelInstance = null; // Forzar recreación de la instancia
    }
  }

  // Método para obtener la instancia del modelo actual
  private getModelInstance(): ModelAPI {
    if (!this.modelInstance) {
      // Importaciones dinámicas para evitar dependencias circulares
      const { OllamaAPI } = require("./ollama");
      const { GeminiAPI } = require("./gemini");

      if (this.currentModel === "ollama") {
        this.modelInstance = new OllamaAPI();
      } else if (this.currentModel === "gemini") {
        this.modelInstance = new GeminiAPI("AIzaSyBXGZbSj099c4bUOpLxbXKJgysGKKF3sR0");
      } else {
        throw new Error(`Modelo no soportado: ${this.currentModel}`);
      }
    }
    // Asegurarnos de que nunca devolvemos null
    if (!this.modelInstance) {
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
      const response = await this.getModelInstance().generateResponse(prompt);
      
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