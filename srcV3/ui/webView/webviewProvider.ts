import * as vscode from 'vscode';
import { ConfigurationManager } from '../../config/ConfigurationManager';
import { getHtmlContent } from './htmlTemplate';
import { ChatService } from '../../services/chatService';
import { OrchestratorService } from '../../services/orchestratorService';

export class WebviewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly configManager: ConfigurationManager,
    private readonly chatService: ChatService,
    private readonly orchestrator: OrchestratorService
  ) {}

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    this.configureWebview();
    this.setupMessageHandlers();
    this.sendChatList();
  }

  private configureWebview(): void {
    if (!this.view) return;

    this.view.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    this.view.webview.html = getHtmlContent(this.extensionUri, this.view.webview);
  }

  private setupMessageHandlers(): void {
    if (!this.view) return;

    this.view.webview.onDidReceiveMessage(async (message) => {
      try {
        switch (message.type) {
          case 'chat':
            await this.handleChatMessage(message.text);
            break;
          case 'command':
            await this.handleCommand(message);
            break;
        }
      } catch (error) {
        this.handleError(error);
      }
    });
  }

  private async handleChatMessage(text: string): Promise<void> {
    if (!text.trim()) return;
  
    try {
      const assistantMessage = await this.orchestrator.processUserMessage(text);

      this.postMessage('chatResponse', {
        text: assistantMessage.content,
        chatId: assistantMessage.chatId,
        timestamp: assistantMessage.timestamp
      });
      
      this.sendChatList();
    } catch (error) {
      this.handleError(error);
    }
  }
  

  private async handleCommand(message: any): Promise<void> {
    const { command } = message;

    switch (command) {
      case 'setModel':
        await this.configManager.setModelType(message.data);
        this.updateModel(message.data);
        break;

      case 'getChatList':
        await this.sendChatList();
        break;

      case 'loadChat':
        await this.loadChat(message.chatId);
        break;

      case 'newChat':
        await this.createNewChat();
        break;

      case 'showHistory':
        this.postMessage('historyRequested', {});
        break;

      case 'deleteChat':
        await this.deleteChat(message.chatId);
        break;

      case 'updateChatTitle':
        await this.updateChatTitle(message.chatId, message.title);
        break;
    }
  }

  private async sendChatList(): Promise<void> {
    const chats = await this.chatService.getConversations();
    this.postMessage('chatListUpdated', { chats });
  }

  private async loadChat(chatId: string): Promise<void> {
    try {
      const messages = await this.chatService.loadConversation(chatId);
      this.postMessage('chatLoaded', { messages });
    } catch (error) {
      this.handleError(error);
    }
  }

  private async createNewChat(): Promise<void> {
    try {
      this.chatService.prepareNewConversation();
      this.postMessage('newChat', {});
    } catch (error) {
      this.handleError(error);
    }
  }

  private async deleteChat(chatId: string): Promise<void> {
    try {
      await this.chatService.deleteConversation(chatId);
      this.sendChatList();
    } catch (error) {
      this.handleError(error);
    }
  }

  private async updateChatTitle(chatId: string, title: string): Promise<void> {
    try {
      await this.chatService.updateConversationTitle(chatId, title);
      this.sendChatList();
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: unknown): void {
    console.error('Webview error:', error);
    this.postMessage('error', {
      message: error instanceof Error ? error.message : 'Ocurrió un error',
    });
  }

  public updateModel(modelType: 'ollama' | 'gemini'): void {
    this.postMessage('modelChanged', { modelType });
  }

  public postMessage(type: string, payload: unknown): void {
    this.view?.webview.postMessage({ type, payload });
  }

  public dispose(): void {
    // Aquí podrías cerrar el ChatService si implementás un método close()
  }
}
