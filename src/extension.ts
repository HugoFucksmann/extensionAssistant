import * as vscode from 'vscode';
import { WebViewManager } from './vscode_integration/webviewManager';
import { OrchestratorAgent } from './agents/orchestratorAgent';
import { MemoryAgent } from './agents/memory/memoryAgent';
import { CommandManager } from './commands/commandManager';

export async function activate(context: vscode.ExtensionContext) {
  console.log('Extension "extensionAssistant" is now active!');

  // Crear el proveedor de UI
  const webViewManager = new WebViewManager(context.extensionUri);
  
  // Crear el agente de memoria
  const memoryAgent = new MemoryAgent(context);
  
  // Inicializar el agente de memoria
  await memoryAgent.initialize((response) => webViewManager.sendMessageToWebview(response));
  
  // Crear el orquestrador (sin inicializar BaseAPI)
  const orchestratorAgent = new OrchestratorAgent(
    memoryAgent,
    webViewManager
  );
  
  // Crear el gestor de comandos (que ahora maneja BaseAPI)
  const commandManager = new CommandManager(
    memoryAgent,
    orchestratorAgent,
    webViewManager
  );
  
  // Configurar el orquestrador con la instancia de BaseAPI del CommandManager
  orchestratorAgent.setModelAPI(commandManager.getModelAPI());
  
  // Inicializar el orquestrador
  await orchestratorAgent.initialize(context);
  
  // Configurar el WebViewManager con el orquestrador y el gestor de comandos
  webViewManager.setOrchestratorAgent(orchestratorAgent);
  webViewManager.setCommandManager(commandManager);
  
  // Cargar la configuración del modelo desde la configuración de VS Code
  const config = vscode.workspace.getConfiguration('extensionAssistant');
  const modelType = config.get<'ollama' | 'gemini'>('modelType') || 'gemini';
  
  // Establecer el modelo inicial
  await commandManager.executeCommand('setModel', { modelType });
  console.log(`Modelo inicial establecido a: ${commandManager.getCurrentModel()}`);
  
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      WebViewManager.viewType,
      webViewManager
    )
  );

  // Registrar un comando para abrir la vista de chat
  context.subscriptions.push(
    vscode.commands.registerCommand('extensionAssistant.openChat', () => {
      vscode.commands.executeCommand('workbench.view.extension.ai-chat-sidebar');
    })
  );

  // Registrar un comando para enviar un mensaje de prueba
  context.subscriptions.push(
    vscode.commands.registerCommand('extensionAssistant.sendTestMessage', async () => {
      await orchestratorAgent.processUserMessage('Mensaje de prueba desde comando');
    })
  );
  
  // Registrar recursos para limpieza durante la desactivación
  context.subscriptions.push({
    dispose: () => {
      orchestratorAgent.dispose();
      // El orquestrador ya se encarga de liberar los recursos de los agentes
    }
  });
}

export function deactivate() {
  // Limpiar recursos cuando se desactive la extensión
  console.log('Extension "extensionAssistant" is now deactivated!');
}