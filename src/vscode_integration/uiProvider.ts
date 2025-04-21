import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class ChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'aiChat.chatView';
  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    console.log('Resolviendo webview view...');
    this._view = webviewView;

    webviewView.webview.options = {
      // Habilitar JavaScript en el webview
      enableScripts: true,
      
      // Restringir el webview a cargar solo contenido de nuestro directorio de extensión
      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, 'out'),
        vscode.Uri.joinPath(this._extensionUri, 'resources'),
        this._extensionUri
      ]
    };

    console.log('Configurando HTML del webview...');
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    console.log('HTML configurado.');

    // Manejar mensajes desde el webview
    webviewView.webview.onDidReceiveMessage(message => {
      console.log('Mensaje recibido del webview:', message);
      switch (message.command) {
        case 'sendMessage':
          this._handleSendMessage(message.text);
          return;
      }
    });
  }

  // Enviar un mensaje al webview
  public sendMessageToWebview(message: any) {
    if (this._view) {
      this._view.webview.postMessage(message);
    }
  }

  private _handleSendMessage(text: string) {
    // Aquí implementarías la lógica para procesar el mensaje del usuario
    // Por ejemplo, enviarlo a un modelo de IA y devolver la respuesta
    vscode.window.showInformationMessage(`Mensaje recibido: ${text}`);
    
    // Simular una respuesta para probar
    setTimeout(() => {
      this.sendMessageToWebview({
        command: 'receiveMessage',
        text: `Respuesta a: ${text}`,
        isUser: false
      });
    }, 1000);
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    // Obtener la ruta al archivo webview.js generado por webpack
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'out', 'webview.js')
    );

    // Usar nonce para solo permitir scripts específicos
    const nonce = getNonce();

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
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}