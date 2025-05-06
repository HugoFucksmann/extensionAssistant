import * as vscode from 'vscode';

export function getHtmlContent(extensionUri: vscode.Uri, webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
        vscode.Uri.joinPath(extensionUri, 'out', 'webview.js')
    );

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Chat UI</title>
    </head>
    <body>
        <div id="root"></div>
        <script>
            window.vscode = acquireVsCodeApi();
        </script>
        <script src="${scriptUri}"></script>
    </body>
    </html>`;
}