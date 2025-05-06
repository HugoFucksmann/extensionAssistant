import * as vscode from 'vscode';
import { WebviewProvider } from './ui/webView/webviewProvider';
import { ConfigurationManager } from './config/ConfigurationManager';

import { initializePromptSystem } from './models/promptSystem';
import { ModelManager } from './models/config/ModelManager';

export function activate(context: vscode.ExtensionContext) {
    // Inicializar configuración
    const config = new ConfigurationManager(context);
    
    // Inicializar el sistema con la configuración centralizada
    const modelManager = new ModelManager(config);
    
    // Inicializar el sistema de prompts
    initializePromptSystem(modelManager);
    
    // Registrar limpieza al desactivar
    context.subscriptions.push({
        dispose: () => modelManager.dispose()
    });
    
    // Inicializar webview
    const webview = new WebviewProvider(context.extensionUri, config);
    
    // Registrar webview y comandos esenciales
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('aiChat.chatView', webview),
        vscode.commands.registerCommand('extensionAssistant.model.change', async () => {
            const current = config.getModelType();
            const newModel = current === 'ollama' ? 'gemini' : 'ollama';
            await modelManager.setModel(newModel); // Cambia el modelo en ModelManager
            webview.updateModel(newModel);
        })
    );
    
    console.log('[Extension] Activada con sistema de modelos inicializado');
}

export function deactivate() {
    // El servicio se limpiará automáticamente gracias al registro en subscriptions
    console.log('[Extension] Desactivada');
}