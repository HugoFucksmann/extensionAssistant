import * as vscode from 'vscode';
import * as path from 'path';
import { OrchestratorAgent } from '../agents/orchestratorAgent';
import { MemoryAgent } from '../agents/memory/memoryAgent';
import { ModelAgent } from '../agents/model/modelAgent';

/**
 * Clase que centraliza toda la gestión de WebView
 * Maneja la creación, configuración y comunicación con el WebView
 */
export class WebViewManager implements vscode.WebviewViewProvider {
  public static readonly viewType = 'aiChat.chatView';
  private _view?: vscode.WebviewView;

  private _orchestratorAgent: OrchestratorAgent | null = null;
  private _memoryAgent: MemoryAgent | null = null;
  private _modelAgent: ModelAgent | null = null;

  constructor(
    private readonly _extensionUri: vscode.Uri
  ) {
    // Los agentes se configurarán después de la inicialización
  }
  
  /**
   * Establece el agente orquestrador
   * @param orchestratorAgent El agente orquestrador inicializado
   */
  public setOrchestratorAgent(orchestratorAgent: OrchestratorAgent): void {
    this._orchestratorAgent = orchestratorAgent;
  }
  
  /**
   * Establece los agentes especializados
   * @param memoryAgent El agente de memoria
   * @param modelAgent El agente de modelo
   */
  public setAgents(memoryAgent: MemoryAgent, modelAgent: ModelAgent): void {
    this._memoryAgent = memoryAgent;
    this._modelAgent = modelAgent;
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
        // Verificar que los agentes estén inicializados
        if (!this._orchestratorAgent) {
          throw new Error('OrchestratorAgent no inicializado');
        }
        
        if (!this._memoryAgent || !this._modelAgent) {
          throw new Error('Agentes especializados no inicializados');
        }
        
        switch (message.type) {
          case 'sendMessage':
            // Procesamiento de mensajes de usuario a través del orquestador
            await this._orchestratorAgent.processUserMessage(message.message);
            break;
            
          case 'newChat':
            // Comunicación directa con el MemoryAgent
            await this._memoryAgent.createNewChat(
              (response: any) => this.sendMessageToWebview(response)
            );
            break;
            
          case 'loadChat':
            // Comunicación directa con el MemoryAgent
            await this._memoryAgent.loadChat(message.chatId);
            break;
            
          case 'setModel':
            // Comunicación directa con el ModelAgent
            if (message.modelType === 'ollama' || message.modelType === 'gemini') {
              await this._modelAgent.setModel(message.modelType);
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
