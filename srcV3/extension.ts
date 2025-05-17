import * as vscode from 'vscode';
import { WebviewProvider } from './ui/webView/webviewProvider';
import { ConfigurationManager } from './config/ConfigurationManager';

import { IModelService,  } from './models/interfaces';


import { IStorageService, StorageService,  } from './store'; 

import { ChatService } from './services/chatService';
import { Orchestrator } from './orchestrator/orchestrator';


import { GlobalContext, SessionContext } from './orchestrator/context';


import { AgentOrchestratorService } from './orchestrator/agents/AgentOrchestratorService';



import { WorkspaceService } from './services/workspaceService';
import { IWorkspaceService } from './workspace/interfaces';


import { ToolRunner } from './tools/core/toolRunner';
import { IToolRunner } from './tools/core/interfaces';
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
let workspaceService: IWorkspaceService | null = null;
let toolRunner: IToolRunner | null = null;
let modelService: IModelService | null = null;


let storageService: IStorageService | null = null;


export async function activate(context: vscode.ExtensionContext) {
  console.log('[Extension] Activating...');

  
  configManager = new ConfigurationManager(context);

 
  storageService = new StorageService(context); 
 
  dbManager = DatabaseManager.getInstance(context); 

  
  globalContext = new GlobalContext(context);
  globalContext.getProjectInfo();

  sessionContext = new SessionContext(context, globalContext);


 
  const modelManager = new ModelManager(configManager);

  
  modelService = new ModelService(modelManager);

  
  workspaceService = new WorkspaceService(context);

 
  toolRunner = new ToolRunner(workspaceService);

 
  agentOrchestratorService = new AgentOrchestratorService(
      modelService,
      storageService,
      toolRunner, 
      configManager
  );

  
  orchestrator = new Orchestrator(toolRunner, modelService); 


  chatService = new ChatService(context, orchestrator, sessionContext, agentOrchestratorService);

 
  webview = new WebviewProvider(context.extensionUri, configManager, chatService, agentOrchestratorService, workspaceService);

  webview.setThemeHandler(); 

 
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
      const current = modelService!.getCurrentModel();
      const newModel = current === 'ollama' ? 'gemini' : 'ollama';
      await modelService!.changeModel(newModel);
      webview!.updateModel(newModel);
    }),
    vscode.commands.registerCommand('extensionAssistant.chat.history', () => {
      webview!.showChatHistory();
    }),
    vscode.commands.registerCommand('extensionAssistant.model.change', async () => {
      const current = modelService!.getCurrentModel();
      const newModel = current === 'ollama' ? 'gemini' : 'ollama';
      await modelService!.changeModel(newModel);
      webview!.updateModel(newModel);
    }),
    vscode.commands.registerCommand('extension.resetDatabase', async () => {
      try {
      
        if (dbManager) {
           console.log('[Extension] Executing database reset command...');

          

           // 1. Dispose AgentOrchestratorService (might interact with Memory/Cache repos)
           if (agentOrchestratorService) {
               agentOrchestratorService.dispose();
               agentOrchestratorService = null;
           }
           // 2. Dispose ChatService (holds ConversationContexts, interacts with Chat repo)
           if (chatService) {
               chatService.dispose();
               chatService = null;
           }
            // 3. Dispose SessionContext (holds state linked to current session)
           if (sessionContext) {
               sessionContext.dispose();
               sessionContext = null;
           }
           // 4. Dispose GlobalContext (holds state like project info)
           if (globalContext) {
               await globalContext.saveState(); // Optional: save non-DB state
               globalContext.dispose();
               globalContext = null;
           }
           // 5. Dispose Orchestrator (planning state)
           if (orchestrator) {
               orchestrator.dispose();
               orchestrator = null;
           }
           // 6. Dispose ModelService (might have ongoing requests)
           if (modelService) {
               modelService.dispose();
               modelService = null;
           }
           // 7. Dispose WebviewProvider (UI listeners)
           if (webview) {
               webview.dispose();
               webview = null;
           }
           // 8. Dispose StorageService - This will close the DB connection
           if (storageService) {
               storageService.dispose(); 
               storageService = null;
           }

          
           workspaceService = null;
           toolRunner = null;
           configManager = null;

         
           await dbManager.resetDatabase();

          

           console.log('[Extension] Database reset successful.');
           vscode.window.showInformationMessage('Database reset successfully! Please reload the window to re-initialize.');

   

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
  if (agentOrchestratorService) {
      context.subscriptions.push(agentOrchestratorService); // 1st
  }
  if (chatService) {
      context.subscriptions.push(chatService); // 2nd
  }
  if (modelService) {
      context.subscriptions.push(modelService); // 3rd
  }
   if (orchestrator) {
       context.subscriptions.push(orchestrator); // 4th
   }
   if (globalContext) {
       context.subscriptions.push(globalContext); // 5th
   }
   if (sessionContext) {
       context.subscriptions.push(sessionContext); // 6th
   }
  
  if (webview) {
       context.subscriptions.push(webview); // 9th
  }
   if (storageService) {
       context.subscriptions.push(storageService); // 10th (LAST) - This ensures dbManager.close() is called last
   }


  console.log('[Extension] Activated with StorageService encapsulation.');
}

export async function deactivate() {
  console.log('[Extension] Deactivating...');


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
       await globalContext.saveState(); globalContext.dispose(); globalContext = null;
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
  
   if (storageService) {
       storageService.dispose(); storageService = null;
   }

  
   workspaceService = null;
   toolRunner = null;


  console.log('[Extension] Deactivated.');
}
