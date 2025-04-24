"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const webviewManager_1 = require("./vscode_integration/webviewManager");
const orchestratorAgent_1 = require("./agents/orchestratorAgent");
const memoryAgent_1 = require("./agents/memory/memoryAgent");
const commandManager_1 = require("./commands/commandManager");
async function activate(context) {
    console.log('Extension "extensionAssistant" is now active!');
    // Crear el proveedor de UI
    const webViewManager = new webviewManager_1.WebViewManager(context.extensionUri);
    // Crear el agente de memoria
    const memoryAgent = new memoryAgent_1.MemoryAgent(context);
    // Inicializar el agente de memoria
    await memoryAgent.initialize((response) => webViewManager.sendMessageToWebview(response));
    // Crear el orquestrador (sin inicializar BaseAPI)
    const orchestratorAgent = new orchestratorAgent_1.OrchestratorAgent(memoryAgent, webViewManager);
    // Crear el gestor de comandos (que ahora maneja BaseAPI)
    const commandManager = new commandManager_1.CommandManager(memoryAgent, orchestratorAgent, webViewManager);
    // Configurar el orquestrador con la instancia de BaseAPI del CommandManager
    orchestratorAgent.setModelAPI(commandManager.getModelAPI());
    // Inicializar el orquestrador
    await orchestratorAgent.initialize(context);
    // Configurar el WebViewManager con el orquestrador y el gestor de comandos
    webViewManager.setOrchestratorAgent(orchestratorAgent);
    webViewManager.setCommandManager(commandManager);
    // Cargar la configuración del modelo desde la configuración de VS Code
    const config = vscode.workspace.getConfiguration('extensionAssistant');
    const modelType = config.get('modelType') || 'gemini';
    // Establecer el modelo inicial
    await commandManager.executeCommand('setModel', { modelType });
    console.log(`Modelo inicial establecido a: ${commandManager.getCurrentModel()}`);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(webviewManager_1.WebViewManager.viewType, webViewManager));
    // Registrar un comando para abrir la vista de chat
    context.subscriptions.push(vscode.commands.registerCommand('extensionAssistant.openChat', () => {
        vscode.commands.executeCommand('workbench.view.extension.ai-chat-sidebar');
    }));
    // Registrar un comando para enviar un mensaje de prueba
    context.subscriptions.push(vscode.commands.registerCommand('extensionAssistant.sendTestMessage', async () => {
        await orchestratorAgent.processUserMessage('Mensaje de prueba desde comando');
    }));
    // Registrar recursos para limpieza durante la desactivación
    context.subscriptions.push({
        dispose: () => {
            orchestratorAgent.dispose();
            // El orquestrador ya se encarga de liberar los recursos de los agentes
        }
    });
}
function deactivate() {
    // Limpiar recursos cuando se desactive la extensión
    console.log('Extension "extensionAssistant" is now deactivated!');
}
//# sourceMappingURL=extension.js.map