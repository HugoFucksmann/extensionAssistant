

export type ModelType = "ollama" | "gemini";

// Interfaz para implementaciones específicas de modelos
export interface ModelAPI {
  generateResponse(prompt: string): Promise<string>;
  abortRequest(): void;
}


export class BaseAPI {
  private modelInstance: ModelAPI | null = null;
  private currentModel: ModelType;
  private projectMemory: ProjectMemory | null = null;
  private eventBus: any; // Considera tipar si es posible

  constructor(
    eventBus: any,
    initialModelType: ModelType = "gemini"
  ) {
    this.eventBus = eventBus;
    this.currentModel = initialModelType;

    this.eventBus.on('model:change', async (payload: { modelType: ModelType }) => {
      if (payload?.modelType) {
        await this.setModel(payload.modelType);
      } else {
        console.warn('[BaseAPI] Evento model:change recibido sin modelType válido.');
      }
    });
    console.log(`[BaseAPI] Instanciado con modelo inicial: ${this.currentModel}`);
  }

  /**
   * Inicializa la API con el almacenamiento y carga el modelo preferido.
   */
  public async initialize(storage: any): Promise<void> {
    this.projectMemory = new ProjectMemory(storage);
    try {
      const savedModel = await this.projectMemory.getProjectMemory('global', 'preferred_model');
      const validModels: ModelType[] = ["ollama", "gemini"];

      if (savedModel?.content && validModels.includes(savedModel.content as ModelType)) {
        const modelType = savedModel.content as ModelType;
        console.log(`[BaseAPI] Cargando modelo preferido: ${modelType}`);
        await this.setModel(modelType); // Usa setModel para lógica centralizada
      } else {
         console.log(`[BaseAPI] Usando modelo por defecto: ${this.currentModel}`);
         // Asegura notificación del estado inicial si no se carga uno guardado
         await this.eventBus.emit('model:changed', { modelType: this.currentModel });
      }
    } catch (error) {
      console.error('[BaseAPI] Error al inicializar o cargar modelo preferido:', error);
       // Notifica el modelo actual incluso en caso de error
       await this.eventBus.emit('model:changed', { modelType: this.currentModel });
    }
    console.log(`[BaseAPI] Inicializado. Modelo actual: ${this.currentModel}`);
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
      if (this.projectMemory) {
        await this.projectMemory.storeProjectMemory('global', 'preferred_model', modelType);
      }
      // Notifica después de que el cambio interno se haya completado
      await this.eventBus.emit('model:changed', { modelType: this.currentModel });
      console.log(`[BaseAPI] Evento model:changed emitido para ${this.currentModel}.`);
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
   * Obtiene o crea la instancia del cliente API para el modelo actual.
   */
  private getModelInstance(): ModelAPI {
    if (!this.modelInstance) {
      console.log(`[BaseAPI] Creando nueva instancia para ${this.currentModel}`);

      if (this.currentModel === "ollama") {
        this.modelInstance = new OllamaAPI();
      } else if (this.currentModel === "gemini") {
        // ¡ADVERTENCIA! Claves hardcodeadas son inseguras. Usar variables de entorno.
        const apiKey = process.env.GEMINI_API_KEY || "TU_API_KEY_GEMINI_POR_DEFECTO_O_ERROR";
        if (!process.env.GEMINI_API_KEY) {
            console.warn("[BaseAPI] Clave API de Gemini no encontrada en process.env.GEMINI_API_KEY. Usando valor por defecto/hardcodeado.");
        }
        this.modelInstance = new GeminiAPI(apiKey);
      } else {
        // Esta rama no debería ser alcanzable si setModel valida correctamente
        throw new Error(`Modelo no soportado encontrado internamente: ${this.currentModel}`);
      }
    }

    // Asegura que la instancia nunca sea null después de la lógica de creación
    if (!this.modelInstance) {
       throw new Error(`Fallo crítico: No se pudo obtener instancia para ${this.currentModel}`);
    }
    return this.modelInstance;
  }

  /**
   * Genera una respuesta utilizando el modelo de IA configurado.
   * Recibe un prompt ya construido y devuelve la respuesta del modelo.
   */
  async generateResponse(prompt: string): Promise<string> {
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
        console.error("[BaseAPI] Intento de generar respuesta con prompt inválido.");
        throw new Error("El prompt no puede estar vacío.");
    }

    try {
      // Log conciso
      console.log(`[BaseAPI] Generando respuesta con ${this.currentModel} (Prompt len: ${prompt.length})`);
      const modelInstance = this.getModelInstance();
      const response = await modelInstance.generateResponse(prompt);
      console.log(`[BaseAPI] Respuesta recibida de ${this.currentModel} (Resp len: ${response.length})`);
      return response;
    } catch (error: any) {
      console.error(`[BaseAPI] Error generando respuesta con ${this.currentModel}:`, error.message);
      // Re-lanzar un error más genérico o específico de BaseAPI si se prefiere
      throw new Error(`Error al generar respuesta con ${this.currentModel}: ${error.message}`);
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