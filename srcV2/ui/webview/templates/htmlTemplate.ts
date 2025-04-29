import * as vscode from 'vscode';
import { generateNonce, generateContentSecurityPolicy } from '../utils/securityUtils';

/**
 * Genera el contenido HTML para el webview
 */
export function getHtmlContent(extensionUri: vscode.Uri, webview: vscode.Webview): string {
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'out', 'webview.js')
  );

  const nonce = generateNonce();
  const csp = generateContentSecurityPolicy(webview.cspSource, nonce);
  
  // Log para depuración
  console.log(`Cargando webview con scriptUri: ${scriptUri}`);

  return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="${csp}">
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