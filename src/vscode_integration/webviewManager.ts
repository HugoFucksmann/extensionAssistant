import * as vscode from 'vscode';
import { EventBus } from '../core/eventBus';

/**
 * Clase que centraliza toda la gestión de WebView
 * Maneja la creación, configuración y comunicación con el WebView
 */
export class WebViewManager implements vscode.WebviewViewProvider {
  public static readonly viewType = 'aiChat.chatView';
  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly eventBus: EventBus
  ) {
    // Suscribirse a eventos para enviar al webview
    this.setupEventListeners();
  }
  
  /**
   * Configura los listeners de eventos para comunicación con el webview
   */
  private setupEventListeners(): void {
    // Escuchar eventos que deben enviarse al webview
    this.eventBus.on('message:receive', async (payload) => {
      this.sendMessageToWebview(payload);
    });
    
    this.eventBus.on('model:changed', async (payload) => {
      this.sendMessageToWebview({
        type: 'modelChanged',
        modelType: payload.modelType
      });
    });
    
    this.eventBus.on('chat:loaded', async (payload) => {
      this.sendMessageToWebview({
        type: 'chatLoaded',
        chat: payload.chat
      });
    });
    
    this.eventBus.on('history:loaded', async (payload) => {
      this.sendMessageToWebview({
        type: 'historyLoaded',
        history: payload.history
      });
    });
    
    this.eventBus.on('error', async (payload) => {
      this.sendMessageToWebview({
        type: 'error',
        message: payload.message || 'Error desconocido'
      });
    });
  }

  /**
   * Método requerido por la interfaz WebviewViewProvider
   * Se llama cuando VS Code necesita crear o restaurar la vista del webview
   */
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void | Thenable<void> {
    console.log('Resolviendo webview view...');
    this._view = webviewView;

    // Configurar opciones del webview
    this.configureWebviewOptions(webviewView);
    
    // Establecer el contenido HTML
    webviewView.webview.html = this.getHtmlContent(webviewView.webview);
    
    // Configurar los manejadores de mensajes
    this.setupMessageHandlers(webviewView);
  }

  /**
   * Configura las opciones del webview
   */
  private configureWebviewOptions(webviewView: vscode.WebviewView): void {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, 'out'),
        vscode.Uri.joinPath(this._extensionUri, 'resources'),
        this._extensionUri
      ]
    };
  }

  /**
   * Configura los manejadores de mensajes desde el webview
   */
  private setupMessageHandlers(webviewView: vscode.WebviewView): void {
    webviewView.webview.onDidReceiveMessage(async message => {
      console.log('Mensaje recibido del webview:', message);
      
      try {
        switch (message.type) {
          case 'sendMessage':
            // Emitir evento para procesar mensaje del usuario
            await this.eventBus.emit('message:send', { message: message.message });
            break;
            
          case 'newChat':
            // Emitir evento para crear nuevo chat
            await this.eventBus.emit('chat:new');
            break;
            
          case 'loadChat':
            // Emitir evento para cargar un chat
            await this.eventBus.emit('chat:load', { chatId: message.chatId });
            break;
            
          case 'setModel':
            if (message.modelType === 'ollama' || message.modelType === 'gemini') {
              // Emitir evento para cambiar modelo
              await this.eventBus.emit('model:change', { modelType: message.modelType });
            } else {
              throw new Error(`Modelo no soportado: ${message.modelType}`);
            }
            break;
            
          default:
            console.warn('Tipo de mensaje no reconocido:', message.type);
        }
      } catch (error: any) {
        console.error('Error al procesar mensaje:', error);
        this.eventBus.emit('error', { message: error.message || 'Error desconocido' });
      }
    });
  }

  /**
   * Envía un mensaje al webview
   */
  public sendMessageToWebview(message: any): void {
    if (this._view) {
      console.log('Enviando mensaje al webview:', message);
      this._view.webview.postMessage(message);
    } else {
      console.warn('No se puede enviar mensaje: webview no inicializado');
    }
  }

  /**
   * Genera el contenido HTML para el webview
   */
  private getHtmlContent(webview: vscode.Webview): string {
    // Obtener la ruta al archivo webview.js generado por webpack
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'out', 'webview.js')
    );

    // Usar nonce para solo permitir scripts específicos
    const nonce = this.generateNonce();

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}'; connect-src https:;">
      <title>AI Chat</title>
    </head>
    <body>
      <div id="root"></div>
      <script nonce="${nonce}" src="${scriptUri}"></script>
    </body>
    </html>`;
  }

  /**
   * Genera un nonce aleatorio para la política de seguridad de contenido
   */
  private generateNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}