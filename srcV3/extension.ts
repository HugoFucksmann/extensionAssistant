import * as vscode from 'vscode';
import { WebviewProvider } from './ui/webView/webviewProvider';
import { ConfigurationManager } from './config/ConfigurationManager';
import { modelService } from './services/modelService';


export function activate(context: vscode.ExtensionContext) {
    // Inicializar configuración
    const config = new ConfigurationManager(context);
    
    // Inicializar servicio de modelos
    modelService.initialize(config);
    
    // Registrar limpieza al desactivar
    context.subscriptions.push({
        dispose: () => modelService.dispose()
    });
    
    // Inicializar webview
    const webview = new WebviewProvider(context.extensionUri, config);
    
    // Registrar webview y comandos esenciales
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('aiChat.chatView', webview),
        vscode.commands.registerCommand('extensionAssistant.model.change', () => {
            const current = config.getModelType();
            const newModel = current === 'ollama' ? 'gemini' : 'ollama';
            config.setModelType(newModel);
            webview.updateModel(newModel);
        })
    );
    
    console.log('[Extension] Activada con servicio de modelos inicializado');
}

export function deactivate() {
    // El servicio se limpiará automáticamente gracias al registro en subscriptions
    console.log('[Extension] Desactivada');
}