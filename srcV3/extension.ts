import * as vscode from 'vscode';
import { WebviewProvider } from './ui/webView/webviewProvider';
import { ConfigurationManager } from './config/ConfigurationManager';
import { initializePromptSystem, disposePromptSystem } from './models/promptSystem'; // Import dispose
import { ModelManager } from './models/config/ModelManager';
import { ChatService } from './services/chatService';
import { Orchestrator } from './orchestrator/orchestrator';
import { FileSystemService } from './services/fileSystemService'; // Keep for now, will refactor in Stage 2
import { DatabaseManager } from './storage/database/DatabaseManager';

// Import new context classes
import { GlobalContext, SessionContext, ConversationContext, FlowContext } from './orchestrator/context';


// Declare context variables at the top level or in a state object if preferred
let globalContext: GlobalContext | null = null;
let sessionContext: SessionContext | null = null;
let dbManager: DatabaseManager | null = null; // Keep DB Manager reference


export async function activate(context: vscode.ExtensionContext) {
  console.log('[Extension] Activating...');

  // Initialize ConfigurationManager (already uses context)
  const config = new ConfigurationManager(context);

  // Initialize DatabaseManager (Singleton)
  dbManager = DatabaseManager.getInstance(context);
  // The ChatRepository constructor will get the DB instance from the Singleton

  // Initialize GlobalContext (Loads from globalState)
  globalContext = new GlobalContext(context, config);
  // Consider triggering initial project info fetch here or in SessionContext constructor
  globalContext.getProjectInfo(); // Start fetching if not loaded

  // Initialize SessionContext (Does not persist for now)
  // Need a reference to GlobalContext for SessionContext
  sessionContext = new SessionContext(context, globalContext);

  // Initialize ModelManager (requires config)
  const modelManager = new ModelManager(config);
  initializePromptSystem(modelManager); // Prompt system needs ModelManager

  // FileSystemService - Keep for now, refactor in Stage 2
  const fileSystemService = new FileSystemService();

  // Initialize Orchestrator with context references
  const orchestrator = new Orchestrator(globalContext, sessionContext); // Pass contexts

  // Initialize ChatService with context references
  const chatService = new ChatService(context, modelManager, orchestrator, globalContext, sessionContext); // Pass contexts

  // Initialize WebviewProvider (requires ChatService and FileSystemService)
  const webview = new WebviewProvider(context.extensionUri, config, chatService);

  // Initialize theme handler (logic remains in WebviewProvider)
  webview.setThemeHandler();

  // Register Webview Provider
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('aiChat.chatView', webview)
  );

  // Register Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('extensionAssistant.newChat', () => {
      // This should trigger ChatService to prepare/create a new chat,
      // which will manage the new ConversationContext
      chatService.prepareNewConversation(); // Service prepares state
      webview.createNewChat(); // Webview UI updates
    }),

    vscode.commands.registerCommand('extensionAssistant.settings', async () => {
      await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:user.extensionassistant');
    }),

    vscode.commands.registerCommand('extensionAssistant.switchModel', async () => {
      const current = config.getModelType();
      // Example of getting config via configManager
      const newModel = current === 'ollama' ? 'gemini' : 'ollama';
      await modelManager.setModel(newModel);
      webview.updateModel(newModel);
    }),

    vscode.commands.registerCommand('extensionAssistant.chat.history', () => {
      webview.showChatHistory();
    }),

    // This command seems like a duplicate of switchModel? Keep one or clarify intent.
    // Assuming it's a duplicate for now, but leaving the logic.
    vscode.commands.registerCommand('extensionAssistant.model.change', async () => {
      const current = config.getModelType();
      const newModel = current === 'ollama' ? 'gemini' : 'ollama';
      await modelManager.setModel(newModel);
      webview.updateModel(newModel);
    }),

    vscode.commands.registerCommand('extension.resetDatabase', async () => {
      try {
        // Use the stored dbManager instance
        if (dbManager) {
           // Dispose components that might hold DB connections or context state
           webview.dispose(); // Dispose webview and its handlers
           modelManager.dispose(); // Dispose model connections if any
           orchestrator.dispose(); // Dispose orchestrator state (context map)

           await dbManager.resetDatabase();

           // Re-initialize necessary components after reset if needed immediately,
           // or rely on user interacting again which will implicitly re-init.
           // For simplicity, let activation handle re-init on next interaction/VS Code restart.
           // Or explicitly re-init here:
           // dbManager = DatabaseManager.getInstance(context); // Get new instance after reset
           // orchestrator = new Orchestrator(globalContext, sessionContext);
           // chatService = new ChatService(context, modelManager, orchestrator, globalContext, sessionContext);
           // webview = new WebviewProvider(context.extensionUri, config, chatService, fileSystemService);
           // context.subscriptions.push(vscode.window.registerWebviewViewProvider('aiChat.chatView', webview));
           // webview.setThemeHandler(); // Re-add theme handler

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

  // Add the webview to the subscriptions for disposal
  context.subscriptions.push(webview);
  // Add other disposable components
  context.subscriptions.push(modelManager);
  context.subscriptions.push(orchestrator);
  context.subscriptions.push(globalContext);
  context.subscriptions.push(sessionContext); // SessionContext might not need explicit dispose if no listeners

  console.log('[Extension] Activated with hierarchical context support.');
}

export async function deactivate() {
  console.log('[Extension] Deactivating...');

  // Save global context state before deactivating
  if (globalContext) {
      await globalContext.saveState();
      globalContext.dispose();
      globalContext = null;
  }

  // Dispose session context (if it had resources to clean up)
  if (sessionContext) {
       sessionContext.dispose();
       sessionContext = null;
  }

  // Dispose model manager (aborts pending requests)
  disposePromptSystem(); // Disposes ModelManager internally

  // DatabaseManager is singleton, close it if needed on full deactivation
  if (dbManager) {
      dbManager.close();
      dbManager = null;
  }

  console.log('[Extension] Deactivated.');
}