import * as vscode from 'vscode';
import { EventBus } from '../core/eventBus';

import { ModelResponse, UIResponse } from '../interfaces';
import { ModelAPIProvider } from '../models/modelApiProvider';

/**
 * OrchestratorAgent es responsable de coordinar el flujo de procesamiento.
 * Recibe mensajes del usuario, los procesa y devuelve respuestas.
 */
export class OrchestratorAgent {
  constructor(
    private eventBus: EventBus,
    private modelProvider: ModelAPIProvider
  ) {
    console.log('OrchestratorAgent inicializado');
    
    // Suscribirse a eventos relevantes
    this.setupEventListeners();
  }

  /**
   * Configura los listeners de eventos
   */
  private setupEventListeners(): void {
    // Escuchar mensajes de usuario para procesar
    this.eventBus.on('message:send', async (payload) => {
      await this.processUserMessage(payload.message);
    });
    
    // Escuchar cambios de modelo
    this.eventBus.on('model:change', async (payload) => {
      try {
        await this.modelProvider.setModel(payload.modelType);
        await this.eventBus.emit('model:changed', { 
          modelType: payload.modelType,
          success: true
        });
      } catch (error) {
        console.error('Error al cambiar modelo:', error);
        await this.eventBus.emit('error', {
          message: `Error al cambiar modelo: ${error instanceof Error ? error.message : 'Error desconocido'}`
        });
      }
    });
  }

  /**
   * Inicializa el agente orquestrador
   * @param context El contexto de la extensión
   */
  public async initialize(context: vscode.ExtensionContext): Promise<void> {
    console.log('Inicializando OrchestratorAgent...');
    // Cualquier inicialización específica del orquestrador
  }
  
  /**
   * Procesa un mensaje del usuario
   * @param message El texto del mensaje del usuario
   */
  public async processUserMessage(message: string): Promise<void> {
    console.log(`OrchestratorAgent procesando mensaje: ${message}`);
    
    try {
      // 1. Emitir evento para indicar que se está procesando
      await this.eventBus.emit('message:processing', { isProcessing: true });
      
      // 2. Generar respuesta con el modelo
      console.log('Enviando mensaje al modelo');
      const response = await this.modelProvider.generateResponse(message);
      console.log('Respuesta del modelo recibida');
      
      // 3. Emitir evento con la respuesta completa
      await this.eventBus.emit('message:receive', {
        type: 'receiveMessage',
        userMessage: message,
        message: response,
        isUser: false,
        modelType: this.modelProvider.getCurrentModel()
      });
      
      // 4. Indicar que se ha completado el procesamiento
      await this.eventBus.emit('message:processing', { isProcessing: false });
      
    } catch (error: any) {
      console.error('Error al procesar mensaje:', error);
      
      // Notificar error y finalizar procesamiento
      await this.eventBus.emit('error', {
        message: `Error al procesar la solicitud: ${error.message || 'Desconocido'}`
      });
      await this.eventBus.emit('message:processing', { isProcessing: false });
    }
  }

  /**
   * Libera los recursos utilizados por el agente orquestrador
   */
  public dispose(): void {
    console.log('Liberando recursos del OrchestratorAgent');
    // Cualquier limpieza necesaria
  }
}