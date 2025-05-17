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


import { ToolRunner } from './tools/toolRunner'; // Ensure this is the correct import path
import { IToolRunner } from './tools/core/interfaces'; // Ensure this is the correct import path
import { DatabaseManager } from './store/database/DatabaseManager';
import { ModelManager } from './models/config/ModelManager';
import { ModelService } from './services/ModelService';



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
let modelService: IModelService | null = null;


let storageService: IStorageService | null = null;


export async function activate(context: vscode.ExtensionContext) {
  console.log('[Extension] Activating...');

  // Initialize Configuration Manager first
  configManager = new ConfigurationManager(context);

  // Initialize Storage Service and Database Manager
  storageService = new StorageService(context);
  dbManager = DatabaseManager.getInstance(context); // DatabaseManager is a singleton managed by StorageService

  // Initialize Contexts
  globalContext = new GlobalContext(context);
  // globalContext.getProjectInfo(); // Project info is now obtained via a tool call if needed

  sessionContext = new SessionContext(context, globalContext);


  // Initialize Model components
  const modelManager = new ModelManager(configManager);
  modelService = new ModelService(modelManager);

  // Removed WorkspaceService initialization

  // Initialize ToolRunner - No longer needs WorkspaceService dependency
  toolRunner = new ToolRunner();

  // Initialize Agent Orchestrator Service
  agentOrchestratorService = new AgentOrchestratorService(
      modelService,
      storageService,
      toolRunner, // Agent Orchestrator needs ToolRunner
      configManager
  );

  // Initialize Orchestrator
  orchestrator = new Orchestrator(toolRunner, modelService); // Orchestrator needs ToolRunner and ModelService


  // Initialize Chat Service
  chatService = new ChatService(context, orchestrator, sessionContext, agentOrchestratorService); // ChatService needs Orchestrator, SessionContext, AgentOrchestrator

  // Initialize Webview Provider - Now needs ToolRunner instead of WorkspaceService
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

        if (dbManager) {
           console.log('[Extension] Executing database reset command...');

           // Dispose services that interact with the database or hold state
           // Dispose in reverse order of creation/dependency where possible
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
               await globalContext.saveState(); // Optional: save non-DB state before disposing
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
           // Dispose StorageService - This is crucial as it closes the DB connection
           if (storageService) {
               storageService.dispose();
               storageService = null;
           }

           // Nullify other services that don't have explicit dispose methods or manage resources
           // Removed workspaceService = null;
           toolRunner = null;
           configManager = null; // ConfigManager might have listeners, consider adding dispose if needed

           // Now reset the database via the manager (which should be disconnected)
           await dbManager.resetDatabase();

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


  // Add disposables in the order they should be disposed FIRST:
  // The order here matters for clean shutdown. Services depending on others should be disposed first.
  // AgentOrchestratorService depends on ModelService, StorageService, ToolRunner
  if (agentOrchestratorService) {
      context.subscriptions.push(agentOrchestratorService); // 1st
  }
  // ChatService depends on Orchestrator, SessionContext, AgentOrchestratorService
  if (chatService) {
      context.subscriptions.push(chatService); // 2nd
  }
  // Orchestrator depends on ToolRunner, ModelService
   if (orchestrator) {
       context.subscriptions.push(orchestrator); // 3rd
   }
  // ModelService depends on ModelManager (which might have ongoing requests)
  if (modelService) {
      context.subscriptions.push(modelService); // 4th
  }
   // SessionContext depends on GlobalContext
   if (sessionContext) {
       context.subscriptions.push(sessionContext); // 5th
   }
   // GlobalContext might have state to save
   if (globalContext) {
       context.subscriptions.push(globalContext); // 6th
   }
  // WebviewProvider depends on ChatService, AgentOrchestratorService, ToolRunner, ConfigManager
  if (webview) {
       context.subscriptions.push(webview); // 7th
  }
   // StorageService manages the DB connection - should be disposed last among services using DB
   if (storageService) {
       context.subscriptions.push(storageService); // 8th (LAST among services)
   }
   // ToolRunner and ConfigManager don't have explicit dispose methods in the provided code,
   // so adding them to subscriptions isn't strictly necessary unless they acquire disposables internally later.


  console.log('[Extension] Activated.'); // Simplified log
}

export async function deactivate() {
  console.log('[Extension] Deactivating...');

   // Explicitly dispose services in a safe order
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

   // Nullify other services
   // Removed workspaceService = null;
   toolRunner = null;
   configManager = null; // Consider adding dispose to ConfigManager if it has listeners

  console.log('[Extension] Deactivated.');
}