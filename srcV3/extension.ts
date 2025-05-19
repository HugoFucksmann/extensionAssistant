// src/extension.ts
// MODIFIED: Uses ServiceFactory for initialization and lifecycle management

import * as vscode from 'vscode';
import { ServiceFactory } from './di'; // Import the ServiceFactory

// Declare factory variable at the top level for deactivate access
let serviceFactory: ServiceFactory | null = null;
// Keep reference to GlobalContextService for explicit state saving in deactivate
let globalContextService: any | null = null; // Use 'any' for now, or import the type


export async function activate(context: vscode.ExtensionContext) {
  console.log('[Extension] Activating...');

  try {
      // 1. Initialize the ServiceFactory
      serviceFactory = new ServiceFactory(context);
      console.log('[Extension] ServiceFactory initialized.');

      // 2. Get top-level components from the factory that need direct interaction or registration
      const webviewProvider = serviceFactory.getWebviewProvider();
      // Get GlobalContextService specifically for explicit state saving in deactivate
      globalContextService = serviceFactory.get('globalContextService');

      // 3. Register components and disposables with VS Code subscriptions
      // The factory itself is a disposable and knows how to dispose its services
      // Other components like WebviewProvider might have VS Code specific listeners to dispose
      context.subscriptions.push(serviceFactory); // Register the factory for disposal

      // Register the Webview View Provider
      context.subscriptions.push(
          vscode.window.registerWebviewViewProvider('aiChat.chatView', webviewProvider)
      );

       // Add the webview provider itself to subscriptions as it manages internal disposables
       context.subscriptions.push(webviewProvider);


      // 4. Register Commands
      // Get services needed by commands from the factory
      const chatInteractor = serviceFactory.get('chatInteractor');
      const configManager = serviceFactory.get('configurationManager');
      const modelManager = serviceFactory.get('modelManager'); // Needed for switchModel command logic
      const uiBridge = serviceFactory.get('uiBridge'); // Needed for openSettings command

      context.subscriptions.push(
          vscode.commands.registerCommand('extensionAssistant.newChat', () => {
              // Delegate command logic to the appropriate service
              chatInteractor.prepareNewConversation();
               // UIBridge listener will send 'newChat' message to webview
          }),

          vscode.commands.registerCommand('extensionAssistant.settings', async () => {
               // Delegate to UIBridge or call VS Code command directly
              // uiBridge.handleWebviewMessage({ type: 'command', payload: { command: 'openSettings' } }); // If routing through UIBridge
              await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:user.extensionassistant'); // Direct call
          }),

          // Keep switchModel command here for now, or move to UIBridge command handling
          // If keeping here, it needs access to configManager and modelManager
          vscode.commands.registerCommand('extensionAssistant.switchModel', async () => {
              const current = configManager.getModelType();
              const newModel = current === 'ollama' ? 'gemini' : 'ollama';
              // Use ModelManager to set the model (which uses ConfigManager internally)
              await modelManager.setModel(newModel as any); // Cast to ModelType if needed
               // UIBridge listens to modelChanged event or we can trigger UI update here
               // Let's rely on UIBridge listening to events
          }),

          // This command now delegates to UIBridge
          vscode.commands.registerCommand('extensionAssistant.chat.history', () => {
              uiBridge.postMessageToWebview('historyRequested', {}); // Signal UI to show history
          }),

          // Remove the duplicate switchModel command 'extensionAssistant.model.change'
          // Assuming 'extensionAssistant.switchModel' is the desired command


          // Keep the resetDatabase command, it needs DatabaseManager access
           vscode.commands.registerCommand('extension.resetDatabase', async () => {
               try {
                   const dbManager = serviceFactory?.get('databaseManager');
                   if (dbManager) {
                       // Before resetting DB, dispose services that might hold connections/state
                       // Dispose the factory first to clean up most services
                       if (serviceFactory) {
                            serviceFactory.dispose(); // This closes the DB connection
                            serviceFactory = null; // Clear reference
                       }

                       // Now reset the database file
                       await dbManager.resetDatabase(); // This re-opens the DB and initializes tables

                       vscode.window.showInformationMessage('Database reset successfully! Please reload the window.');

                       // Prompt for window reload as state is fundamentally changed
                       vscode.commands.executeCommand('workbench.action.reloadWindow');

                   } else {
                       throw new Error("DatabaseManager not available.");
                   }

               } catch (error) {
                   console.error('[Database Reset Error]', error);
                   vscode.window.showErrorMessage(
                       `Database reset failed: ${error instanceof Error ? error.message : String(error)}`
                   );
               }
           })
      );

      console.log('[Extension] Activated with ServiceFactory.');

  } catch (error) {
      console.error('[Extension] Failed to activate:', error);
      vscode.window.showErrorMessage(`Extension Assistant failed to activate: ${error instanceof Error ? error.message : String(error)}`);
      // Clean up any partially created factory if activation failed mid-way
      if (serviceFactory) {
          serviceFactory.dispose();
          serviceFactory = null;
      }
  }
}

export async function deactivate() {
  console.log('[Extension] Deactivating...');

  // Explicitly save global context state before disposing the factory
  // This is done here because dispose is not async, but saveState is.
  if (globalContextService) {
      try {
          await globalContextService.saveState();
          console.log('[Extension] Global context state saved.');
      } catch (error) {
          console.error('[Extension] Error saving global context state:', error);
      }
       // The service itself is disposed by the factory.dispose()
       globalContextService = null;
  }


  // Dispose the ServiceFactory, which in turn disposes all managed services.
  if (serviceFactory) {
      serviceFactory.dispose();
      serviceFactory = null;
  }

  console.log('[Extension] Deactivated.');
}