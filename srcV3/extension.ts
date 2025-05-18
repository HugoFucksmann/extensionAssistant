import * as vscode from 'vscode';
import { WebviewProvider } from './ui/webView/webviewProvider';
import { ConfigurationManager } from './config/ConfigurationManager';

import { IModelService,  } from './models/interfaces';


import { IStorageService, StorageService,  } from './store';

import { ChatService } from './services/chatService';
import { Orchestrator } from './orchestrator/orchestrator';


import { GlobalContext, SessionContext } from './orchestrator/context';


import { AgentOrchestratorService } from './orchestrator/agents/AgentOrchestratorService';


// Removed import of WorkspaceService and IWorkspaceService


import { ToolRunner } from './tools/toolRunner';
import { IToolRunner } from './tools/core/interfaces';
import { DatabaseManager } from './store/database/DatabaseManager';
import { ModelManager } from './models/config/ModelManager';
import { ModelService } from './services/ModelService'; // Ensure this import is correct


let globalContext: GlobalContext | null = null;
let sessionContext: SessionContext | null = null;

let dbManager: DatabaseManager | null = null;
let agentOrchestratorService: AgentOrchestratorService | null = null;
let configManager: ConfigurationManager | null = null;
let chatService: ChatService | null = null;
let orchestrator: Orchestrator | null = null;
let webview: WebviewProvider | null = null;
// Removed workspaceService variable
let toolRunner: IToolRunner | null = null;
let modelService: IModelService | null = null; // Changed type to IModelService


let storageService: IStorageService | null = null;


