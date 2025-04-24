import { EventBus } from '../core/eventBus';
import { BaseAPI } from '../models/baseAPI';
import { ProjectMemory } from '../agents/memory/tools';

/**
 * Proveedor centralizado de API de modelos
 * Maneja la creación y cambio de modelos de IA
 */
export class ModelAPIProvider {
  private modelAPI: BaseAPI;
  private currentModelType: 'ollama' | 'gemini';
  private projectMemory!: ProjectMemory;

  constructor(
    private eventBus: EventBus,
    initialModelType: 'ollama' | 'gemini' = 'gemini'
  ) {
    this.currentModelType = initialModelType;
    this.modelAPI = new BaseAPI(this.currentModelType);
    
    // Suscribirse a eventos de cambio de modelo
    this.eventBus.on('model:change', async (payload) => {
      await this.setModel(payload.modelType);
    });
  }
  
  /**
   * Inicializa el proveedor de modelos
   */
  public async initialize(storage: any): Promise<void> {
    this.projectMemory = new ProjectMemory(storage);
    
    try {
      const savedModel = await this.projectMemory.getProjectMemory('global', 'preferred_model');
      
      if (savedModel?.content) {
        const modelType = savedModel.content as 'ollama' | 'gemini';
        console.log(`[ModelAPIProvider] Cargando modelo preferido: ${modelType}`);
        this.modelAPI.setModel(modelType);
        this.currentModelType = modelType;
      }
      
      // Notificar el modelo actual (predeterminado o guardado)
      await this.eventBus.emit('model:changed', { modelType: this.currentModelType });
    } catch (error) {
      console.error('[ModelAPIProvider] Error al cargar el modelo preferido:', error);
    }
    
    console.log(`[ModelAPIProvider] Inicializado con modelo: ${this.currentModelType}`);
  }

  /**
   * Cambia el modelo actual
   * @param modelType Tipo de modelo a utilizar
   */
  public async setModel(modelType: 'ollama' | 'gemini'): Promise<void> {
    if (!modelType) throw new Error('Se requiere modelType para cambiar el modelo');
    
    try {
      console.log(`[ModelAPIProvider] Cambiando modelo: ${this.currentModelType} → ${modelType}`);
      
      this.modelAPI.setModel(modelType);
      this.currentModelType = modelType;
      
      if (this.projectMemory) {
        await this.projectMemory.storeProjectMemory('global', 'preferred_model', modelType);
      }
      
      await this.eventBus.emit('model:changed', { modelType });
    } catch (error) {
      console.error(`[ModelAPIProvider] Error al cambiar modelo:`, error);
      throw error;
    }
  }
  
  /**
   * Genera una respuesta usando el modelo actual
   * @param prompt Texto de entrada para el modelo
   * @returns La respuesta generada por el modelo
   */
  public async generateResponse(prompt: string): Promise<string> {
    return this.modelAPI.generateResponse(prompt);
  }
  
  /**
   * Obtiene el tipo de modelo actual
   * @returns El tipo de modelo actual
   */
  public getCurrentModel(): 'ollama' | 'gemini' {
    return this.currentModelType;
  }
  
  /**
   * Cancela una solicitud en curso
   */
  public abortRequest(): void {
    this.modelAPI.abortRequest();
  }
}