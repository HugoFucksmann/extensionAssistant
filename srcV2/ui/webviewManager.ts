import * as vscode from 'vscode';
import { ConfigurationManager } from '../core/config/ConfigurationManager';
import { OrchestratorService } from '../orchestrator/orchestratorService';
import { WebviewProvider } from './webview/webviewProvider';
import { EventBus } from '../core/event/eventBus';
import { MESSAGE_TYPES } from '../core/config/constants';
import { SQLiteStorage } from '../core/storage/db/SQLiteStorage';

/**
 * Clase que centraliza toda la gestión de WebView
 * Maneja la creación, configuración y comunicación con el WebView
 * Implementa WebviewViewProvider para integración directa con VS Code
 */
export class WebViewManager implements vscode.WebviewViewProvider {
  public static readonly viewType = 'aiChat.chatView';
  private webviewProvider: WebviewProvider;
  private disposables: vscode.Disposable[] = [];

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly orchestratorService: OrchestratorService,
    private readonly storage: SQLiteStorage
  ) {
    // Crear el proveedor de webview con los servicios necesarios
    this.webviewProvider = new WebviewProvider(
      extensionUri,
      orchestratorService,
      storage
    );
    
    // Suscribirse a eventos relevantes del sistema
    this.setupEventListeners();
  }

  /**
   * Implementación de WebviewViewProvider.resolveWebviewView
   * Se llama cuando VS Code necesita crear o restaurar la vista del webview
   */
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void | Thenable<void> {
    // Delegar al proveedor de webview
    return this.webviewProvider.resolveWebviewView(webviewView, context, _token);
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

// Usar los tipos de mensajes definidos en constants.ts