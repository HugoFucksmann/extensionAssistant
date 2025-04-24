import * as vscode from 'vscode';
import { WebViewManager } from './vscode_integration/webviewManager';
import { OrchestratorAgent } from './agents/orchestratorAgent';
import { MemoryAgent } from './agents/memory/memoryAgent';
import { CommandManager } from './commands/commandManager';
import { ModelAPIProvider } from './models/modelApiProvider';
import { EventBus } from './core/eventBus';

export async function activate(context: vscode.ExtensionContext) {
  console.log('Extension "extensionAssistant" is now active!');

  // Crear el bus de eventos central
  const eventBus = new EventBus();
  
  // Cargar la configuración del modelo desde la configuración de VS Code
  const config = vscode.workspace.getConfiguration('extensionAssistant');
  const modelType = config.get<'ollama' | 'gemini'>('modelType') || 'gemini';
  
  // Crear el proveedor de modelos
  const modelProvider = new ModelAPIProvider(eventBus, modelType);
  await modelProvider.initialize();
  
  // Crear el WebViewManager
  const webViewManager = new WebViewManager(context.extensionUri, eventBus);
  
  // Crear el agente de memoria
  const memoryAgent = new MemoryAgent(context, eventBus);
  
  // Inicializar el agente de memoria
  await memoryAgent.initialize();
  
  // Crear el orquestrador
  const orchestratorAgent = new OrchestratorAgent(eventBus, modelProvider);
  
  // Crear el gestor de comandos
  const commandManager = new CommandManager(eventBus);
  
  // Inicializar el orquestrador
  await orchestratorAgent.initialize(context);
  
  // Registrar el WebViewManager como proveedor de vistas
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      WebViewManager.viewType,
      webViewManager
    )
  );

  // Registrar los comandos
  const commandDisposables = commandManager.registerCommands(context);
  commandDisposables.forEach(disposable => context.subscriptions.push(disposable));

  // Registrar un comando para abrir la vista de chat
  context.subscriptions.push(
    vscode.commands.registerCommand('extensionAssistant.openChat', () => {
      vscode.commands.executeCommand('workbench.view.extension.ai-chat-sidebar');
    })
  );

  // Registrar un comando para enviar un mensaje de prueba
  context.subscriptions.push(
    vscode.commands.registerCommand('extensionAssistant.sendTestMessage', async () => {
      // Usar el bus de eventos para enviar el mensaje de prueba
      await eventBus.emit('message:send', { 
        message: 'Mensaje de prueba desde comando' 
      });
    })
  );
  
  // Establecer el modelo inicial
  await eventBus.emit('model:change', { modelType });
  console.log(`Modelo inicial establecido a: ${modelType}`);
  
  // Registrar recursos para limpieza durante la desactivación
  context.subscriptions.push({
    dispose: () => {
      console.log('Liberando recursos...');
      // Liberar recursos en orden inverso
      orchestratorAgent.dispose();
      if (memoryAgent.dispose) {
        memoryAgent.dispose();
      }
      // El modelProvider tiene un método para abortar solicitudes
      modelProvider.abortRequest();
    }
  });
}

export function deactivate() {
  // Limpiar recursos cuando se desactive la extensión
  console.log('Extension "extensionAssistant" is now deactivated!');
}