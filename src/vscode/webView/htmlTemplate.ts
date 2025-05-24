/**
 * Updated HTML template for React webview
 */

import * as vscode from 'vscode';

/**
 * Generates React-compatible HTML content
 */
export function getReactHtmlContent(extensionUri: vscode.Uri, webview: vscode.Webview): string {
  const nonce = getNonce();
  
 
  const reactUrl = 'https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js';
  const reactDomUrl = 'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js';
  
  // Webview script URI
  const webviewScript = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'out', 'webview.js')
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" 
          content="default-src 'none'; 
                   script-src ${webview.cspSource} https://cdnjs.cloudflare.com 'nonce-${nonce}'; 
                   style-src ${webview.cspSource} 'unsafe-inline';
                   font-src ${webview.cspSource};">
    <title>Extension Assistant</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-sideBar-background);
        }
        #root {
            width: 100%;
            height: 100vh;
            overflow: hidden;
        }
    </style>
</head>
<body>
    <div id="root"></div>
    
    <script nonce="${nonce}">
        // Initialize VS Code API
        const vscode = acquireVsCodeApi();
        window.vscode = vscode;
        console.log('VS Code API initialized');
    </script>
    
    <script nonce="${nonce}" src="${reactUrl}"></script>
    <script nonce="${nonce}" src="${reactDomUrl}"></script>
    <script nonce="${nonce}" src="${webviewScript}"></script>
</body>
</html>`;
}


function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}