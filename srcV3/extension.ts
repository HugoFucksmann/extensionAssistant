import * as vscode from 'vscode';
import { WebviewProvider } from './ui/webView/webviewProvider';
import { ConfigurationManager } from './config/ConfigurationManager';
import { initializePromptSystem } from './models/promptSystem';
import { ModelManager } from './models/config/ModelManager';
import { ChatService } from './services/chatService';
import { Orchestrator } from './orchestrator/orchestrator'; // Update import statement
import { FileSystemService } from './services/fileSystemService';


export function activate(context: vscode.ExtensionContext) {
  const config = new ConfigurationManager(context);
  const modelManager = new ModelManager(config);
  initializePromptSystem(modelManager);

  const fileSystemService = new FileSystemService();
  const orchestrator = new Orchestrator(); // Replace OrchestratorService with Orchestrator
  const chatService = new ChatService(context, modelManager, orchestrator);
  const webview = new WebviewProvider(context.extensionUri, config, chatService, fileSystemService);
  
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
      // Show history panel by updating the state in the webview
      webview.showChatHistory();
    }),

    vscode.commands.registerCommand('extensionAssistant.model.change', async () => {
      const current = config.getModelType();
      const newModel = current === 'ollama' ? 'gemini' : 'ollama';
      await modelManager.setModel(newModel);
      webview.updateModel(newModel);
    })
  );

  context.subscriptions.push(webview);

  console.log('[Extension] Activated with theme support, file system access and titlebar commands');
}

export function deactivate() {
  console.log('[Extension] Deactivated');
}