import * as vscode from 'vscode';
import * as path from 'path';
import { OrchestratorAgent } from '../agents/orchestratorAgent';
import { UIProvider } from '../interfaces';
import { CommandManager } from '../commands/commandManager';

/**
 * Clase que centraliza toda la gestión de WebView
 * Maneja la creación, configuración y comunicación con el WebView
 */
export class WebViewManager implements vscode.WebviewViewProvider, UIProvider {
  public static readonly viewType = 'aiChat.chatView';
  private _view?: vscode.WebviewView;

  private _orchestratorAgent: OrchestratorAgent | null = null;
  private _commandManager: CommandManager | null = null;

  constructor(
    private readonly _extensionUri: vscode.Uri
  ) {
    // El orquestador y el command manager se configurarán después de la inicialización
  }
  
  /**
   * Establece el agente orquestrador
   * @param orchestratorAgent El agente orquestrador inicializado
   */
  public setOrchestratorAgent(orchestratorAgent: OrchestratorAgent): void {
    this._orchestratorAgent = orchestratorAgent;
  }

  /**
   * Establece el gestor de comandos
   * @param commandManager El gestor de comandos inicializado
   */
  public setCommandManager(commandManager: CommandManager): void {
    this._commandManager = commandManager;
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
        // Verificar que el orquestrador y el command manager estén inicializados
        if (!this._orchestratorAgent) {
          throw new Error('OrchestratorAgent no inicializado');
        }
        
        if (!this._commandManager) {
          throw new Error('CommandManager no inicializado');
        }
        
        switch (message.type) {
          case 'sendMessage':
            // Procesamiento de mensajes de usuario a través del orquestrador
            await this._orchestratorAgent.processUserMessage(message.message);
            break;
            
          case 'newChat':
            // Delegar la creación de un nuevo chat al CommandManager
            await this._commandManager.executeCommand('createNewChat');
            break;
            
          case 'loadChat':
            // Delegar la carga de un chat al CommandManager
            await this._commandManager.executeCommand('loadChat', { chatId: message.chatId });
            break;
            
          case 'setModel':
            // Delegar el cambio de modelo directamente al OrchestratorAgent
            console.log(`WebViewManager: Recibido mensaje para cambiar modelo a ${message.modelType}`);
            
            if (message.modelType === 'ollama' || message.modelType === 'gemini') {
              try {
                console.log(`WebViewManager: Modelo actual antes del cambio: ${this._commandManager.getCurrentModel()}`);
                
                // El CommandManager se encarga de notificar a la UI
                await this._commandManager.executeCommand('setModel', { modelType: message.modelType });
                
                // Mostrar el modelo actual para debugging
                console.log(`WebViewManager: Modelo cambiado a ${this._commandManager.getCurrentModel()}`);
                
                // Enviar confirmación a la UI
                this.sendMessageToWebview({
                  type: 'modelChanged',
                  modelType: this._commandManager.getCurrentModel()
                });
              } catch (error) {
                console.error(`WebViewManager: Error al cambiar modelo:`, error);
                throw error;
              }
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
}
