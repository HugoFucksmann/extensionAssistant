import * as vscode from 'vscode';
import { BaseAPI } from '../../models/baseAPI';
import { EventBus } from '../../utils/eventBus';
import { Events } from '../../utils/events';

/**
 * ModelAgent es responsable de gestionar la interacción con los modelos de lenguaje.
 * Encapsula la lógica de selección de modelo, generación de respuestas y gestión de solicitudes.
 */
export class ModelAgent {
  private modelAPI: BaseAPI;
  private disposables: { dispose: () => void }[] = [];
  
  constructor() {
    // Inicializar con el modelo predeterminado
    this.modelAPI = new BaseAPI("gemini");
    
    // Configurar listeners de eventos
    this.setupEventListeners();
  }
  
  /**
   * Configura los listeners de eventos para responder a acciones del sistema
   */
  private setupEventListeners(): void {
    // No hay eventos específicos a los que el ModelAgent necesite suscribirse inicialmente
    // Los eventos se manejan a través de métodos públicos que son llamados por el OrchestratorAgent
  }
  
  /**
   * Inicializa el agente de modelo
   * @param context El contexto de la extensión
   */
  public async initialize(context: vscode.ExtensionContext): Promise<void> {
    console.log('ModelAgent inicializado');
    
    // Configurar el modelo predeterminado desde la configuración
    const config = vscode.workspace.getConfiguration('extensionAssistant');
    const modelType = config.get<'ollama' | 'gemini'>('modelType') || 'gemini';
    this.setModel(modelType);
  }
  
  /**
   * Cambia el modelo de lenguaje utilizado
   * @param modelType El tipo de modelo a utilizar ('ollama' o 'gemini')
   */
  public setModel(modelType: "ollama" | "gemini"): void {
    this.modelAPI.setModel(modelType);
    console.log(`Modelo cambiado a: ${modelType}`);
    
    // Publicar evento de cambio de modelo
    EventBus.publish(Events.MODEL.MODEL_CHANGED, { modelType });
  }
  
  /**
   * Genera una respuesta utilizando el modelo actual
   * @param prompt El prompt para generar la respuesta
   * @returns La respuesta generada por el modelo
   */
  public async generateResponse(prompt: string): Promise<string> {
    try {
      return await this.modelAPI.generateResponse(prompt);
    } catch (error: any) {
      console.error('Error al generar respuesta con el modelo:', error);
      throw new Error(`Error al generar respuesta: ${error.message || 'Desconocido'}`);
    }
  }
  
  /**
   * Cancela cualquier solicitud en curso al modelo
   */
  public abortRequest(): void {
    this.modelAPI.abortRequest();
  }
  
  /**
   * Limpia los recursos cuando la extensión es desactivada
   */
  public dispose(): void {
    console.log('ModelAgent eliminado');
    this.abortRequest();
    
    // Cancelar todas las suscripciones a eventos
    this.disposables.forEach(disposable => disposable.dispose());
    this.disposables = [];
  }
}
