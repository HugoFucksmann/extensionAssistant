import * as vscode from 'vscode';
import { ConfigurationManager } from '../../config/ConfigurationManager';
import { getHtmlContent } from './htmlTemplate';
import { ChatService } from '../../services/chatService';

import { AgentOrchestratorService } from '../../orchestrator/agents/AgentOrchestratorService';

import { IWorkspaceService } from '../../workspace/interfaces'; // <-- Added import


export class WebviewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private disposables: vscode.Disposable[] = [];

  // Accept IWorkspaceService dependency
  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly configManager: ConfigurationManager,
    private readonly chatService: ChatService,
    private readonly agentOrchestratorService: AgentOrchestratorService,
    private readonly workspaceService: IWorkspaceService // <-- Added dependency
  ) {}

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    this.configureWebview();
    this.setupMessageHandlers();
    this.sendChatList();
    this.setThemeHandler();
    this.setupAgentStatusListener();

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
    const handler = this.view.webview.onDidReceiveMessage(async (message) => {
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
    this.disposables.push(handler);
  }

  /**
   * Sets up listener for agent status updates and forwards them to the webview.
   * @private
   */
  private setupAgentStatusListener(): void {
      const listener = this.agentOrchestratorService.on('agentStatusChanged', (chatId, agent, status, task, message) => {
          // Only send status updates for the currently active chat
          if (this.chatService.getCurrentConversationId() === chatId) {
              this.postMessage('agentStatusUpdate', { agent, status, task, message });
          }
      });
      this.disposables.push(listener);
  }


  private async handleChatMessage(text: string, files: string[] = []): Promise<void> {
    if (!text.trim() && files.length === 0) return;

    try {
      // Indicate that the main AI process is starting (optional, could be handled by Orchestrator status)
      this.postMessage('mainProcessStatus', { status: 'working', message: 'Thinking...' });

      const responseMessage = await this.chatService.sendMessage(text, files);

      this.postMessage('chatResponse', {
        text: responseMessage.content,
        chatId: responseMessage.chatId,
        timestamp: responseMessage.timestamp
      });

      this.postMessage('mainProcessStatus', { status: 'idle', message: 'Ready' }); // Indicate main process finished

      this.sendChatList();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.error('Error handling chat message:', error);
      this.postMessage('chat:error', { error: errorMessage });
      this.postMessage('mainProcessStatus', { status: 'error', message: 'Error occurred' }); // Indicate main process error
    }
  }

  private async handleCommand(message: any): Promise<void> {
    const { command } = message;

    try {
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
            await this.configManager.setModelType(message.modelType);
            
            this.updateModel(message.modelType);
            break;
          case 'showHistory':
            this.showChatHistory();
            break;
          case 'getProjectFiles':
          
            await this.getProjectFiles();
            break;
          case 'getFileContents':
        
            await this.getFileContents(message.filePath);
            break;
   
        }
    } catch (error) {
        this.handleError(error);
    }
  }

  public showChatHistory(): void {
    this.sendChatList();
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
      this.sendChatList();
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

  private async getProjectFiles(): Promise<void> {
    try {
      
        const files = await this.workspaceService.listWorkspaceFiles();
        this.postMessage('projectFiles', { files });
    } catch (error) {
        this.handleError(error);
        this.postMessage('projectFiles', { files: [], error: error instanceof Error ? error.message : String(error) });
    }
}

private async getFileContents(filePath: string): Promise<void> {
    try {
        // Use WorkspaceService instead of ToolRunner
        const content = await this.workspaceService.getFileContent(filePath);
        this.postMessage('fileContents', { filePath, content });
    } catch (error) {
        this.handleError(error);
        this.postMessage('fileContents', { filePath, content: `Error loading file: ${error instanceof Error ? error.message : String(error)}`, error: error instanceof Error ? error.message : String(error) });
    }
}


  private handleError(error: unknown): void {
    console.error('Webview error:', error);
    this.postMessage('error', {
      message: error instanceof Error ? error.message : 'An unknown error occurred',
      details: String(error)
    });
  }

  public updateModel(modelType: 'ollama' | 'gemini'): void {
    this.postMessage('modelChanged', { modelType });
  }

  public postMessage(type: string, payload: unknown): void {
    this.view?.webview.postMessage({ type, payload });
  }

  public setThemeHandler() {
     this.postMessage('themeChanged', {
       isDarkMode: vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark
     });
     const themeListener = vscode.window.onDidChangeActiveColorTheme(theme => {
       this.postMessage('themeChanged', {
         isDarkMode: theme.kind === vscode.ColorThemeKind.Dark
       });
     });
     this.disposables.push(themeListener);

     if (this.view) {
       const messageListener = this.view.webview.onDidReceiveMessage(message => {
         if (message.type === 'setThemePreference') {
           this.configManager.setValue('uiTheme',
             message.isDarkMode ? 'dark' : 'light'
           );
         }
       });
       this.disposables.push(messageListener);
     }
  }

  public dispose(): void {
    console.log('[WebviewProvider] Disposing.');
    this.disposables.forEach(disposable => disposable.dispose());
    this.disposables = []; 
    this.view = undefined; 
  }
}