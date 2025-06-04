
import * as vscode from 'vscode';

export function getReactHtmlContent(options: {
    scriptUri: vscode.Uri;
    nonce: string;
}): string {
    const { scriptUri, nonce } = options;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" 
          content="default-src 'none'; 
                   script-src vscode-resource: 'nonce-${nonce}'; 
                   style-src vscode-resource: 'unsafe-inline';
                   font-src vscode-resource:;">
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
        const vscode = acquireVsCodeApi();
        window.vscode = vscode;
    </script>
    
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}