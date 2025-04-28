type ModelType = "ollama" | "gemini";

// Interfaz para implementaciones específicas de modelos
export interface ModelAPI {
  generateResponse(prompt: string): Promise<string>;
  abortRequest(): void;
}

// Interfaz para los parámetros de generación de respuesta avanzada
export interface ResponseGenerationParams {
  userQuery: string;
  analysis: any;
  relevantFiles: any;
  codeExamination: any;
}

export class BaseAPI {
  protected abortController: AbortController | null = null;
  private modelInstance: ModelAPI | null = null;
  private currentModel: ModelType;
  private projectMemory: any; // Tipo any por ahora, se tipará correctamente en initialize
  private prompts: any; // Almacenará los templates de prompts

  constructor(
    private eventBus: any, // Tipo any por ahora, se tipará correctamente
    initialModelType: ModelType = "gemini"
  ) {
    this.currentModel = initialModelType;
    
    // Cargar los templates de prompts
    this.loadPrompts();
    
    // Suscribirse a eventos de cambio de modelo
    this.eventBus.on('model:change', async (payload: { modelType: ModelType }) => {
      await this.setModel(payload.modelType);
    });
  }
  
  /**
   * Carga los templates de prompts
   */
  private loadPrompts(): void {
    try {
      // Importar los prompts dinámicamente para evitar dependencias circulares
      const { PROMPTS } = require('../agents/prompts');
      this.prompts = PROMPTS;
    } catch (error) {
      console.error('[BaseAPI] Error al cargar los prompts:', error);
      this.prompts = {};
    }
  }

  /**
   * Inicializa la API con el almacenamiento para persistencia
   */
  public async initialize(storage: any): Promise<void> {
    const { ProjectMemory } = require('../core/memory/projectMemory');
    this.projectMemory = new ProjectMemory(storage);
    
    try {
      const savedModel = await this.projectMemory.getProjectMemory('global', 'preferred_model');
      
      if (savedModel?.content) {
        const modelType = savedModel.content as ModelType;
        console.log(`[BaseAPI] Cargando modelo preferido: ${modelType}`);
        this.setModel(modelType);
      }
      
      // Notificar el modelo actual (predeterminado o guardado)
      await this.eventBus.emit('model:changed', { modelType: this.currentModel });
    } catch (error) {
      console.error('[BaseAPI] Error al cargar el modelo preferido:', error);
    }
    
    console.log(`[BaseAPI] Inicializado con modelo: ${this.currentModel}`);
  }

  // Método para cambiar el modelo en tiempo de ejecución
  async setModel(modelType: ModelType): Promise<void> {
    if (!modelType) throw new Error('Se requiere modelType para cambiar el modelo');
    
    try {
      console.log(`[BaseAPI] Cambiando modelo: ${this.currentModel} → ${modelType}`);
      
      if (this.currentModel !== modelType) {
        console.log(`BaseAPI: Cambiando modelo de ${this.currentModel} a ${modelType}`);
        this.currentModel = modelType;
        this.modelInstance = null; // Forzar recreación de la instancia
        console.log(`BaseAPI: Modelo cambiado a ${this.currentModel}, instancia reseteada: ${this.modelInstance === null}`);
      } else {
        console.log(`BaseAPI: El modelo ya está configurado como ${modelType}, no se hace nada`);
      }
      
      if (this.projectMemory) {
        await this.projectMemory.storeProjectMemory('global', 'preferred_model', modelType);
      }
      
      await this.eventBus.emit('model:changed', { modelType });
    } catch (error) {
      console.error(`[BaseAPI] Error al cambiar modelo:`, error);
      throw error;
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

  // Método básico para generar respuestas con el modelo
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
      
      // Devolver la respuesta sin normalización
      return response;
    } catch (error) {
      console.error(`[BaseAPI] Error generando respuesta con ${this.currentModel}:`, error);
      throw error;
    }
  }
  
  /**
   * Método avanzado para generar respuestas basadas en análisis completo
   * @param params Parámetros para la generación de respuesta
   * @returns Respuesta generada
   */
  async generateAdvancedResponse(params: ResponseGenerationParams): Promise<string> {
    try {
      const { userQuery, analysis, relevantFiles, codeExamination } = params;
      
      // Extraer el problema principal del análisis
      const problem = analysis.objective || 'Resolver el problema del usuario';
      
      // Preparar los extractos de código consolidados
      const consolidatedCodeExtracts = codeExamination.consolidatedCodeExtracts || [];
      
      // Preparar los posibles problemas identificados
      const consolidatedPossibleIssues = codeExamination.possibleIssues || [];
      
      // Incluir análisis de causa raíz si está disponible
      const rootCauseAnalysis = codeExamination.rootCauseAnalysis || '';
      
      // Extraer solo las rutas de los archivos relevantes para simplificar
      // relevantFiles es un objeto con una propiedad relevantFiles que es un array
      const relevantFilesArray = relevantFiles.relevantFiles || [];
      const relevantFilePaths = relevantFilesArray.map((file: any) => file.path);
      
      // Verificar que tenemos el template de prompt necesario
      if (!this.prompts || !this.prompts.RESPONSE_GENERATION) {
        throw new Error('Template de prompt para generación de respuesta no disponible');
      }
      
      // Construir el prompt para la generación de respuesta
      let prompt = this.prompts.RESPONSE_GENERATION
        .replace('{userQuery}', userQuery)
        .replace('{analysis.objective}', problem)
        .replace('{relevantFilePaths}', JSON.stringify(relevantFilePaths))
        .replace('{consolidatedCodeExtracts}', JSON.stringify(consolidatedCodeExtracts))
        .replace('{consolidatedPossibleIssues}', JSON.stringify(consolidatedPossibleIssues))
        .replace('{rootCauseAnalysis}', rootCauseAnalysis);
      
      console.log('Generando respuesta avanzada con extractos de código:', consolidatedCodeExtracts.length);
      console.log('Posibles problemas identificados:', consolidatedPossibleIssues.length);
      
      // Generar respuesta con el modelo
      return await this.generateResponse(prompt);
    } catch (error) {
      console.error('Error al generar respuesta avanzada:', error);
      // Devolver una respuesta genérica en caso de error
      return `Lo siento, no pude generar una respuesta completa para tu consulta "${params.userQuery}". 
      
Parece que hubo un problema al analizar la información. Puedes intentar reformular tu pregunta o proporcionar más detalles sobre el problema que estás enfrentando.`;
    }
  }

  abortRequest(): void {
    if (this.modelInstance) {
      this.modelInstance.abortRequest();
    }
  }
}