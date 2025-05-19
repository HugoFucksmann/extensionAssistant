/**
 * Proveedor de webview para la arquitectura Windsurf
 * Gestiona la interfaz de usuario y la comunicación con el controlador Windsurf
 */

import * as vscode from 'vscode';
import { WindsurfController } from '../../core/windsurfController';
import { getHtmlContent } from './htmlTemplate';

/**
 * Proveedor de webview para la extensión
 * Implementa la interfaz WebviewViewProvider de VS Code
 */
export class WebviewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private disposables: vscode.Disposable[] = [];
  private currentChatId: string = '';
  
  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly controller: WindsurfController
  ) {
    // Generar un ID de chat inicial
    this.currentChatId = this.generateChatId();
    console.log('[WebviewProvider] Initialized');
  }
  
  /**
   * Método requerido por la interfaz WebviewViewProvider
   * Se llama cuando la vista de webview se crea o se vuelve visible
   */
  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    
    // Configurar el webview
    this.configureWebview();
    
    // Configurar los manejadores de mensajes
    this.setupMessageHandlers();
    
    // Configurar el manejador de temas
    this.setupThemeHandler();
    
    // Enviar la lista de chats inicial
    this.sendChatList();
    
    console.log('[WebviewProvider] Webview resolved');
  }
  
  /**
   * Configura las opciones del webview y establece el HTML inicial
   */
  private configureWebview(): void {
    if (!this.view) return;
    
    // Configurar opciones del webview
    this.view.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri]
    };
    
    // Establecer el HTML inicial
    this.view.webview.html = getHtmlContent(this.extensionUri, this.view.webview);
  }
  
  /**
   * Configura los manejadores de mensajes desde el webview
   */
  private setupMessageHandlers(): void {
    if (!this.view) return;
    
    this.view.webview.onDidReceiveMessage(
      async (message) => {
        try {
          switch (message.type) {
            case 'sendMessage':
              await this.handleUserMessage(message.text, message.files || []);
              break;
              
            case 'newChat':
              this.handleNewChat();
              break;
              
            case 'loadChat':
              await this.handleLoadChat(message.chatId);
              break;
              
            case 'deleteChat':
              await this.handleDeleteChat(message.chatId);
              break;
              
            case 'updateChatTitle':
              await this.handleUpdateChatTitle(message.chatId, message.title);
              break;
              
            case 'getChats':
              await this.sendChatList();
              break;
              
            case 'getFileContents':
              await this.handleGetFileContents(message.filePath);
              break;
              
            case 'getProjectFiles':
              await this.handleGetProjectFiles();
              break;
              
            case 'switchModel':
              await this.handleSwitchModel(message.modelType);
              break;
          }
        } catch (error) {
          console.error('[WebviewProvider] Error handling message:', error);
          this.postMessage('error', {
            message: error instanceof Error ? error.message : 'An unknown error occurred'
          });
        }
      },
      null,
      this.disposables
    );
  }
  
  /**
   * Configura el manejador de cambios de tema
   */
  private setupThemeHandler(): void {
    if (!this.view) return;
    
    // Enviar el tema inicial
    this.postMessage('themeChanged', {
      isDarkMode: vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark
    });
    
    // Escuchar cambios de tema
    this.disposables.push(
      vscode.window.onDidChangeActiveColorTheme(theme => {
        this.postMessage('themeChanged', {
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
  private async handleUserMessage(text: string, files: string[] = []): Promise<void> {
    if (!text.trim() && files.length === 0) return;
    
    try {
      // Mostrar indicador de carga
      this.postMessage('processingStarted', {});
      
      // Agregar el mensaje del usuario a la UI
      this.postMessage('messageAdded', {
        sender: 'user',
        content: text,
        timestamp: Date.now()
      });
      
      // Procesar el mensaje con el controlador Windsurf
      const contextData = {
        files,
        // Agregar cualquier otro dato de contexto necesario
      };
      
      const response = await this.controller.processUserMessage(
        this.currentChatId,
        text,
        contextData
      );
      
      // Agregar la respuesta a la UI
      this.postMessage('messageAdded', {
        sender: 'assistant',
        content: response,
        timestamp: Date.now()
      });
      
      // Actualizar la lista de chats
      this.sendChatList();
      
      // Finalizar indicador de carga
      this.postMessage('processingFinished', {});
    } catch (error) {
      console.error('[WebviewProvider] Error processing message:', error);
      
      // Finalizar indicador de carga
      this.postMessage('processingFinished', {});
      
      // Mostrar error
      this.postMessage('error', {
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  }
  
  /**
   * Maneja la creación de un nuevo chat
   */
  private handleNewChat(): void {
    // Generar un nuevo ID de chat
    this.currentChatId = this.generateChatId();
    
    // Limpiar la UI
    this.postMessage('chatCleared', {});
    
    // Actualizar la lista de chats
    this.sendChatList();
  }
  
  /**
   * Maneja la carga de un chat existente
   * @param chatId ID del chat a cargar
   */
  private async handleLoadChat(chatId: string): Promise<void> {
    // Implementar cuando tengamos el sistema de persistencia
    // Por ahora, simplemente cambiar el ID de chat actual
    this.currentChatId = chatId;
    
    // Limpiar la UI
    this.postMessage('chatCleared', {});
    
    // Cargar los mensajes del chat (a implementar)
    // ...
  }
  
  /**
   * Maneja la eliminación de un chat
   * @param chatId ID del chat a eliminar
   */
  private async handleDeleteChat(chatId: string): Promise<void> {
    // Implementar cuando tengamos el sistema de persistencia
    // ...
    
    // Si el chat eliminado es el actual, crear uno nuevo
    if (chatId === this.currentChatId) {
      this.handleNewChat();
    }
    
    // Actualizar la lista de chats
    this.sendChatList();
  }
  
  /**
   * Maneja la actualización del título de un chat
   * @param chatId ID del chat
   * @param title Nuevo título
   */
  private async handleUpdateChatTitle(chatId: string, title: string): Promise<void> {
    // Implementar cuando tengamos el sistema de persistencia
    // ...
    
    // Actualizar la lista de chats
    this.sendChatList();
  }
  
  /**
   * Envía la lista de chats al webview
   */
  private async sendChatList(): Promise<void> {
    // Implementar cuando tengamos el sistema de persistencia
    // Por ahora, enviar solo el chat actual
    const chats = [{
      id: this.currentChatId,
      title: 'Nueva conversación',
      timestamp: Date.now(),
      preview: ''
    }];
    
    this.postMessage('chatsLoaded', { chats });
  }
  
  /**
   * Maneja la obtención del contenido de un archivo
   * @param filePath Ruta del archivo
   */
  private async handleGetFileContents(filePath: string): Promise<void> {
    try {
      // Usar el controlador para obtener el contenido del archivo
      // Esto debería usar una herramienta registrada en el ToolRegistry
      // Por ahora, implementación simple
      const uri = vscode.Uri.file(filePath);
      const content = await vscode.workspace.fs.readFile(uri);
      const text = new TextDecoder().decode(content);
      
      this.postMessage('fileContentsLoaded', {
        filePath,
        content: text
      });
    } catch (error) {
      console.error('[WebviewProvider] Error getting file contents:', error);
      this.postMessage('error', {
        message: `Error loading file: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }
  
  /**
   * Maneja la obtención de la lista de archivos del proyecto
   */
  private async handleGetProjectFiles(): Promise<void> {
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
      
      this.postMessage('projectFilesLoaded', { files });
    } catch (error) {
      console.error('[WebviewProvider] Error getting project files:', error);
      this.postMessage('error', {
        message: `Error loading project files: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }
  
  /**
   * Maneja el cambio de modelo
   * @param modelType Tipo de modelo a usar
   */
  private async handleSwitchModel(modelType: string): Promise<void> {
    // Implementar cuando tengamos el sistema de configuración
    // ...
    
    this.postMessage('modelSwitched', { modelType });
  }
  
  /**
   * Envía un mensaje al webview
   * @param type Tipo de mensaje
   * @param payload Datos del mensaje
   */
  private postMessage(type: string, payload: any): void {
    this.view?.webview.postMessage({ type, payload });
  }
  
  /**
   * Genera un ID único para un chat
   * @returns ID único
   */
  private generateChatId(): string {
    return `chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
  
  /**
   * Libera los recursos al desactivar la extensión
   */
  public dispose(): void {
    this.disposables.forEach(disposable => disposable.dispose());
  }
}