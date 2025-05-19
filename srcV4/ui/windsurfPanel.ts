/**
 * Panel principal de la UI para la arquitectura Windsurf
 * Gestiona la interfaz de usuario y la comunicación con el controlador Windsurf
 */

import * as vscode from 'vscode';
import { WindsurfController } from '../core/windsurfController';
import { getHtmlContent } from './webView/htmlTemplate';

/**
 * Panel principal de la extensión
 * Implementa el patrón singleton para asegurar una única instancia
 */
export class WindsurfPanel {
  public static currentPanel: WindsurfPanel | undefined;
  
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private readonly _controller: WindsurfController;
  private _disposables: vscode.Disposable[] = [];
  
  private _currentChatId: string = '';
  
  private constructor(extensionUri: vscode.Uri, controller: WindsurfController) {
    this._extensionUri = extensionUri;
    this._controller = controller;
    
    // Crear el panel de webview
    this._panel = vscode.window.createWebviewPanel(
      'windsurfPanel',
      'Extension Assistant V4',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        localResourceRoots: [extensionUri],
        retainContextWhenHidden: true
      }
    );
    
    // Configurar el HTML inicial
    this._panel.webview.html = getHtmlContent(this._extensionUri, this._panel.webview);
    
    // Configurar los manejadores de mensajes
    this._setupMessageHandlers();
    
    // Manejar cuando el panel se cierra
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    
    // Manejar cambios de tema
    this._setupThemeHandler();
    
    // Generar un nuevo ID de chat
    this._currentChatId = this._generateChatId();
    
