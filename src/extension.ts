import * as vscode from 'vscode';
import { WebViewManager } from './vscode_integration/webviewManager';
import { OrchestratorAgent } from './agents/orchestratorAgent';
import { MemoryAgent } from './agents/memory/memoryAgent';
import { ModelAgent } from './agents/model/modelAgent';
import { AgentFactory } from './agents/factory';
import { EventBus } from './utils/eventBus';

export async function activate(context: vscode.ExtensionContext) {
  console.log('Extension "extensionAssistant" is now active!');

  // Crear la fábrica de agentes
  const agentFactory = new AgentFactory(context);
  
  // Inicializar todos los agentes
  const agents = await agentFactory.createAndInitializeAgents();
  
  // Crear el orquestrador con los agentes ya inicializados
  const orchestratorAgent = new OrchestratorAgent(
    agents.memoryAgent,
    agents.modelAgent
  );
  
  // Crear e inicializar el WebViewManager
  const webViewManager = new WebViewManager(context.extensionUri);
  
  // Registrar el WebViewManager como proveedor de vista
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
      webViewManager.dispose();
      agentFactory.dispose();
      EventBus.dispose(); // Limpiar todos los eventos al desactivar la extensión
    }
  });
}

export function deactivate() {
  // Limpiar recursos cuando se desactive la extensión
  console.log('Extension "extensionAssistant" is now deactivated!');
}