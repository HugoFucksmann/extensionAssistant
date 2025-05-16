import * as vscode from 'vscode';
import { WebviewProvider } from './ui/webView/webviewProvider';
import { ConfigurationManager } from './config/ConfigurationManager';
import { initializePromptSystem, disposePromptSystem, executeModelInteraction, getPromptDefinitions } from './models/promptSystem';
import { ModelManager } from './models/config/ModelManager';
import { ChatService } from './services/chatService';
import { Orchestrator } from './orchestrator/orchestrator';
import { FileSystemService } from './services/fileSystemService'; // Keep for now
import { DatabaseManager } from './store/database/DatabaseManager';

// Import new context classes
import { GlobalContext, SessionContext, ConversationContext, FlowContext } from './orchestrator/context';

// Import new agents service
import { AgentOrchestratorService } from './orchestrator/agents/AgentOrchestratorService';

// Declare context variables
let globalContext: GlobalContext | null = null;
let sessionContext: SessionContext | null = null;
let dbManager: DatabaseManager | null = null;
let agentOrchestratorService: AgentOrchestratorService | null = null;
let configManager: ConfigurationManager | null = null; // <-- Declare configManager

export async function activate(context: vscode.ExtensionContext) {
  console.log('[Extension] Activating...');

  // Initialize ConfigurationManager
  configManager = new ConfigurationManager(context); // <-- Initialize and store

  // Initialize DatabaseManager (Singleton)
  dbManager = DatabaseManager.getInstance(context);

  // Initialize GlobalContext
  globalContext = new GlobalContext(context, configManager); // Pass configManager
  globalContext.getProjectInfo(); // Start fetching if not loaded

  // Initialize SessionContext
  sessionContext = new SessionContext(context, globalContext);

  // Initialize ModelManager
  const modelManager = new ModelManager(configManager); // Pass configManager
  initializePromptSystem(modelManager); // Initialize PromptSystem's internal ModelManager

  // Initialize AgentOrchestratorService with context, prompt functions, DB Manager, AND Config Manager
  agentOrchestratorService = new AgentOrchestratorService(
      context,
      { executeModelInteraction: executeModelInteraction, getPromptDefinitions: getPromptDefinitions },
      dbManager,
      configManager // <-- Pass configManager
  );

  const orchestrator = new Orchestrator(globalContext, sessionContext);

  // Pass AgentOrchestratorService to ChatService
  const chatService = new ChatService(context, modelManager, orchestrator, globalContext, sessionContext, agentOrchestratorService);

  // Initialize WebviewProvider with configManager and agentOrchestratorService
  const webview = new WebviewProvider(context.extensionUri, configManager, chatService, agentOrchestratorService); // <-- Pass dependencies

  webview.setThemeHandler(); // Uses configManager internally

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('aiChat.chatView', webview)
  );

  // Register Commands (remain the same)
  context.subscriptions.push(
    vscode.commands.registerCommand('extensionAssistant.newChat', () => {
      chatService.prepareNewConversation();
      webview.createNewChat();
    }),
    vscode.commands.registerCommand('extensionAssistant.settings', async () => {
      // Open settings for the extension
      await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:user.extensionassistant');
    }),
    vscode.commands.registerCommand('extensionAssistant.switchModel', async () => {
      const current = configManager!.getModelType(); // Use stored configManager
      const newModel = current === 'ollama' ? 'gemini' : 'ollama';
      await modelManager.setModel(newModel);
      webview.updateModel(newModel);
    }),
    vscode.commands.registerCommand('extensionAssistant.chat.history', () => {
      webview.showChatHistory();
    }),
    vscode.commands.registerCommand('extensionAssistant.model.change', async () => {
      const current = configManager!.getModelType(); // Use stored configManager
      const newModel = current === 'ollama' ? 'gemini' : 'ollama';
      await modelManager.setModel(newModel);
      webview.updateModel(newModel);
    }),
    vscode.commands.registerCommand('extension.resetDatabase', async () => {
      try {
        if (dbManager) {
           if (agentOrchestratorService) {
               agentOrchestratorService.dispose();
               agentOrchestratorService = null;
           }
           webview.dispose();
           modelManager.dispose();
           orchestrator.dispose();
           // configManager doesn't need dispose

           await dbManager.resetDatabase();

           vscode.window.showInformationMessage('Database reset successfully! Please reload the window if any issues persist.');
        } else {
             throw new Error("DatabaseManager not initialized.");
        }

      } catch (error) {
        console.error('[Database Reset Error]', error);
        vscode.window.showErrorMessage(
          `Database reset failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    })
  );

  // Add disposables
  context.subscriptions.push(webview);
  context.subscriptions.push(modelManager);
  context.subscriptions.push(orchestrator);
  context.subscriptions.push(globalContext);
  context.subscriptions.push(sessionContext);
  // configManager doesn't need explicit dispose
  if (agentOrchestratorService) {
      context.subscriptions.push(agentOrchestratorService); // Disposes the service and its internal agents
  }

  console.log('[Extension] Activated with Stage 5 polishing and stability.');
}

export async function deactivate() {
  console.log('[Extension] Deactivating...');

  if (globalContext) {
      await globalContext.saveState();
      globalContext.dispose();
      globalContext = null;
  }

  if (sessionContext) {
       sessionContext.dispose();
       sessionContext = null;
  }

  if (agentOrchestratorService) {
      agentOrchestratorService.dispose();
      agentOrchestratorService = null;
  }

  disposePromptSystem(); // Disposes ModelManager internally

  if (dbManager) {
      dbManager.close();
      dbManager = null;
  }

  // configManager doesn't need dispose
  configManager = null;

  console.log('[Extension] Deactivated.');
}