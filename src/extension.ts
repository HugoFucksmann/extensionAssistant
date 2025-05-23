// extension.ts
import * as vscode from 'vscode';
import { ComponentFactory } from './core/ComponentFactory'; // Ajusta la ruta
import { EventBus } from './features/events/EventBus'; // Ajusta la ruta
import { EventType, SystemEventPayload } from './features/events/eventTypes'; // Ajusta la ruta

export function activate(context: vscode.ExtensionContext) {
    console.log('Extension "Extension Assistant" is now active!');
    const outputChannel = vscode.window.createOutputChannel("Extension Assistant Log");
    outputChannel.appendLine('Extension "Extension Assistant" activating...');

    // Inicializar componentes principales usando la Factory
    // Esto también inicializará SessionManager con el contexto adecuado.
    const chatService = ComponentFactory.getChatService(context);
    const webviewProvider = ComponentFactory.getWebviewProvider(context); // Obtener WebviewProvider de la factory

    // Registrar el WebviewViewProvider
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            "aiChat.chatView", // Este ID debe coincidir con el de package.json
            webviewProvider,
            { webviewOptions: { retainContextWhenHidden: true } }
        )
    );

    // Registrar comandos
    context.subscriptions.push(
        vscode.commands.registerCommand('extensionAssistant.openChat', () => {
            // Este comando podría simplemente enfocar la vista si ya está abierta
            // O asegurar que la actividad de la barra lateral esté visible
            vscode.commands.executeCommand('workbench.view.extension.ai-chat-sidebar'); // ID del viewsContainers
            // Luego enfocar la webview específica
            setTimeout(() => { // Pequeño delay para asegurar que el contenedor esté visible
                 vscode.commands.executeCommand('aiChat.chatView.focus');
            }, 100);
            outputChannel.appendLine('Command: extensionAssistant.openChat executed.');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extensionAssistant.newChat', () => {
            // El WebviewProvider tiene un SessionManager, usarlo para iniciar el nuevo chat
            // y luego informar a la UI.
            webviewProvider.command_startNewChat();
            outputChannel.appendLine('Command: extensionAssistant.newChat executed.');
             // Asegurar que la vista esté visible y enfocada
            vscode.commands.executeCommand('workbench.view.extension.ai-chat-sidebar');
            setTimeout(() => {
                 vscode.commands.executeCommand('aiChat.chatView.focus');
            }, 100);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extensionAssistant.settings', () => {
            vscode.commands.executeCommand('workbench.action.openSettings', 'extensionAssistant');
            outputChannel.appendLine('Command: extensionAssistant.settings executed.');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extensionAssistant.chat.history', () => {
            webviewProvider.command_showHistory();
            outputChannel.appendLine('Command: extensionAssistant.chat.history executed.');
             // Asegurar que la vista esté visible y enfocada
            vscode.commands.executeCommand('workbench.view.extension.ai-chat-sidebar');
            setTimeout(() => {
                 vscode.commands.executeCommand('aiChat.chatView.focus');
            }, 100);
        })
    );


    // Evento de finalización de arranque de VS Code
    if (vscode.extensions.getExtension('vscode.git')) { // Ejemplo de dependencia, si la tienes
        vscode.commands.executeCommand('setContext', 'extensionAssistant.ready', true);
    }
    outputChannel.appendLine('Extension "Extension Assistant" activation finished.');

    // Emitir un evento de que la extensión se ha activado
    const eventBus = EventBus.getInstance();
    eventBus.emitEvent(EventType.SYSTEM_INFO, {
        message: 'Extension Assistant activated successfully.',
        level: 'info', // *** AÑADIR PROPIEDAD LEVEL ***
        source: 'extension.activate' // Opcional: añadir fuente
    } as SystemEventPayload); // Aserción de tipo para mayor seguridad
}

export function deactivate() {
    console.log('Extension "Extension Assistant" is now deactivated!');
    const outputChannel = vscode.window.createOutputChannel("Extension Assistant Log"); // O obtener la existente
    outputChannel.appendLine('Extension "Extension Assistant" deactivating...');
    
    EventBus.getInstance().dispose(); // Limpiar listeners del EventBus global
    outputChannel.appendLine('Extension "Extension Assistant" deactivation finished.');

}