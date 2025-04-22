import * as vscode from 'vscode';
import { WebViewManager } from './vscode_integration/webviewManager';
import { OrchestratorAgent } from './agents/orchestratorAgent';
import { MemoryAgent } from './agents/memory/memoryAgent';
import { ModelAgent } from './agents/model/modelAgent';
import { AgentFactory } from './agents/factory';

export async function activate(context: vscode.ExtensionContext) {
  console.log('Extension "extensionAssistant" is now active!');

  // Crear la fábrica de agentes
  const agentFactory = new AgentFactory(context);
  
  // Configurar el proveedor de UI para la fábrica
  const webViewManager = new WebViewManager(context.extensionUri);
  agentFactory.setUIProvider(webViewManager);
  
  // Inicializar todos los agentes
  const agents = await agentFactory.createAndInitializeAgents();
  
  // Crear el orquestador con los agentes ya inicializados
  const orchestratorAgent = new OrchestratorAgent(
    agents.memoryAgent,
    agents.modelAgent,
    webViewManager
  );
  
  // Configurar el WebViewManager con el orquestador y los agentes
  webViewManager.setOrchestratorAgent(orchestratorAgent);
  webViewManager.setAgents(agents.memoryAgent, agents.modelAgent);
  
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
      agentFactory.dispose();
    }
  });
}

export function deactivate() {
  // Limpiar recursos cuando se desactive la extensión
  console.log('Extension "extensionAssistant" is now deactivated!');
}