    console.log('[WindsurfPanel] Initialized');
  }
  
  /**
   * Crea o muestra el panel
   * @param extensionUri URI de la extensión
   * @param controller Controlador Windsurf
   * @returns La instancia del panel
   */
  public static createOrShow(extensionUri: vscode.Uri, controller: WindsurfController): WindsurfPanel {
    // Si ya existe un panel, mostrarlo
    if (WindsurfPanel.currentPanel) {
      WindsurfPanel.currentPanel._panel.reveal();
      return WindsurfPanel.currentPanel;
    }
    
    // Si no, crear uno nuevo
    const panel = new WindsurfPanel(extensionUri, controller);
    WindsurfPanel.currentPanel = panel;
    return panel;
  }
  
  /**
   * Obtiene el panel actual
   * @returns El panel actual o undefined si no existe
   */
  public static getCurrentPanel(): WindsurfPanel | undefined {
    return WindsurfPanel.currentPanel;
  }
  
  /**
   * Configura los manejadores de mensajes desde el webview
   */
  private _setupMessageHandlers(): void {
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        try {
          switch (message.type) {
            case 'sendMessage':
              await this._handleUserMessage(message.text, message.files || []);
              break;
              
            case 'newChat':
              this._handleNewChat();
              break;
              
            case 'loadChat':
              await this._handleLoadChat(message.chatId);
              break;
              
            case 'deleteChat':
              await this._handleDeleteChat(message.chatId);
              break;
              
            case 'updateChatTitle':
              await this._handleUpdateChatTitle(message.chatId, message.title);
              break;
              
            case 'getChats':
              await this._handleGetChats();
              break;
              
            case 'getFileContents':
              await this._handleGetFileContents(message.filePath);
              break;
              
            case 'getProjectFiles':
              await this._handleGetProjectFiles();
              break;
              
            case 'switchModel':
              await this._handleSwitchModel(message.modelType);
              break;
          }
        } catch (error) {
          console.error('[WindsurfPanel] Error handling message:', error);
          this._postMessage('error', {
            message: error instanceof Error ? error.message : 'An unknown error occurred'
          });
        }
      },
      null,
      this._disposables
    );
  }
  
  /**
   * Configura el manejador de cambios de tema
   */
  private _setupThemeHandler(): void {
    // Enviar el tema inicial
    this._postMessage('themeChanged', {
      isDarkMode: vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark
    });
    
    // Escuchar cambios de tema
    this._disposables.push(
      vscode.window.onDidChangeActiveColorTheme(theme => {
        this._postMessage('themeChanged', {
          isDarkMode: theme.kind === vscode.ColorThemeKind.Dark
        });
      })
    );
  }
  
  /**
   * Maneja el envío de un mensaje del usuario
   * @param text Texto del mensaje
   * @param files Archivos adjuntos (opcional)
   */
  private async _handleUserMessage(text: string, files: string[] = []): Promise<void> {
    if (!text.trim() && files.length === 0) return;
    
    try {
      // Mostrar indicador de carga
      this._postMessage('processingStarted', {});
      
      // Agregar el mensaje del usuario a la UI
      this._postMessage('messageAdded', {
        sender: 'user',
        content: text,
        timestamp: Date.now()
      });
      
      // Procesar el mensaje con el controlador Windsurf
      const contextData = {
        files,
        // Agregar cualquier otro dato de contexto necesario
      };
      
      const response = await this._controller.processUserMessage(
        this._currentChatId,
        text,
        contextData
      );
      
      // Agregar la respuesta a la UI
      this._postMessage('messageAdded', {
        sender: 'assistant',
        content: response,
        timestamp: Date.now()
      });
      
      // Actualizar la lista de chats
      this._handleGetChats();
      
      // Finalizar indicador de carga
      this._postMessage('processingFinished', {});
    } catch (error) {
      console.error('[WindsurfPanel] Error processing message:', error);
      
      // Finalizar indicador de carga
      this._postMessage('processingFinished', {});
      
      // Mostrar error
      this._postMessage('error', {
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  }
  
  /**
   * Maneja la creación de un nuevo chat
   */
  private _handleNewChat(): void {
    // Generar un nuevo ID de chat
    this._currentChatId = this._generateChatId();
    
    // Limpiar la UI
    this._postMessage('chatCleared', {});
    
    // Actualizar la lista de chats
    this._handleGetChats();
  }
  
  /**
   * Maneja la carga de un chat existente
   * @param chatId ID del chat a cargar
   */
  private async _handleLoadChat(chatId: string): Promise<void> {
    // Implementar cuando tengamos el sistema de persistencia
    // Por ahora, simplemente cambiar el ID de chat actual
    this._currentChatId = chatId;
    
    // Limpiar la UI
    this._postMessage('chatCleared', {});
    
    // Cargar los mensajes del chat (a implementar)
    // ...
  }
  
  /**
   * Maneja la eliminación de un chat
   * @param chatId ID del chat a eliminar
   */
  private async _handleDeleteChat(chatId: string): Promise<void> {
    // Implementar cuando tengamos el sistema de persistencia
    // ...
    
    // Si el chat eliminado es el actual, crear uno nuevo
    if (chatId === this._currentChatId) {
      this._handleNewChat();
    }
    
    // Actualizar la lista de chats
    this._handleGetChats();
  }
  
  /**
   * Maneja la actualización del título de un chat
   * @param chatId ID del chat
   * @param title Nuevo título
   */
  private async _handleUpdateChatTitle(chatId: string, title: string): Promise<void> {
    // Implementar cuando tengamos el sistema de persistencia
    // ...
    
    // Actualizar la lista de chats
    this._handleGetChats();
  }
  
  /**
   * Maneja la obtención de la lista de chats
   */
  private async _handleGetChats(): Promise<void> {
    // Implementar cuando tengamos el sistema de persistencia
    // Por ahora, enviar solo el chat actual
    const chats = [{
      id: this._currentChatId,
      title: 'Nueva conversación',
      timestamp: Date.now(),
      preview: ''
    }];
    
    this._postMessage('chatsLoaded', { chats });
  }
  
  /**
   * Maneja la obtención del contenido de un archivo
   * @param filePath Ruta del archivo
   */
  private async _handleGetFileContents(filePath: string): Promise<void> {
    try {
      // Usar el controlador para obtener el contenido del archivo
      // Esto debería usar una herramienta registrada en el ToolRegistry
      // Por ahora, implementación simple
      const uri = vscode.Uri.file(filePath);
      const content = await vscode.workspace.fs.readFile(uri);
      const text = new TextDecoder().decode(content);
      
      this._postMessage('fileContentsLoaded', {
        filePath,
        content: text
      });
    } catch (error) {
      console.error('[WindsurfPanel] Error getting file contents:', error);
      this._postMessage('error', {
        message: `Error loading file: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }
  
  /**
   * Maneja la obtención de la lista de archivos del proyecto
   */
  private async _handleGetProjectFiles(): Promise<void> {
    try {
      // Implementación simple para obtener archivos del workspace
      const files: string[] = [];
      
      if (vscode.workspace.workspaceFolders) {
        for (const folder of vscode.workspace.workspaceFolders) {
          const pattern = new vscode.RelativePattern(folder, '**/*');
          const uris = await vscode.workspace.findFiles(pattern, '**/node_modules/**');
          
          for (const uri of uris) {
            files.push(uri.fsPath);
          }
        }
      }
      
      this._postMessage('projectFilesLoaded', { files });
    } catch (error) {
      console.error('[WindsurfPanel] Error getting project files:', error);
      this._postMessage('error', {
        message: `Error loading project files: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }
  
  /**
   * Maneja el cambio de modelo
   * @param modelType Tipo de modelo a usar
   */
  private async _handleSwitchModel(modelType: string): Promise<void> {
    // Implementar cuando tengamos el sistema de configuración
    // ...
    
    this._postMessage('modelSwitched', { modelType });
  }
  
  /**
   * Envía un mensaje al webview
   * @param type Tipo de mensaje
   * @param payload Datos del mensaje
   */
  private _postMessage(type: string, payload: any): void {
    this._panel.webview.postMessage({ type, payload });
  }
  
  /**
   * Envía un mensaje al panel
   * @param message Mensaje a enviar
   */
  public sendMessage(message: string): void {
    this._handleUserMessage(message);
  }
  
  /**
   * Limpia la conversación actual
   */
  public clearConversation(): void {
    this._handleNewChat();
  }
  
  /**
   * Genera un ID único para un chat
   * @returns ID único
   */
  private _generateChatId(): string {
    return `chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
  
  /**
   * Libera los recursos al cerrar el panel
   */
  public dispose(): void {
    WindsurfPanel.currentPanel = undefined;
    
    this._panel.dispose();
    
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
