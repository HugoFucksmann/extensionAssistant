import * as vscode from 'vscode';
import { WebviewProvider } from './vscode/webView/webviewProvider';
import { ComponentFactory } from './core/ComponentFactory';
import { CommandManager } from './CommandManager';

export class ExtensionActivator {
  private webviewProvider?: WebviewProvider;
  private commandManager?: CommandManager;

  constructor(private readonly context: vscode.ExtensionContext) {}

  public activate(): void {
    this.initializeServices();
    this.registerWebview();
    this.registerCommands();
  }

  private initializeServices(): void {
    const appLogicService = ComponentFactory.getApplicationLogicService(this.context);
    const dispatcher = ComponentFactory.getInternalEventDispatcher();
    const conversationManager = ComponentFactory.getConversationManager(this.context);
    
    this.webviewProvider = new WebviewProvider(
      this.context.extensionUri, 
      appLogicService, 
      dispatcher,
      conversationManager
    );
    
    this.commandManager = new CommandManager(this.webviewProvider);
  }

  private registerWebview(): void {
    if (!this.webviewProvider) return;

    const webviewRegistration = vscode.window.registerWebviewViewProvider(
      'aiChat.chatView',
      this.webviewProvider,
      { webviewOptions: { retainContextWhenHidden: true } }
    );

    this.context.subscriptions.push(webviewRegistration);
  }

  private registerCommands(): void {
    if (!this.commandManager) return;
    
    const commands = this.commandManager.getCommands();
    commands.forEach(command => {
      this.context.subscriptions.push(command);
    });
  }

  public deactivate(): void {
    this.webviewProvider?.dispose();
    this.webviewProvider = undefined;
    this.commandManager = undefined;
  }
}