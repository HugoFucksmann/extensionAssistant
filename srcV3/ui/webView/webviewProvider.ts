import * as vscode from 'vscode';
import { ConfigurationManager } from '../../config/ConfigurationManager';
import { getHtmlContent } from './htmlTemplate';
import { ChatService } from '../../services/chatService';

// Remove FileSystemService import
// import { FileSystemService } from '../../services/fileSystemService';

// Import ToolRunner to use directly for UI-initiated tool calls (like getting files)
import { ToolRunner } from '../../tools/core/toolRunner';


export class WebviewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private disposables: vscode.Disposable[] = [];

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly configManager: ConfigurationManager,
    private readonly chatService: ChatService,
    // Remove FileSystemService dependency
    // private readonly fileSystemService: FileSystemService
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
      // ChatService now handles the orchestration flow using the new context
      const responseMessage = await this.chatService.sendMessage(text, files);

      this.postMessage('chatResponse', {
        text: responseMessage.content,
        chatId: responseMessage.chatId,
        timestamp: responseMessage.timestamp
      });

      // Refresh chat list in UI after sending a message (might update preview/timestamp)
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
        // ConfigManager handles persistence, ModelManager handles the actual switch
        await this.configManager.setModelType(message.modelType); // Use configManager to persist
        // ModelManager listens to config changes or we explicitly tell it?
        // Current ModelManager doesn't listen, so explicitly tell it or rely on next prompt
        // Let's rely on ModelManager getting the type from ConfigManager on next prompt for now.
        // Or add a method to ModelManager to explicitly load config.
        // For now, just update UI:
        this.updateModel(message.modelType);
        break;

      case 'showHistory':
        this.showChatHistory();
        break;

      case 'getProjectFiles':
        // Use ToolRunner directly for UI-initiated tool calls
        await this.getProjectFiles();
        break;

      case 'getFileContents':
        // Use ToolRunner directly for UI-initiated tool calls
        await this.getFileContents(message.filePath);
        break;

      // Add handlers for new UI commands related to tools if needed later
      // case 'applyProposedChanges':
      //    // This would call a tool like 'codeManipulation.applyWorkspaceEdit'
      //    // Need to get the proposed changes from the active context (Orchestrator/ChatService)
      //    break;
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
      // ChatService prepares the state and UI updates
      this.chatService.prepareNewConversation();
      this.postMessage('newChat', {});
      // Optionally refresh chat list to show the "New Conversation" placeholder immediately
      this.sendChatList();
    } catch (error) {
      this.handleError(error);
    }
  }

  private async deleteChat(chatId: string): Promise<void> {
    try {
      await this.chatService.deleteConversation(chatId);
      this.sendChatList(); // Refresh list after deletion
    } catch (error) {
      this.handleError(error);
    }
  }

  private async updateChatTitle(chatId: string, title: string): Promise<void> {
    try {
      await this.chatService.updateConversationTitle(chatId, title);
      this.sendChatList(); // Refresh list to show updated title
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Fetch project files using ToolRunner and send them to the webview
   */
  private async getProjectFiles(): Promise<void> {
    try {
      // Use the ToolRunner to execute the 'filesystem.getWorkspaceFiles' tool
      // No params needed for this tool
      const files = await ToolRunner.runTool('filesystem.getWorkspaceFiles', {});
      this.postMessage('projectFiles', { files });
    } catch (error) {
      this.handleError(error);
      this.postMessage('projectFiles', { files: [], error: error instanceof Error ? error.message : String(error) }); // Send error back to UI
    }
  }

  /**
   * Get contents of a file using ToolRunner and send to webview
   * @param filePath Path of the file relative to workspace
   */
  private async getFileContents(filePath: string): Promise<void> {
    try {
      // Use the ToolRunner to execute the 'filesystem.getFileContents' tool
      const content = await ToolRunner.runTool('filesystem.getFileContents', { filePath });
      this.postMessage('fileContents', { filePath, content });
    } catch (error) {
      this.handleError(error);
      this.postMessage('fileContents', { filePath, content: `Error loading file: ${error instanceof Error ? error.message : String(error)}`, error: error instanceof Error ? error.message : String(error) }); // Send error back to UI
    }
  }

  private handleError(error: unknown): void {
    console.error('Webview error:', error);
    // You might want to send a more specific error message to the webview
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
    // Existing theme handling logic remains
    // ... (no changes needed here for Stage 2)
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
             // This preference might be better stored in GlobalContext now
             // For now, keep using configManager which uses globalState
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
    // No need to dispose ChatService or other core components here,
    // extension.ts handles that.
  }
}