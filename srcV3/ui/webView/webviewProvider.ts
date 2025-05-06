import * as vscode from 'vscode';
import { ConfigurationManager } from '../../config/ConfigurationManager';
import { getHtmlContent } from './htmlTemplate';

export class WebviewProvider implements vscode.WebviewViewProvider {
    private view?: vscode.WebviewView;
    
    constructor(
        private readonly extensionUri: vscode.Uri,
        private readonly configManager: ConfigurationManager
    ) {}

    public resolveWebviewView(webviewView: vscode.WebviewView): void {
        this.view = webviewView;
        this.configureWebview();
        this.setupMessageHandlers();
    }

    private configureWebview(): void {
        if (!this.view) return;
        
        this.view.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionUri]
        };
        
        this.view.webview.html = getHtmlContent(this.extensionUri, this.view.webview);
    }

    private setupMessageHandlers(): void {
        if (!this.view) return;

        this.view.webview.onDidReceiveMessage(message => {
            try {
                switch (message.type) {
                    case 'sendMessage':
                        this.handleSendMessage(message.text);
                        break;
                    case 'setModel':
                        this.handleSetModel(message.modelType);
                        break;
                }
            } catch (error) {
                this.handleError(error);
            }
        });
    }

    private handleSendMessage(text: string): void {
        if (!text.trim()) return;
        
        this.postMessage('messageResponse', {
            text: `Processed: ${text}`,
            sender: 'bot',
            timestamp: Date.now()
        });
    }

    private async handleSetModel(modelType: 'ollama' | 'gemini'): Promise<void> {
        await this.configManager.setModelType(modelType);
        this.postMessage('modelChanged', { modelType });
    }

    private handleError(error: unknown): void {
        console.error('Webview error:', error);
        this.postMessage('error', {
            message: error instanceof Error ? error.message : 'An error occurred'
        });
    }

    public updateModel(modelType: 'ollama' | 'gemini'): void {
        this.postMessage('modelChanged', { modelType });
    }

    private postMessage(type: string, payload: unknown): void {
        this.view?.webview.postMessage({ type, payload });
    }
}