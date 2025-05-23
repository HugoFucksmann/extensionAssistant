/**
 * MessageHandler - Handles messages from the webview
 */

import * as vscode from 'vscode';
import { WindsurfController } from '../../core/WindsurfController';

interface MessageResult {
  type: string;
  payload: any;
}

export class MessageHandler {
  constructor(
    private controller: WindsurfController,
    private currentChatId: string
  ) {}

  async handle(message: any): Promise<MessageResult | null> {
    switch (message.type) {
      case 'sendMessage':
        return await this.handleUserMessage(message.text, message.files || []);
      
      case 'newChat':
        return this.handleNewChat();
      
      case 'getChats':
        return await this.handleGetChats();
      
      case 'getFileContents':
        return await this.handleGetFileContents(message.filePath);
      
      case 'getProjectFiles':
        return await this.handleGetProjectFiles();
      
      case 'switchModel':
        return await this.handleSwitchModel(message.modelType);
      
      default:
        console.warn(`Unhandled message type: ${message.type}`);
        return null;
    }
  }

  private async handleUserMessage(text: string, files: string[] = []): Promise<MessageResult> {
    if (!text.trim() && files.length === 0) {
      throw new Error('Message cannot be empty');
    }

    // Add user message to UI
    const userMessageResult: MessageResult = {
      type: 'messageAdded',
      payload: {
        sender: 'user',
        content: text,
        timestamp: Date.now(),
        chatId: this.currentChatId
      }
    };

    // Process with controller (response comes through events)
    const contextData = {
      files,
      editorContext: await this.getEditorContext()
    };

    this.controller.processUserMessage(this.currentChatId, text, contextData);
    
    return userMessageResult;
  }

  private handleNewChat(): MessageResult {
    return {
      type: 'chatCleared',
      payload: {}
    };
  }

  private async handleGetChats(): Promise<MessageResult> {
    // Simplified - return current chat only
    const chats = [{
      id: this.currentChatId,
      title: 'Nueva conversación',
      timestamp: Date.now(),
      preview: ''
    }];

    return {
      type: 'chatsLoaded',
      payload: { chats }
    };
  }

  private async handleGetFileContents(filePath: string): Promise<MessageResult> {
    try {
      const uri = vscode.Uri.file(filePath);
      const content = await vscode.workspace.fs.readFile(uri);
      const text = new TextDecoder().decode(content);

      return {
        type: 'fileContentsLoaded',
        payload: { filePath, content: text }
      };
    } catch (error) {
      throw new Error(`Error loading file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleGetProjectFiles(): Promise<MessageResult> {
    try {
      const files: string[] = [];

      if (vscode.workspace.workspaceFolders) {
        for (const folder of vscode.workspace.workspaceFolders) {
          const pattern = new vscode.RelativePattern(folder, '**/*');
          const uris = await vscode.workspace.findFiles(pattern, '**/node_modules/**');
          files.push(...uris.map(uri => uri.fsPath));
        }
      }

      return {
        type: 'projectFilesLoaded',
        payload: { files }
      };
    } catch (error) {
      throw new Error(`Error loading project files: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleSwitchModel(modelType: string): Promise<MessageResult> {
    return {
      type: 'modelSwitched',
      payload: { modelType }
    };
  }

  private async getEditorContext(): Promise<any> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return null;

    return {
      fileName: editor.document.fileName,
      languageId: editor.document.languageId,
      selection: editor.selection ? {
        start: { line: editor.selection.start.line, character: editor.selection.start.character },
        end: { line: editor.selection.end.line, character: editor.selection.end.character }
      } : null
    };
  }
}