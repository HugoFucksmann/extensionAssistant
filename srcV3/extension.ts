import * as vscode from 'vscode';
import { WebviewProvider } from './ui/webView/webviewProvider';
import { ConfigurationManager } from './config/ConfigurationManager';
import { initializePromptSystem } from './models/promptSystem';
import { ModelManager } from './models/config/ModelManager';
import { ChatService } from './services/chatService';
import { OrchestratorService } from './services/orchestratorService';

export function activate(context: vscode.ExtensionContext) {
  const config = new ConfigurationManager(context);
  const modelManager = new ModelManager(config);
  initializePromptSystem(modelManager);

  const chatService = new ChatService(context, modelManager);
  const orchestrator = new OrchestratorService(chatService);
  const webview = new WebviewProvider(context.extensionUri, config, chatService, orchestrator);
  
  // Initialize theme handler
  webview.setThemeHandler();

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('aiChat.chatView', webview),
    
    // Register new titlebar commands
    vscode.commands.registerCommand('extensionAssistant.newChat', () => {
      webview.createNewChat();
    }),
    
    vscode.commands.registerCommand('extensionAssistant.settings', async () => {
      // Open VS Code settings focused on extension settings
      await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:user.extensionassistant');
    }),

    vscode.commands.registerCommand('extensionAssistant.switchModel', async () => {
      const current = config.getModelType();
      const newModel = current === 'ollama' ? 'gemini' : 'ollama';
      await modelManager.setModel(newModel);
      webview.updateModel(newModel);
    }),

    vscode.commands.registerCommand('extensionAssistant.chat.history', () => {
      webview.postMessage('command', { command: 'showHistory' });
    }),

    vscode.commands.registerCommand('extensionAssistant.model.change', async () => {
      const current = config.getModelType();
      const newModel = current === 'ollama' ? 'gemini' : 'ollama';
      await modelManager.setModel(newModel);
      webview.updateModel(newModel);
    })
  );

  context.subscriptions.push(webview);

  console.log('[Extension] Activated with theme support and titlebar commands');
}

export function deactivate() {
  console.log('[Extension] Deactivated');
}