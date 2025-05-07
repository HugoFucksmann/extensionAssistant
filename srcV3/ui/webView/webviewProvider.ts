// src/ui/webView/webviewProvider.ts
import * as vscode from 'vscode';
import { ConfigurationManager } from '../../config/ConfigurationManager';
import { getHtmlContent } from './htmlTemplate';
import { ChatService } from '../../config/storage/chatService';

export class WebviewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private chatService: ChatService;
  
  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly configManager: ConfigurationManager,
    context: vscode.ExtensionContext
  ) {
    this.chatService = new ChatService(context);
  }

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    this.configureWebview();
    this.setupMessageHandlers();
    
    // Load chat list initially
    this.sendChatList();
  }

  private configureWebview(): void {
    if (!this.view) return;
    
    this.view.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri]
    };
    
    this.view.webview.html = getHtmlContent(this.extensionUri, this.view.webview);
  }

  private setupMessageHandlers(): void {
    if (!this.view) return;

    this.view.webview.onDidReceiveMessage(async message => {
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
      // Save user message to storage
      await this.chatService.sendUserMessage(text);
      
      // Here you would call your AI model service to get a response
      // For now we'll just simulate a response
      const response = `AI Response to: ${text}`;
      
      // Save assistant response to storage
      const message = await this.chatService.addAssistantResponse(response);
      
      // Send response to webview
      this.postMessage('chatResponse', {
        text: response,
        chatId: message.chatId,
        timestamp: message.timestamp
      });
      
      // Update chat list
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
    const chats = await this.chatService.getChats();
    this.postMessage('chatListUpdated', { chats });
  }
  
  private async loadChat(chatId: string): Promise<void> {
    try {
      const messages = await this.chatService.loadChat(chatId);
      this.postMessage('chatLoaded', { messages });
    } catch (error) {
      this.handleError(error);
    }
  }
  
  private async createNewChat(): Promise<void> {
    try {
      // Instead of creating a chat in storage immediately, just prepare for a new chat
      this.chatService.prepareNewChat();
      this.postMessage('newChat', {});
      // No need to update the chat list since we haven't saved the chat yet
    } catch (error) {
      this.handleError(error);
    }
  }
  
  private async deleteChat(chatId: string): Promise<void> {
    try {
      await this.chatService.deleteChat(chatId);
      this.sendChatList();
    } catch (error) {
      this.handleError(error);
    }
  }
  
  private async updateChatTitle(chatId: string, title: string): Promise<void> {
    try {
      await this.chatService.updateChatTitle(chatId, title);
      this.sendChatList();
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: unknown): void {
    console.error('Webview error:', error);
    this.postMessage('error', {
      message: error instanceof Error ? error.message : 'An error occurred'
    });
  }

  public updateModel(modelType: 'ollama' | 'gemini'): void {
    this.postMessage('modelChanged', { modelType });
  }

  public postMessage(type: string, payload: unknown): void {
    this.view?.webview.postMessage({ type, payload });
  }
  
  public dispose(): void {
    this.chatService.dispose();
  }
}