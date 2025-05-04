import * as vscode from 'vscode';
import { ConfigurationManager } from '../core/config/ConfigurationManager';
import { OrchestratorService } from '../orchestrator/orchestratorService';
import { WebviewProvider } from './webview/webviewProvider';
import { ChatService } from '../services/chatService';
import { EventBus } from '../core/event/eventBus';

/**
 * Clase que centraliza toda la gestión de WebView
 * Maneja la creación, configuración y comunicación con el WebView
 */
export class WebViewManager {
  public static readonly viewType = 'aiChat.chatView';
  private webviewProvider: WebviewProvider;
  private disposables: vscode.Disposable[] = [];

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly chatService: ChatService,
    private readonly orchestratorService: OrchestratorService
  ) {
    // Crear el proveedor de webview con los servicios necesarios
    this.webviewProvider = new WebviewProvider(
      extensionUri,
      chatService,
      orchestratorService
    );
    
    // Suscribirse a eventos relevantes del sistema
    this.setupEventListeners();
  }

  /**
   * Registra el proveedor de webview en VS Code
   */
  public register(context: vscode.ExtensionContext): vscode.Disposable {
    // Registrar el proveedor de webview
    const providerRegistration = vscode.window.registerWebviewViewProvider(
      WebViewManager.viewType,
      this.webviewProvider
    );
    
    // Añadir a la lista de disposables
    this.disposables.push(providerRegistration);
    
    // Devolver un disposable compuesto para limpiar todos los recursos
    return {
      dispose: () => {
        providerRegistration.dispose();
      }
    };
  }

  /**
   * Configura los listeners de eventos para reaccionar a cambios en el sistema
   */
  private setupEventListeners(): void {
    // Suscribirse a eventos del orquestador si está disponible
    if (this.orchestratorService) {
      const eventBus = EventBus.getInstance();
      
      // Reaccionar a la finalización de orquestación
      eventBus.on('orchestration:completed', (result) => {
        // Notificar al webview sobre el resultado de la orquestación
        this.webviewProvider.sendMessageToWebview({
          type: MESSAGE_TYPES.ORCHESTRATION_RESULT,
          result
        });
      });
      
      // Reaccionar a eventos de progreso del orquestador
      eventBus.on('orchestration:progress', (data) => {
        this.webviewProvider.sendMessageToWebview({
          type: MESSAGE_TYPES.PROGRESS_UPDATE,
          data
        });
      });
    }
    
    // Suscribirse a cambios de configuración relevantes
    ConfigurationManager.getInstance().onChange('useOrchestration', (_key, value) => {
      // Notificar al webview sobre el cambio en el modo de orquestación
      this.webviewProvider.sendMessageToWebview({
        type: 'orchestration-mode',
        enabled: value
      });
    });
  }

  /**
   * Envía un mensaje al webview
   * Método de conveniencia para componentes externos
   */
  public sendMessage(message: any): void {
    this.webviewProvider.sendMessageToWebview(message);
  }

  /**
   * Limpia los recursos al desactivar la extensión
   */
  public dispose(): void {
    // Limpiar disposables
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
    
    // Limpiar el webview provider
    this.webviewProvider.dispose();
  }
}

enum MESSAGE_TYPES {
  ORCHESTRATION_RESULT,
  PROGRESS_UPDATE
}