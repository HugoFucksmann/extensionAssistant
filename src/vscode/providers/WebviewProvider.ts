import { WebviewMessage } from 'src/ui/types/WebviewTypes';
import * as vscode from 'vscode';


export class WebviewProvider {
    private static instance: WebviewProvider;
    private panel: vscode.WebviewPanel | undefined;
    private readonly viewType = 'extensionAssistant.webview';
    private readonly title = 'Extension Assistant';
    
    private constructor() {
        // Private constructor to prevent instantiation
    }

    public static getInstance(): WebviewProvider {
        if (!WebviewProvider.instance) {
            WebviewProvider.instance = new WebviewProvider();
        }
        return WebviewProvider.instance;
    }

    public createOrShow(context: vscode.ExtensionContext): void {
        const columnToShowIn = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it.
        if (this.panel) {
            this.panel.reveal(columnToShowIn);
            return;
        }

        // Otherwise, create a new panel.
        this.panel = vscode.window.createWebviewPanel(
            this.viewType,
            this.title,
            columnToShowIn || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(context.extensionUri, 'media'),
                    vscode.Uri.joinPath(context.extensionUri, 'out', 'compiled'),
                ],
            }
        );

        this.panel.webview.html = this.getHtmlForWebview(context.extensionUri);
        this.panel.onDidDispose(() => this.dispose(), null, context.subscriptions);

        // Handle messages from the webview
        this.panel.webview.onDidReceiveMessage(
            (message) => this.handleWebviewMessage(message),
            undefined,
            context.subscriptions
        );
    }

    private getHtmlForWebview(extensionUri: vscode.Uri): string {
        const scriptUri = this.panel!.webview.asWebviewUri(
            vscode.Uri.joinPath(extensionUri, 'out', 'compiled', 'webview.js')
        );

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Extension Assistant</title>
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

    private handleWebviewMessage(message: WebviewMessage): void {
        // This will be handled by MessageRouter in Phase 2
        console.log('[WebviewProvider] Received message:', message);
    }

    public dispose(): void {
        this.panel?.dispose();
    }
}
