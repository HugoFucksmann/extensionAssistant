import * as vscode from 'vscode';
import { WebviewProvider } from './vscode/webView/core/WebviewProvider';
import { ComponentFactory } from './core/ComponentFactory';
import { CommandManager } from './CommandManager';
import { EventType } from './features/events/eventTypes';
import { MemoryManager } from './features/memory/MemoryManager';

export class ExtensionActivator {
  private webviewProvider?: WebviewProvider;
  private commandManager?: CommandManager;
  private conversationEndedSubscription?: { unsubscribe: () => void };

  constructor(private readonly context: vscode.ExtensionContext) { }

  public async activate(): Promise<void> {
    await this.initializeServices();
    this.registerWebview();
    this.registerCommands();

    this.registerEventListeners();
  }

  private async initializeServices(): Promise<void> {
    const appLogicService = await ComponentFactory.getApplicationLogicService(this.context);
    const dispatcher = ComponentFactory.getInternalEventDispatcher();
    const conversationManager = ComponentFactory.getConversationManager();

    this.webviewProvider = new WebviewProvider(
      this.context.extensionUri,
      appLogicService,
      dispatcher,
      conversationManager
    );

    this.commandManager = new CommandManager(this.webviewProvider);
  }

  private registerWebview(): void {
    const webviewRegistration = vscode.window.registerWebviewViewProvider(
      'aiChat.chatView',
      this.webviewProvider!,
      { webviewOptions: { retainContextWhenHidden: true } }
    );

    this.context.subscriptions.push(webviewRegistration);
  }

  private registerCommands(): void {
    const commands = this.commandManager!.getCommands();
    commands.forEach(command => {
      this.context.subscriptions.push(command);
    });
  }

  private registerEventListeners(): void {
    const dispatcher = ComponentFactory.getInternalEventDispatcher();
    const memoryManager = ComponentFactory.getMemoryManager(this.context);

    this.conversationEndedSubscription = dispatcher.subscribe(
      EventType.CONVERSATION_ENDED,
      (event) => {
        if (event.payload.chatId) {
          console.log(`[ExtensionActivator] Conversation ${event.payload.chatId} ended. Clearing runtime memory.`);
          memoryManager.clearRuntime(event.payload.chatId);
        }
      }
    );
  }

  public deactivate(): void {
    this.conversationEndedSubscription?.unsubscribe();
    this.webviewProvider?.dispose();
    this.webviewProvider = undefined;
    this.commandManager?.dispose();
    this.commandManager = undefined;
  }
}