export async function activate(context: vscode.ExtensionContext) {
  console.log('[Extension] Activating...');

  // Initialize Configuration Manager first
  configManager = new ConfigurationManager(context);

  // Initialize Storage Service and Database Manager
  storageService = new StorageService(context);
  // DatabaseManager is a singleton managed by StorageService, no need to store it separately here unless needed for reset
  dbManager = DatabaseManager.getInstance(context); // Keeping reference for reset command


  // Initialize Contexts
  globalContext = new GlobalContext(context);
  // Project info is now obtained via a tool call if needed by the planner/agents
  // globalContext.getProjectInfo(); // This call is likely outdated now


  sessionContext = new SessionContext(context, globalContext);


  // Initialize ToolRunner - No longer needs WorkspaceService dependency
  toolRunner = new ToolRunner();


  // Initialize Model components
  const modelManager = new ModelManager(configManager);
  // Pass toolRunner to ModelService constructor
  modelService = new ModelService(modelManager, toolRunner); // <-- Pass toolRunner here


  // Initialize Agent Orchestrator Service
  agentOrchestratorService = new AgentOrchestratorService(
      modelService, // Agent Orchestrator needs ModelService
      storageService, // Agent Orchestrator needs StorageService (for memory/cache repos)
      toolRunner, // Agent Orchestrator needs ToolRunner
      configManager // Agent Orchestrator needs ConfigManager
  );


  // Initialize Orchestrator
  orchestrator = new Orchestrator(toolRunner, modelService); // Orchestrator needs ToolRunner and ModelService


  // Initialize Chat Service
  // ChatService needs Orchestrator, SessionContext, AgentOrchestrator
  chatService = new ChatService(context, orchestrator, sessionContext, agentOrchestratorService);


  // Initialize Webview Provider - Now needs ToolRunner instead of WorkspaceService
  // WebviewProvider needs ConfigManager, ChatService, AgentOrchestratorService, ToolRunner
  webview = new WebviewProvider(context.extensionUri, configManager, chatService, agentOrchestratorService, toolRunner); // <-- Pass toolRunner here

  webview.setThemeHandler(); // Setup theme listener early

  // Register Webview View Provider
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('aiChat.chatView', webview)
  );

  // Register Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('extensionAssistant.newChat', () => {
      chatService!.prepareNewConversation();
      webview!.createNewChat();
    }),
    vscode.commands.registerCommand('extensionAssistant.settings', async () => {
      await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:user.extensionassistant');
    }),
    vscode.commands.registerCommand('extensionAssistant.switchModel', async () => {
      // This command should ideally use the ModelService directly
      const current = modelService!.getCurrentModel();
      const newModel = current === 'ollama' ? 'gemini' : 'ollama'; // Example toggle
      await modelService!.changeModel(newModel);
      webview!.updateModel(newModel); // Notify webview of the change
    }),
    vscode.commands.registerCommand('extensionAssistant.chat.history', () => {
      webview!.showChatHistory();
    }),
    vscode.commands.registerCommand('extensionAssistant.model.change', async () => {
       // This command seems redundant with extensionAssistant.switchModel, keeping for now
       const current = modelService!.getCurrentModel();
       const newModel = current === 'ollama' ? 'gemini' : 'ollama'; // Example toggle
       await modelService!.changeModel(newModel);
       webview!.updateModel(newModel); // Notify webview of the change
    }),
    vscode.commands.registerCommand('extension.resetDatabase', async () => {
      try {

        // IMPORTANT: Ensure services that might hold open DB connections or state
        // dependent on DB entities are disposed BEFORE resetting the DB.
        // AgentOrchestratorService -> Memory/Cache Repos
        // ChatService -> Chat Repo, ConversationContexts holding messages
        // SessionContext -> Might hold references to DB state (though less likely directly)
        // GlobalContext -> Might hold references to DB state (less likely directly)
        // Orchestrator -> Planning state might involve results from DB interaction
        // ModelService -> Doesn't directly use DB, but depends on services that do? (No)
        // WebviewProvider -> Doesn't directly use DB, but depends on ChatService
        // StorageService -> MANAGES the DB connection, MUST be disposed before reset

        if (dbManager) {
           console.log('[Extension] Executing database reset command...');

           // 1. Dispose services in order of dependency (roughly reverse creation/dependency)
           // Services depending on data/state first
           if (agentOrchestratorService) {
               agentOrchestratorService.dispose();
               agentOrchestratorService = null;
           }
           if (chatService) {
               chatService.dispose();
               chatService = null;
           }
            if (sessionContext) {
               sessionContext.dispose();
               sessionContext = null;
           }
           if (globalContext) {
               await globalContext.saveState(); // Save non-DB state before disposing
               globalContext.dispose();
               globalContext = null;
           }
           if (orchestrator) {
               orchestrator.dispose();
               orchestrator = null;
           }
           if (modelService) {
               modelService.dispose();
               modelService = null;
           }
           if (webview) {
               webview.dispose();
               webview = null;
           }
           // 2. Dispose StorageService - This is crucial as it closes the DB connection
           if (storageService) {
               storageService.dispose();
               storageService = null;
           }

           // 3. Nullify other services that don't have explicit dispose methods or manage resources
           toolRunner = null;
           configManager = null; // ConfigManager might have listeners, consider adding dispose if needed

           // 4. Now reset the database via the manager (which should be disconnected)
           await dbManager.resetDatabase();
            // After reset, the DatabaseManager instance is no longer functional for the old DB.
            // It will re-initialize on the next getInstance call, typically after a window reload.


           console.log('[Extension] Database reset successful.');
           vscode.window.showInformationMessage('Database reset successfully! Please reload the window to re-initialize.');

           // Note: A window reload is typically required after a DB reset to re-activate the extension cleanly.

        } else {
             throw new Error("DatabaseManager not initialized. Cannot reset.");
        }

      } catch (error) {
        console.error('[Database Reset Error]', error);
        vscode.window.showErrorMessage(
          `Database reset failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    })
  );


  // Add disposables to context.subscriptions for VS Code to manage on deactivation
  // Dispose order (from most dependent to least dependent):
  // 1. AgentOrchestratorService (depends on ModelService, StorageService, ToolRunner, ConfigManager)
  if (agentOrchestratorService) context.subscriptions.push(agentOrchestratorService);
  // 2. ChatService (depends on Orchestrator, SessionContext, AgentOrchestratorService)
  if (chatService) context.subscriptions.push(chatService);
  // 3. Orchestrator (depends on ToolRunner, ModelService)
  if (orchestrator) context.subscriptions.push(orchestrator);
  // 4. ModelService (depends on ModelManager, ToolRunner)
  if (modelService) context.subscriptions.push(modelService);
   // 5. SessionContext (depends on GlobalContext)
   if (sessionContext) context.subscriptions.push(sessionContext);
   // 6. GlobalContext (might have state to save)
   if (globalContext) context.subscriptions.push(globalContext);
  // 7. WebviewProvider (depends on ChatService, AgentOrchestratorService, ToolRunner, ConfigManager)
  if (webview) context.subscriptions.push(webview);
   // 8. StorageService (MANAGES DB connection, dispose before DB reset, LAST in normal dispose)
   // ToolRunner and ConfigManager don't have explicit dispose methods in this code,
   // so adding them isn't necessary based on the provided code, although ConfigManager
   // might acquire disposables internally that should be managed.
   if (storageService) context.subscriptions.push(storageService); // StorageService needs dispose call


  console.log('[Extension] Activated.');
}

export async function deactivate() {
  console.log('[Extension] Deactivating...');

   // Explicitly dispose services in a safe order (reverse dependency)
   if (agentOrchestratorService) {
       agentOrchestratorService.dispose(); agentOrchestratorService = null;
   }
   if (chatService) {
       chatService.dispose(); chatService = null;
   }
    if (sessionContext) {
       sessionContext.dispose(); sessionContext = null;
   }
   if (globalContext) {
       await globalContext.saveState(); // Save state before disposing
       globalContext.dispose(); globalContext = null;
   }
   if (orchestrator) {
       orchestrator.dispose(); orchestrator = null;
   }
   if (modelService) {
       modelService.dispose(); modelService = null;
   }
   if (webview) {
       webview.dispose(); webview = null;
   }
   // Dispose StorageService last to ensure DB is closed after all users are done
   if (storageService) {
       storageService.dispose(); storageService = null;
   }

   // Nullify other services if they don't have explicit dispose
   toolRunner = null;
   configManager = null; // Consider adding dispose to ConfigManager if it has listeners

  console.log('[Extension] Deactivated.');
}