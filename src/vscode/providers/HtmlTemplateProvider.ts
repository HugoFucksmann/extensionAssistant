import * as vscode from 'vscode';

export class HtmlTemplateProvider {
    private static instance: HtmlTemplateProvider;

    private constructor() {
        // Private constructor to prevent instantiation
    }

    public static getInstance(): HtmlTemplateProvider {
        if (!HtmlTemplateProvider.instance) {
            HtmlTemplateProvider.instance = new HtmlTemplateProvider();
        }
        return HtmlTemplateProvider.instance;
    }

    public generateHtml(extensionUri: vscode.Uri): string {
        const scriptUri = vscode.Uri.joinPath(extensionUri, 'out', 'compiled', 'webview.js');
        const stylesUri = vscode.Uri.joinPath(extensionUri, 'media', 'styles.css');

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Extension Assistant</title>
                <link href="${stylesUri}" rel="stylesheet"/>
                <script>
                    const vscode = acquireVsCodeApi();
                </script>
            </head>
            <body>
                <div id="root"></div>
                <script src="${scriptUri}"></script>
            </body>
            </html>`;
    }

    public generateErrorHtml(error: string): string {
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Error</title>
            </head>
            <body>
                <div class="error-container">
                    <h1>Error</h1>
                    <p>${error}</p>
                </div>
                <style>
                    .error-container {
                        padding: 20px;
                        text-align: center;
                    }
                </style>
            </body>
            </html>`;
    }
}
