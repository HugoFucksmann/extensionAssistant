// src/ui/webview/webviewProvider.ts
// MODIFIED: Refactored to be a thin presentation layer depending on UIBridge

import * as vscode from 'vscode';
import { ConfigurationManager } from '../../config/ConfigurationManager'; // Keep dependency for theme/config
import { getHtmlContent } from './htmlTemplate';
// Remove dependency on ChatService and FileSystemService
// import { ChatService } from '../../services/chatService';
// import { FileSystemService } from '../../services/fileSystemService';
// Remove direct dependency on ToolRunner
// import { ToolRunner } from '../../tools/core/toolRunner';

import { UIBridge } from '../uiBridge/UIBridge'; // Depend on UIBridge
import { EventEmitterService } from '../../events/EventEmitterService'; // Depend on EventEmitterService to listen for UI updates
import { UIUpdateMessagePayload } from '../../validation';

export class WebviewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private disposables: vscode.Disposable[] = [];
  private uiBridge: UIBridge; // Store the UIBridge instance
  private eventEmitter: EventEmitterService; // Store EventEmitterService instance


  constructor(
    private readonly context: vscode.ExtensionContext, // Keep context to get extensionUri, handle theme listeners
    private readonly configManager: ConfigurationManager, // Keep dependency for theme/initial config
    uiBridge: UIBridge, // Inject UIBridge
    eventEmitter: EventEmitterService // Inject EventEmitterService
  ) {
      this.uiBridge = uiBridge;
      this.eventEmitter = eventEmitter;
      // The extensionUri is available via context
      console.log('[WebviewProvider] Initialized.');
  }

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;

    // 1. Configure Webview settings and HTML
    this.configureWebview();

    // 2. Setup message handlers to delegate to UIBridge
    this.setupMessageHandlers();

    // 3. Setup listeners for messages *from* UIBridge
    this.setupUIUpdateListeners();

    // 4. Handle Theme
    this.setThemeHandler();

    // 5. Send initial state to the webview via UIBridge commands/events
     this.uiBridge.handleWebviewMessage({ type: 'command', payload: { command: 'getChatList' } }); // Request chat list
     // Request current model from config and send to UI (UIBridge handles config, we just trigger the UI update)
     const currentModel = this.configManager.getModelType(); // We can still query config directly for UI aspects
     this.uiBridge.postMessageToWebview('modelChanged', { modelType: currentModel });


     // Add this WebviewProvider instance to subscriptions for disposal
     // The UIBridge and its dependencies are handled by the ServiceFactory
    // this.context.subscriptions.push(this); // Already done in extension.ts
  }

  private configureWebview(): void {
    if (!this.view) return;

    this.view.webview.options = {
      enableScripts: true,
      // Use context.extensionUri to get the correct path
      localResourceRoots: [this.context.extensionUri],
    };

    // Pass the extensionUri and webview reference to getHtmlContent
    this.view.webview.html = getHtmlContent(this.context.extensionUri, this.view.webview);
  }

  private setupMessageHandlers(): void {
    if (!this.view) return;

    // Delegate ALL incoming messages from the webview to the UIBridge
    const messageDisposable = this.view.webview.onDidReceiveMessage(async (message) => {
        // The UIBridge is responsible for validation, dispatching, error handling
      await this.uiBridge.handleWebviewMessage(message);
    });
     this.disposables.push(messageDisposable);
  }

   /**
    * Sets up listeners for events emitted by the UIBridge (via EventEmitterService)
    * that are intended to update the webview UI.
    */
   private setupUIUpdateListeners(): void {
       // Definir el manejador de mensajes
       const messageHandler = (messagePayload: UIUpdateMessagePayload) => {
           if (this.view) {
               this.view.webview.postMessage(messagePayload);
           }
       };

       // Suscribir el manejador al evento
       this.eventEmitter.on('ui:postMessage', messageHandler);

       // Agregar un disposable que removerá el listener cuando sea necesario
       this.disposables.push({
           dispose: () => {
               this.eventEmitter.off('ui:postMessage', messageHandler);
           }
       });
   }


   // --- Methods previously called by extension.ts or self-invoked, now triggered via UIBridge/Events ---

   // The logic for showing chat history, creating new chat, loading chat, etc.
   // is now within UIBridge handlers (_handleShowHistory, _handleNewChat, _handleLoadChat).
   // WebviewProvider just needs to receive the UI update messages triggered by UIBridge.

    // Example: When UIBridge receives 'chatListUpdated' event, it calls postMessageToWebview('chatListUpdated', { chats }).
    // This listener here catches 'ui:postMessage' with type 'chatListUpdated' and payload { chats } and posts it.


  public setThemeHandler() {
    // Keep theme handling logic as it's directly tied to VS Code window/configuration
     // Send initial theme
     this.postMessage('themeChanged', {
       isDarkMode: vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark
     });

     // Listen for theme changes from VS Code
     const themeChangeListener = vscode.window.onDidChangeActiveColorTheme(theme => {
         this.postMessage('themeChanged', {
           isDarkMode: theme.kind === vscode.ColorThemeKind.Dark
         });
     });
     this.disposables.push(themeChangeListener);


     // Handle theme preference from webview - Delegate to UIBridge handleWebviewMessage
     // UIBridge will receive this as a command and call configManager.setValue.
     // We just need to ensure the webview sends this as a message.
     // The logic in UIBridge._handleCommand needs to include this.
     // Example: { type: 'command', payload: { command: 'setThemePreference', params: { theme: 'dark' | 'light' | 'system' } } }
     // This part doesn't need code here, just verification in UIBridge.
  }

  // The postMessage method is now internal, called ONLY by setupUIUpdateListeners
  private postMessage(type: string, payload: unknown): void {
    this.view?.webview.postMessage({ type, payload });
  }

  public dispose(): void {
    this.disposables.forEach(disposable => disposable.dispose());
    this.disposables = [];
    this.view = undefined;
    console.log('[WebviewProvider] Disposed.');
    // Do NOT dispose uiBridge or eventEmitter - ServiceFactory handles that.
  }
}