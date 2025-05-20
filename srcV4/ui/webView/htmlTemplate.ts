/**
 * Plantilla HTML para el webview de la extensión
 */

import * as vscode from 'vscode';

/**
 * Genera el contenido HTML para el webview
 * @param extensionUri URI de la extensión
 * @param webview Instancia del webview
 * @returns Contenido HTML
 */
export function getHtmlContent(extensionUri: vscode.Uri, webview: vscode.Webview): string {
  // Obtener la URI para recursos locales
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'media', 'styles.css')
  );
  
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'media', 'main.js')
  );
  
  // Nonce para CSP
  const nonce = getNonce();
  
  return `<!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
    <link href="${styleUri}" rel="stylesheet">
    <title>Extension Assistant</title>
  </head>
  <body>
    <div id="app">
      <div class="chat-container">
        <div id="messages" class="messages"></div>
        
        <!-- Contenedor para mostrar el progreso de procesamiento -->
        <div id="processingContainer" class="processing-container hidden">
          <div class="processing-header">
            <span class="processing-title">Procesando...</span>
            <div class="processing-spinner"></div>
          </div>
          
          <!-- Fases del ciclo ReAct -->
          <div class="processing-phases">
            <div class="phase" data-phase="reasoning">
              <span class="phase-icon">🧠</span>
              <span class="phase-name">Razonamiento</span>
              <span class="phase-status"></span>
            </div>
            <div class="phase" data-phase="action">
              <span class="phase-icon">🛠️</span>
              <span class="phase-name">Acción</span>
              <span class="phase-status"></span>
            </div>
            <div class="phase" data-phase="reflection">
              <span class="phase-icon">🔍</span>
              <span class="phase-name">Reflexión</span>
              <span class="phase-status"></span>
            </div>
          </div>
          
          <!-- Herramientas en ejecución -->
          <div class="tool-execution">
            <h4>Herramientas</h4>
            <div id="toolsList" class="tools-list"></div>
          </div>
        </div>
        
        <div class="input-container">
          <textarea id="userInput" placeholder="Escribe un mensaje..."></textarea>
          <button id="sendButton">Enviar</button>
        </div>
      </div>
    </div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
  </body>
  </html>`;
}

/**
 * Genera un nonce aleatorio para CSP
 * @returns Nonce aleatorio
 */
function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}