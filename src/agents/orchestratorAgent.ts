import * as vscode from 'vscode';
import { EventBus } from '../utils/eventBus';
import { Events } from '../utils/events';
import { MemoryAgent } from './memory/memoryAgent';
import { ModelAgent } from './model/modelAgent';

/**
 * OrchestratorAgent es responsable de coordinar el flujo de procesamiento de mensajes
 * entre los diferentes agentes especializados utilizando un sistema de eventos.
 */
export class OrchestratorAgent {
  private disposables: { dispose: () => void }[] = [];

  constructor(
    private memoryAgent: MemoryAgent,
    private modelAgent: ModelAgent
  ) {
    console.log('OrchestratorAgent inicializado');
    this.setupEventListeners();
  }

  /**
   * Configura los listeners de eventos para responder a acciones del sistema
   */
  private setupEventListeners(): void {
    // Suscribirse al evento de mensaje enviado desde la UI
    const messageSentUnsubscribe = EventBus.subscribe(
      Events.UI.MESSAGE_SENT,
      (data: { message: string }) => this.processUserMessage(data.message)
    );
    
    // Suscribirse al evento de cambio de modelo
    const modelChangeUnsubscribe = EventBus.subscribe(
      Events.UI.MODEL_CHANGE_REQUESTED,
      (data: { modelType: 'ollama' | 'gemini' }) => this.modelAgent.setModel(data.modelType)
    );
    
    // Guardar las funciones para cancelar suscripciones
    this.disposables.push(
      { dispose: messageSentUnsubscribe },
      { dispose: modelChangeUnsubscribe }
    );
  }

  /**
   * Procesa un mensaje del usuario
   * @param message El texto del mensaje del usuario
   */
  public async processUserMessage(message: string): Promise<void> {
    console.log(`OrchestratorAgent procesando mensaje: ${message}`);
    
    // Notificar que se inició el procesamiento
    EventBus.publish(Events.ORCHESTRATOR.PROCESSING_STARTED, { message });
    
    // Mostrar una notificación en VS Code (opcional, para depuración)
    vscode.window.showInformationMessage(`Procesando: ${message}`);
    
    try {
      // 1. Obtener respuesta del modelo
      const assistantResponse = await this.modelAgent.generateResponse(message);
      
      // 2. Guardar el par mensaje-respuesta en la memoria
      const messagePair = await this.memoryAgent.processMessagePair(message, assistantResponse);
      
      // 3. Notificar que se completó el procesamiento
      EventBus.publish(Events.ORCHESTRATOR.PROCESSING_COMPLETED, {
        userMessage: messagePair.userMessage,
        assistantMessage: messagePair.assistantMessage
      });
    } catch (error: any) {
      console.error('Error al procesar mensaje:', error);
      
      // Notificar error
      EventBus.publish(Events.ORCHESTRATOR.PROCESSING_ERROR, {
        message,
        error: error.message || 'Error desconocido'
      });
    }
  }

  /**
   * Libera los recursos utilizados por el agente orquestador
   */
  public dispose(): void {
    console.log('Liberando recursos del OrchestratorAgent');
    
    // Cancelar todas las suscripciones a eventos
    this.disposables.forEach(disposable => disposable.dispose());
    this.disposables = [];
  }
}
