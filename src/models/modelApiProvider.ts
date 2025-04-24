import { EventBus } from '../core/eventBus';
import { BaseAPI } from '../models/baseAPI';


/**
 * Proveedor centralizado de API de modelos
 * Maneja la creación y cambio de modelos de IA
 */
export class ModelAPIProvider {
  private modelAPI: BaseAPI;
  private currentModelType: 'ollama' | 'gemini';

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
  public async initialize(): Promise<void> {
    console.log(`[ModelAPIProvider] Inicializado con modelo: ${this.currentModelType}`);
  }

  /**
   * Cambia el modelo actual
   * @param modelType Tipo de modelo a utilizar
   */
  public async setModel(modelType: 'ollama' | 'gemini'): Promise<void> {
    if (!modelType) {
      throw new Error('Se requiere modelType para cambiar el modelo');
    }
    
    try {
      console.log(`[ModelAPIProvider] Cambiando modelo de ${this.currentModelType} a ${modelType}`);
      
      // Cambiar el modelo en la instancia de BaseAPI
      this.modelAPI.setModel(modelType);
      
      // Actualizar el tipo de modelo actual
      this.currentModelType = modelType;
      
      // Notificar que el modelo ha cambiado
      await this.eventBus.emit('model:changed', { modelType });
      
      console.log(`[ModelAPIProvider] Modelo cambiado exitosamente a ${modelType}`);
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