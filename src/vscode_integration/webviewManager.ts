import * as vscode from 'vscode';
import { EventBus, EventType } from '../core/eventBus';

/**
 * Clase que centraliza toda la gestión de WebView
 * Maneja la creación, configuración y comunicación con el WebView
 */
export class WebViewManager implements vscode.WebviewViewProvider {
  public static readonly viewType = 'aiChat.chatView';
  private _view?: vscode.WebviewView;
  private messageQueue: any[] = []; // Cola para almacenar mensajes antes de que el webview esté listo
  private webviewReady = false;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly eventBus: EventBus
  ) {
    this.setupEventListeners();
  }
  
  /**
   * Configura los listeners de eventos para comunicación con el webview
   */
  private setupEventListeners(): void {
    // Mapa de eventos y sus manejadores
    const eventHandlers: Partial<Record<EventType, (payload: any) => void>> = {
      'message:receive': (payload) => {
        this.sendMessageToWebview(payload);
      },
      'message:processing': (payload) => {
        this.sendMessageToWebview({
          type: 'processingStatus',
          isProcessing: payload.isProcessing
        });
      },
      'model:changed': (payload) => {
        this.sendMessageToWebview({
          type: 'modelChanged',
          modelType: payload.modelType
        });
      },
      'chat:loaded': (payload) => {
        this.sendMessageToWebview({
          type: 'chatLoaded',
          chat: payload.chat,
          messagesLoaded: payload.messagesLoaded
        });
      },
      'chat:list:loaded': (payload) => {
        this.sendMessageToWebview({
          type: 'historyLoaded',
          history: payload.chatList
        });
      },
      'error': (payload) => {
        this.sendMessageToWebview({
          type: 'error',
          message: payload.message || 'Error desconocido'
        });
      }
    };
    
    // Registrar todos los manejadores de eventos
    Object.entries(eventHandlers).forEach(([event, handler]) => {
      if (handler) {
        this.eventBus.on(event as EventType, async (payload) => handler(payload));
      }
    });
    
    // Mantener el evento history:loaded por compatibilidad, pero redirigirlo a chat:list:loaded
    this.eventBus.on('history:loaded', async (payload) => {
      this.sendMessageToWebview({
        type: 'historyLoaded',
        history: payload.history
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
    this._view = webviewView;

    // Configurar opciones del webview
    this.configureWebviewOptions(webviewView);
    
    // Establecer el contenido HTML
    webviewView.webview.html = this.getHtmlContent(webviewView.webview);
    
    // Configurar los manejadores de mensajes
    this.setupMessageHandlers(webviewView);
    
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
      try {
        // Simplificar el manejo de mensajes usando un mapa de acciones
        const messageHandlers: Record<string, (data: any) => Promise<void>> = {
          'sendMessage': async (data) => {
            await this.eventBus.emit('message:send', { message: data.message });
          },
          'newChat': async () => {
            await vscode.commands.executeCommand('extensionAssistant.createNewChat');
          },
          'loadChat': async (data) => {
            await vscode.commands.executeCommand('extensionAssistant.loadChat', { 
              chatId: data.chatId,
              loadMessages: true
            });
          },
          'loadHistory': async () => {
            await vscode.commands.executeCommand('extensionAssistant.loadChatList');
          },
          'setModel': async (data) => {
            if (data.modelType === 'ollama' || data.modelType === 'gemini') {
              await this.eventBus.emit('model:change', { modelType: data.modelType });
            } else {
              throw new Error(`Modelo no soportado: ${data.modelType}`);
            }
          }
        };
        
        const handler = messageHandlers[message.type];
        if (handler) {
          await handler(message);
        } else {
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
    if (this.webviewReady && this._view) {
      this._view.webview.postMessage(message);
    } else {
      this.messageQueue.push(message);
    }
  }
  
  /**
   * Procesa la cola de mensajes pendientes
   */
  private processMessageQueue(): void {
    if (this.webviewReady && this._view && this.messageQueue.length) {
      this.messageQueue.forEach(m => this._view!.webview.postMessage(m));
      this.messageQueue = [];
    }
  }

  /**
   * Genera el contenido HTML para el webview
   */
  private getHtmlContent(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'out', 'webview.js')
    );

    const nonce = this.generateNonce();
    
    // Log para depuración
    console.log(`Cargando webview con scriptUri: ${scriptUri}`);

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} https: data:; script-src 'nonce-${nonce}' 'unsafe-eval'; connect-src https: http: ws:;">
      <title>AI Chat</title>
    </head>
    <body>
      <div id="root"></div>
      <script nonce="${nonce}">
        // Script de depuración
        console.log('Iniciando carga del webview');
        window.onerror = function(message, source, lineno, colno, error) {
          console.error('Error en webview:', message, 'en', source, lineno, colno, error);
          return false;
        };
      </script>
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