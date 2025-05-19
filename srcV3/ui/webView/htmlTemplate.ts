import * as vscode from 'vscode';

// Helper function to escape HTML special characters
function escapeHtml(unsafe: string): string {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export function getHtmlContent(extensionUri: vscode.Uri, webview: vscode.Webview): string {
    try {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(extensionUri, 'out', 'webview.js')
        ).toString();

        // Use nonce for security and proper escaping
        const nonce = getNonce();
        const cspSource = webview.cspSource;
        
        // Build HTML as a string with proper escaping
        return [
            '<!DOCTYPE html>',
            '<html lang="en">',
            '<head>',
            '    <meta charset="UTF-8">',
            `    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${escapeHtml(nonce)}'; style-src ${escapeHtml(cspSource)} 'unsafe-inline';">`,
            '    <meta name="viewport" content="width=device-width, initial-scale=1.0">',
            '    <title>Chat UI</title>',
            '</head>',
            '<body>',
            '    <div id="root"></div>',
            `    <script nonce="${escapeHtml(nonce)}">`,
            '        // Safely acquire the VS Code API only if it hasn\'t been acquired yet',
            '        if (typeof window.vscode === "undefined") {',
            '            try {',
            '                window.vscode = acquireVsCodeApi();',
            '            } catch (error) {',
            '                console.error("Error acquiring VS Code API:", error);',
            '                // Provide fallback implementation',
            '                window.vscode = {',
            '                    postMessage: function(msg) { console.log("[Mock] postMessage:", msg); },',
            '                    getState: function() { return { modelType: "gemini" }; },',
            '                    setState: function(state) { console.log("[Mock] setState:", state); }',
            '                };',
            '            }',
            '        }',
            '    </script>',
            `    <script nonce="${escapeHtml(nonce)}" src="${escapeHtml(scriptUri)}"></script>`,
            '</body>',
            '</html>'
        ].join('\n');
    } catch (error) {
        // Create error message safely
        const errorMessage = error instanceof Error ? error.message : String(error);
        const safeErrorMessage = escapeHtml(errorMessage);
        
        // Use array joining instead of template literals for the error page
        return [
            '<!DOCTYPE html>',
            '<html>',
            '<head>',
            '    <meta charset="UTF-8">',
            '    <title>Error Loading UI</title>',
            '    <style>',
            '        body { font-family: Arial, sans-serif; padding: 20px; color: #ff4444; }',
            '        pre { background: #f4f4f4; padding: 10px; border-radius: 4px; }',
            '    </style>',
            '</head>',
            '<body>',
            '    <h2>Error loading UI</h2>',
            '    <pre>' + safeErrorMessage + '</pre>',
            '</body>',
            '</html>'
        ].join('\n');
    }
}

// Helper function to generate a nonce
function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}