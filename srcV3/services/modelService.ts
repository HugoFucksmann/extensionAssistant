import { PromptType, initializePromptSystem, executeModelInteraction, abortModelRequest, disposePromptSystem } from '../models/promptSystem';
import { ConfigurationManager } from '../config/ConfigurationManager';

/**
 * Clase singleton que proporciona una interfaz simple para interactuar con modelos de IA
 */
export class ModelService {
  private static instance: ModelService | null = null;
  private isInitialized: boolean = false;

  private constructor() {}

  /**
   * Obtiene la instancia única del servicio
   */
  public static getInstance(): ModelService {
    if (!ModelService.instance) {
      ModelService.instance = new ModelService();
    }
    return ModelService.instance;
  }

  /**
   * Inicializa el servicio de IA con la configuración proporcionada
   * @param config Instancia de ConfigurationManager
   */
  public initialize(config: ConfigurationManager): void {
    if (this.isInitialized) {
      console.log('[ModelService] Ya inicializado');
      return;
    }

    try {
      initializePromptSystem(config);
      this.isInitialized = true;
      console.log('[ModelService] Inicializado correctamente');
    } catch (error) {
      console.error('[ModelService] Error durante inicialización:', error);
      throw error;
    }
  }

  /**
   * Ejecuta una interacción con el modelo de IA
   * @param promptType Tipo de prompt a ejecutar
   * @param data Datos de contexto para el prompt
   * @returns Respuesta procesada según el tipo de prompt
   */
  public async execute<T = any>(promptType: PromptType, data: Record<string, any>): Promise<T> {
    this.ensureInitialized();
    
    try {
      console.log(`[ModelService] Ejecutando prompt '${promptType}'`);
      const result = await executeModelInteraction<T>(promptType, data);
      console.log(`[ModelService] result: '${result}'`);
      return result;
    } catch (error) {
      console.error(`[ModelService] Error al ejecutar prompt '${promptType}':`, error);
      throw error;
    }
  }

  /**
   * Cancela cualquier solicitud en curso
   */
  public abort(): void {
    if (this.isInitialized) {
      abortModelRequest();
    }
  }

  /**
   * Libera recursos
   */
  public dispose(): void {
    if (this.isInitialized) {
      disposePromptSystem();
      this.isInitialized = false;
    }
    ModelService.instance = null;
  }

  /**
   * Verifica que el servicio esté inicializado
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('ModelService no inicializado. Llame a initialize() primero.');
    }
  }
}

// Exporta una instancia del servicio para uso sencillo
export const modelService = ModelService.getInstance();