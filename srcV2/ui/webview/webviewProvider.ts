import * as vscode from 'vscode';
import { UIStateContext } from '../../core/context/uiStateContext';
import { ChatService } from '../../services/chatService';
import { getHtmlContent } from './templates/htmlTemplate';
import { setupMessageHandlers } from './handlers/messageHandlers';
import { setupStateListeners } from './handlers/stateHandlers';

/**
 * Implementación del proveedor de webview
 */
export class WebviewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private messageQueue: any[] = []; // Cola para almacenar mensajes antes de que el webview esté listo
  private webviewReady = false;
  private stateUnsubscribers: (() => void)[] = [];

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly uiStateContext: UIStateContext,
    private readonly chatService: ChatService
  ) {}

  /**
   * Método requerido por la interfaz WebviewViewProvider
   * Se llama cuando VS Code necesita crear o restaurar la vista del webview
   */
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void | Thenable<void> {
    this.view = webviewView;

    // Configurar opciones del webview
    this.configureWebviewOptions(webviewView);
    
    // Establecer el contenido HTML
    webviewView.webview.html = getHtmlContent(this.extensionUri, webviewView.webview);
    
    // Configurar los manejadores de mensajes
    setupMessageHandlers(webviewView, this.uiStateContext, this.chatService);
    
    // Configurar las suscripciones a cambios de estado
    this.stateUnsubscribers = setupStateListeners(
      this.uiStateContext,
      this.sendMessageToWebview.bind(this)
    );
    
    // Marcar el webview como listo y procesar mensajes pendientes
    this.webviewReady = true;
    this.processMessageQueue();
  }

  /**
   * Configura las opciones del webview
   */
  private configureWebviewOptions(webviewView: vscode.WebviewView): void {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.extensionUri, 'out'),
        vscode.Uri.joinPath(this.extensionUri, 'media')
      ]
    };
  }

  /**
   * Envía un mensaje al webview
   */
  public sendMessageToWebview(message: any): void {
    if (this.webviewReady && this.view) {
      this.view.webview.postMessage(message);
    } else {
      this.messageQueue.push(message);
    }
  }
  
  /**
   * Procesa la cola de mensajes pendientes
   */
  private processMessageQueue(): void {
    if (this.webviewReady && this.view && this.messageQueue.length) {
      this.messageQueue.forEach(m => this.view!.webview.postMessage(m));
      this.messageQueue = [];
    }
  }
  
  /**
   * Limpia los recursos al desactivar la extensión
   */
  public dispose(): void {
    // Cancelar todas las suscripciones
    this.stateUnsubscribers.forEach(unsubscribe => unsubscribe());
    this.stateUnsubscribers = [];
  }
}