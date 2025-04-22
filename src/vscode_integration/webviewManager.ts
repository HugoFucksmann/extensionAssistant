import * as vscode from 'vscode';
import * as path from 'path';
import { EventBus } from '../utils/eventBus';
import { Events } from '../utils/events';

/**
 * Clase que centraliza toda la gestión de WebView
 * Maneja la creación, configuración y comunicación con el WebView
 */
export class WebViewManager implements vscode.WebviewViewProvider {
  public static readonly viewType = 'aiChat.chatView';
  private _view?: vscode.WebviewView;
  private disposables: { dispose: () => void }[] = [];

  constructor(
    private readonly _extensionUri: vscode.Uri
  ) {
    // Configurar los listeners de eventos
    this.setupEventListeners();
  }
  
  /**
   * Configura los listeners de eventos para responder a eventos del sistema
   */
  private setupEventListeners(): void {
    // Escuchar cuando se completa el procesamiento de un mensaje
    const processingCompletedUnsubscribe = EventBus.subscribe(
      Events.ORCHESTRATOR.PROCESSING_COMPLETED,
      (data) => {
        this.sendMessageToWebview({
          type: 'receiveMessage',
          message: data.assistantMessage.text,
          isUser: false
        });
      }
    );
    
    // Escuchar cuando hay un error en el procesamiento
    const processingErrorUnsubscribe = EventBus.subscribe(
      Events.ORCHESTRATOR.PROCESSING_ERROR,
      (data) => {
        this.sendMessageToWebview({
          type: 'receiveMessage',
          message: `Error al procesar la solicitud: ${data.error}`,
          isUser: false,
          isError: true
        });
      }
    );
    
    // Escuchar cuando se actualiza la lista de chats
    const chatListUpdatedUnsubscribe = EventBus.subscribe(
      Events.MEMORY.CHAT_LIST_UPDATED,
      (chats) => {
        this.sendMessageToWebview({
          type: 'historyLoaded',
          history: chats
        });
      }
    );
    
    // Escuchar cuando se carga un chat
    const chatLoadedUnsubscribe = EventBus.subscribe(
      Events.MEMORY.CHAT_LOADED,
      (chat) => {
        this.sendMessageToWebview({
          type: 'chatLoaded',
          chat
        });
      }
    );
    
    // Escuchar cuando se crea un nuevo chat
    const newChatCreatedUnsubscribe = EventBus.subscribe(
      Events.MEMORY.NEW_CHAT_CREATED,
      () => {
        // Enviar mensaje para limpiar el chat actual en la UI
        this.sendMessageToWebview({
          type: 'clearChat'
        });
      }
    );
    
    // Guardar las funciones para cancelar suscripciones
    this.disposables.push(
      { dispose: processingCompletedUnsubscribe },
      { dispose: processingErrorUnsubscribe },
      { dispose: chatListUpdatedUnsubscribe },
      { dispose: chatLoadedUnsubscribe },
      { dispose: newChatCreatedUnsubscribe }
    );
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
            // Mostrar el mensaje del usuario en la UI inmediatamente
            this.sendMessageToWebview({
              type: 'receiveMessage',
              message: message.message,
              isUser: true
            });
            
            // Publicar evento de mensaje enviado para procesamiento
            EventBus.publish(Events.UI.MESSAGE_SENT, {
              message: message.message
            });
            break;
            
          case 'newChat':
            // Publicar evento de nuevo chat solicitado
            EventBus.publish(Events.UI.NEW_CHAT_REQUESTED);
            break;
            
          case 'loadChat':
            // Publicar evento de carga de chat solicitada
            EventBus.publish(Events.UI.LOAD_CHAT_REQUESTED, {
              chatId: message.chatId
            });
            break;
            
          case 'setModel':
            // Publicar evento de cambio de modelo solicitado
            if (message.modelType === 'ollama' || message.modelType === 'gemini') {
              EventBus.publish(Events.UI.MODEL_CHANGE_REQUESTED, {
                modelType: message.modelType
              });
            } else {
              throw new Error(`Modelo no soportado: ${message.modelType}`);
            }
            break;
            
          default:
            console.warn('Tipo de mensaje no reconocido:', message.type);
        }
      } catch (error: any) {
        console.error('Error al procesar mensaje:', error);
        this.sendMessageToWebview({
          type: 'error',
          message: `Error: ${error.message || 'Desconocido'}`
        });
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
  
  /**
   * Libera los recursos utilizados por el WebViewManager
   */
  public dispose(): void {
    console.log('Liberando recursos del WebViewManager');
    
    // Cancelar todas las suscripciones a eventos
    this.disposables.forEach(disposable => disposable.dispose());
    this.disposables = [];
  }
}
