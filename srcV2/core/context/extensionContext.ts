import * as vscode from 'vscode';
import { UIStateContext } from './uiStateContext';
import { ConfigManager } from '../config/configManager';
import { CommandRegistry } from '../commands/commandRegistry';
import { BaseAPI } from '../../models/baseAPI';
import { ChatService } from '../../services/chatService';
import { SQLiteStorage } from '../storage/db/SQLiteStorage';
import { WebViewManager } from '../../ui/webviewManager';

/**
 * Clase central que inicializa y coordina todos los componentes de la extensión
 * para el flujo directo (sin orquestación)
 */
export class ExtensionContext {
  private uiStateContext: UIStateContext;
  private configManager: ConfigManager;
  private commandRegistry: CommandRegistry | null = null;
  private baseAPI: BaseAPI | null = null;
  private chatService: ChatService | null = null;
  private storage: SQLiteStorage | null = null;
  private webViewManager: WebViewManager | null = null;

  constructor() {
    this.uiStateContext = new UIStateContext();
    this.configManager = new ConfigManager(this.uiStateContext);
  }

  /**
   * Inicializa todos los componentes de la extensión para el flujo directo
   */
  public async initializeComponents(context: vscode.ExtensionContext): Promise<void> {
    try {
      // Inicializar almacenamiento
      this.storage = new SQLiteStorage(context);
      
      // Inicializar API de modelo
      const initialModelType = this.configManager.getModelType();
      this.baseAPI = new BaseAPI(this.configManager, this.uiStateContext, initialModelType); 
      await this.baseAPI.initialize();
      
      // Inicializar servicio de chat
      this.chatService = new ChatService(this.storage, this.uiStateContext, this.baseAPI);
      await this.chatService.initialize();
      
      // Inicializar el WebViewManager
      this.webViewManager = new WebViewManager(
        context.extensionUri,
        this.uiStateContext,
        this.chatService
      );
      
      // Registrar el proveedor de WebView
      context.subscriptions.push(
        this.webViewManager.register(context)
      );
      
      // Inicializar registro de comandos
      this.commandRegistry = new CommandRegistry();
      
      // Registrar comandos para el flujo directo
      this.registerDirectFlowCommands();
      
      // Registrar comandos en VS Code
      const commandDisposables = this.commandRegistry.registerWithVSCode(context);
      commandDisposables.forEach(disposable => context.subscriptions.push(disposable));
      
      // Registrar limpieza de recursos
      context.subscriptions.push({
        dispose: () => this.dispose()
      });
      
      console.log('Componentes del flujo directo inicializados correctamente');
    } catch (error) {
      console.error('Error al inicializar componentes del flujo directo:', error);
      vscode.window.showErrorMessage(`Error al inicializar la extensión: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      throw error;
    }
  }
  
  /**
   * Registra los comandos para el flujo directo
   */
  private registerDirectFlowCommands(): void {
    if (!this.commandRegistry || !this.chatService || !this.baseAPI) return;
    
    // Registrar comandos de chat
    this.commandRegistry.register('chat:new', () => this.chatService?.createNewChat());
    this.commandRegistry.register('chat:load', (args: any) => {
      if (args?.chatId) {
        return this.chatService?.loadChat(args.chatId, args.loadMessages !== false);
      }
    });
    this.commandRegistry.register('chat:list:load', () => this.chatService?.getChatList());
    
    // Registrar comandos de modelo
    this.commandRegistry.register('model:change', (args: any) => {
      const modelType = args?.modelType || 'gemini';
      return this.baseAPI?.setModel(modelType);
    });
    
    // Registrar comandos de mensaje
    this.commandRegistry.register('message:send', (args: any) => {
      if (args?.message) {
        return this.chatService?.processUserMessage(args.message);
      }
    });
  }
  
  /**
   * Libera todos los recursos utilizados por la extensión
   */
  public dispose(): void {
    // Liberar recursos en orden inverso al de creación
    if (this.webViewManager) {
      this.webViewManager.dispose();
      this.webViewManager = null;
    }
    
    if (this.chatService) {
      this.chatService.dispose();
      this.chatService = null;
    }
    
    if (this.baseAPI) {
      this.baseAPI.abortRequest();
      this.baseAPI = null;
    }
    
    if (this.storage) {
      this.storage.close();
      this.storage = null;
    }
    
    this.commandRegistry = null;
    
    console.log('Recursos del flujo directo liberados correctamente');
  }
  
  // Getters para acceder a los componentes
  public getUIStateContext(): UIStateContext {
    return this.uiStateContext;
  }
  
  public getConfigManager(): ConfigManager {
    return this.configManager;
  }
  
  public getBaseAPI(): BaseAPI | null {
    return this.baseAPI;
  }
  
  public getChatService(): ChatService | null {
    return this.chatService;
  }
  
  public getWebViewManager(): WebViewManager | null {
    return this.webViewManager;
  }
}