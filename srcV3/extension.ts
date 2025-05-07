import * as vscode from 'vscode';
import { WebviewProvider } from './ui/webView/webviewProvider';
import { ConfigurationManager } from './config/ConfigurationManager';
import { initializePromptSystem } from './models/promptSystem';
import { ModelManager } from './models/config/ModelManager';

export function activate(context: vscode.ExtensionContext) {
    // Initialize configuration
    const config = new ConfigurationManager(context);
    
    // Initialize the system with the centralized configuration
    const modelManager = new ModelManager(config);
    
    // Initialize the prompt system
    initializePromptSystem(modelManager);
    
    // Register cleanup on deactivation
    context.subscriptions.push({
        dispose: () => modelManager.dispose()
    });
    
    // Initialize webview with the context for storage access
    const webview = new WebviewProvider(context.extensionUri, config, context);
    
    // Register webview provider and essential commands
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('aiChat.chatView', webview),
        vscode.commands.registerCommand('extensionAssistant.model.change', async () => {
            const current = config.getModelType();
            const newModel = current === 'ollama' ? 'gemini' : 'ollama';
            await modelManager.setModel(newModel); // Change model in ModelManager
            webview.updateModel(newModel);
        }),
        // New command for creating a new chat
        vscode.commands.registerCommand('extensionAssistant.chat.new', () => {
            webview.postMessage('command', { command: 'newChat' });
        }),
        // New command for showing chat history
        vscode.commands.registerCommand('extensionAssistant.chat.history', () => {
            webview.postMessage('command', { command: 'showHistory' });
        })
    );
    
    // Add webview to disposables
    context.subscriptions.push(webview);
    
    console.log('[Extension] Activated with model system initialized');
}

export function deactivate() {
    // Services will be cleaned up automatically thanks to the registration in subscriptions
    console.log('[Extension] Deactivated');
}