import * as vscode from 'vscode';
import { WebviewProvider } from './ui/webView/webviewProvider';
import { ConfigurationManager } from './config/ConfigurationManager';
import { initializePromptSystem, disposePromptSystem } from './models/promptSystem';
import { ModelManager } from './models/config/ModelManager';
import { ChatService } from './services/chatService';
import { Orchestrator } from './orchestrator/orchestrator'; // Import the refactored Orchestrator
import { FileSystemService } from './services/fileSystemService'; // Keep for now, will refactor in Stage 2
import { DatabaseManager } from './store/database/DatabaseManager';
import { StepExecutor } from './orchestrator/execution/stepExecutor'; // Import StepExecutor
import { ExecutorFactory } from './orchestrator/execution/executorFactory'; // Import ExecutorFactory


// Import new context classes
import { GlobalContext, SessionContext } from './orchestrator/context';


// Declare context variables at the top level or in a state object if preferred
let globalContext: GlobalContext | null = null;
let sessionContext: SessionContext | null = null;
let dbManager: DatabaseManager | null = null; // Keep DB Manager reference
let orchestrator: Orchestrator | null = null; // Keep Orchestrator reference for disposal
let modelManager: ModelManager | null = null; // Keep ModelManager reference for disposal


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
  // globalContext.getProjectInfo(); // Start fetching if not loaded - SessionContext handles this now

  // Initialize SessionContext (Does not persist for now)
  // Need a reference to GlobalContext for SessionContext
  if (!globalContext) { // Should not happen based on sequence, but good practice
       throw new Error("GlobalContext not initialized during activation.");
  }
  sessionContext = new SessionContext(context, globalContext);

  // Initialize ModelManager (requires config)
  modelManager = new ModelManager(config);
  initializePromptSystem(modelManager); // Prompt system needs ModelManager

  // FileSystemService - Keep for now, refactor in Stage 2
  // const fileSystemService = new FileSystemService(); // Seems unused? Remove if not needed later

  // Initialize ExecutorRegistry and StepExecutor
  const executorRegistry = ExecutorFactory.createExecutorRegistry();
  const stepExecutor = new StepExecutor(executorRegistry);


  // Initialize Orchestrator with context and executor references
  if (!globalContext || !sessionContext) { // Should not happen
      throw new Error("Contexts not initialized before Orchestrator.");
  }
  orchestrator = new Orchestrator(globalContext, sessionContext); // Orchestrator constructor now creates its own StepExecutor internally

  // Initialize ChatService with context references
  const chatService = new ChatService(context, modelManager, orchestrator, globalContext, sessionContext); // Pass contexts

  // Initialize WebviewProvider (requires ChatService)
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
      if (modelManager) {
        await modelManager.setModel(newModel);
        webview.updateModel(newModel);
      } else {
         console.error("ModelManager not initialized.");
      }
    }),

    vscode.commands.registerCommand('extensionAssistant.chat.history', () => {
      webview.showChatHistory();
    }),

    // This command seems like a duplicate of switchModel? Keep one or clarify intent.
    // Assuming it's a duplicate for now, but leaving the logic.
    vscode.commands.registerCommand('extensionAssistant.model.change', async () => {
      const current = config.getModelType();
      const newModel = current === 'ollama' ? 'gemini' : 'ollama';
       if (modelManager) {
          await modelManager.setModel(newModel);
          webview.updateModel(newModel);
       } else {
           console.error("ModelManager not initialized.");
       }
    }),

    vscode.commands.registerCommand('extension.resetDatabase', async () => {
      try {
        // Use the stored dbManager instance
        if (dbManager) {
           // Dispose components that might hold DB connections or context state
           // Dispose in reverse order of dependency/creation if possible
           if (webview) webview.dispose(); // Dispose webview and its handlers
           // ChatService depends on Orchestrator and Contexts, Orchestrator depends on StepExecutor
           // Dispose Orchestrator which disposes ConversationContexts
           if (orchestrator) orchestrator.dispose();
           // Dispose SessionContext
           if (sessionContext) sessionContext.dispose();
           // Dispose GlobalContext (saves state)
           if (globalContext) await globalContext.saveState();
           if (globalContext) globalContext.dispose();
           // Dispose ModelManager (aborts requests)
           disposePromptSystem(); // This disposes the internal ModelManager instance

           // Now reset the DB
           await dbManager.resetDatabase();

           // --- Re-initialize after reset ---
           // Note: A full VS Code window reload is often simpler and more robust
           // after a DB reset, but we can attempt re-initialization here.
           // The activation function already contains the correct initialization sequence.
           // Calling activate again directly is not standard practice.
           // Instead, we replicate the necessary parts or prompt the user to reload.
           // Let's prompt the user to reload for simplicity and robustness.

           vscode.window.showInformationMessage('Database reset successfully! Please reload the window for a clean state.', 'Reload').then(selection => {
               if (selection === 'Reload') {
                   vscode.commands.executeCommand('workbench.action.reloadWindow');
               }
           });

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
  // Orchestrator, GlobalContext, SessionContext are now managed by top-level variables
  // and explicitly disposed in deactivate or resetDatabase.
  // StepExecutor and ExecutorRegistry don't typically need explicit disposal
  // unless they hold resources (like event listeners), which they don't here.

  console.log('[Extension] Activated with agent-based routing.');
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

  // Dispose orchestrator (disposes active conversation contexts)
  if (orchestrator) {
      orchestrator.dispose();
      orchestrator = null;
  }

  // Dispose model manager (aborts pending requests)
  disposePromptSystem(); // This function handles disposing the internal ModelManager instance
  modelManager = null;


  // DatabaseManager is singleton, close it if needed on full deactivation
  if (dbManager) {
      dbManager.close();
      dbManager = null;
  }

  console.log('[Extension] Deactivated.');
}