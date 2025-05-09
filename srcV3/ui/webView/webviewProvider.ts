import * as vscode from 'vscode';
import { ConfigurationManager } from '../../config/ConfigurationManager';
import { getHtmlContent } from './htmlTemplate';
import { ChatService } from '../../services/chatService';
import { OrchestratorService } from '../../services/orchestratorService';
import { FileSystemService } from '../../services/fileSystemService';

export class WebviewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private disposables: vscode.Disposable[] = [];

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly configManager: ConfigurationManager,
    private readonly chatService: ChatService,
    private readonly orchestrator: OrchestratorService,
    private readonly fileSystemService: FileSystemService
  ) {}

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    this.configureWebview();
    this.setupMessageHandlers();
    this.sendChatList();
    this.setThemeHandler();
    
    // Send the initial model type to the webview
    const modelType = this.configManager.getModelType();
    this.updateModel(modelType);
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
            await this.handleChatMessage(message.text, message.files);
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

  private async handleChatMessage(text: string, files: string[] = []): Promise<void> {
    if (!text.trim() && files.length === 0) return;

    try {
      const responseText = await this.chatService.sendMessage(text, files);
      
      this.postMessage('chatResponse', {
        text: responseText.content,
        chatId: responseText.chatId,
        timestamp: responseText.timestamp
      });
      
      this.sendChatList();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.error('Error handling chat message:', error);
      this.postMessage('chat:error', { error: errorMessage });
    }
  }
  
  private async handleCommand(message: any): Promise<void> {
    const { command } = message;

    switch (command) {
      case 'getChatList':
        await this.sendChatList();
        break;

      case 'loadChat':
        await this.loadChat(message.chatId);
        break;

      case 'updateChatTitle':
        await this.updateChatTitle(message.chatId, message.title);
        break;
        
      case 'deleteChat':
        await this.deleteChat(message.chatId);
        break;

      case 'switchModel':
        await this.configManager.setValue('modelType', message.modelType);
        this.updateModel(message.modelType);
        break;

      case 'showHistory':
        // Handle showHistory command in webview
        this.showChatHistory();
        break;
        
      case 'getProjectFiles':
        await this.getProjectFiles();
        break;
        
      case 'getFileContents':
        await this.getFileContents(message.filePath);
        break;
    }
  }

  public showChatHistory(): void {
    // First, ensure we've loaded the chat list
    this.sendChatList();
    
    // Then send message to show history UI
    this.postMessage('historyRequested', {});
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

  public async createNewChat(): Promise<void> {
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
  
  /**
   * Fetch project files and send them to the webview
   */
  private async getProjectFiles(): Promise<void> {
    try {
      const files = await this.fileSystemService.getWorkspaceFiles();
      this.postMessage('projectFiles', { files });
    } catch (error) {
      this.handleError(error);
    }
  }
  
  /**
   * Get contents of a file and send to webview
   * @param filePath Path of the file relative to workspace
   */
  private async getFileContents(filePath: string): Promise<void> {
    try {
      const content = await this.fileSystemService.getFileContents(filePath);
      this.postMessage('fileContents', { filePath, content });
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: unknown): void {
    console.error('Webview error:', error);
    this.postMessage('error', {
      message: error instanceof Error ? error.message : 'An error occurred',
    });
  }

  public updateModel(modelType: 'ollama' | 'gemini'): void {
    this.postMessage('modelChanged', { modelType });
  }

  public postMessage(type: string, payload: unknown): void {
    this.view?.webview.postMessage({ type, payload });
  }

  public setThemeHandler() {
    // Send initial theme
    this.postMessage('themeChanged', { 
      isDarkMode: vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark 
    });

    // Listen for theme changes
    this.disposables.push(
      vscode.window.onDidChangeActiveColorTheme(theme => {
        this.postMessage('themeChanged', { 
          isDarkMode: theme.kind === vscode.ColorThemeKind.Dark 
        });
      })
    );

    // Handle theme preference from webview
    if (this.view) {
      this.disposables.push(
        this.view.webview.onDidReceiveMessage(message => {
          if (message.type === 'setThemePreference') {
            this.configManager.setValue('uiTheme', 
              message.isDarkMode ? 'dark' : 'light'
            );
          }
        })
      );
    }
  }

  public dispose(): void {
    this.disposables.forEach(disposable => disposable.dispose());
  }
}