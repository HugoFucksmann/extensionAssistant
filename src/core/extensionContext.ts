import * as vscode from 'vscode';
import { EventBus } from './eventBus';
import { ConfigManager } from './configManager';
import { WebViewManager } from '../vscode_integration/webviewManager';
import { ModelAPIProvider } from '../models/modelApiProvider';
import { OrchestratorAgent } from '../agents/orchestratorAgent';
import { CommandManager } from './commandManager';
import { MemoryManager } from './memoryManager';
import { ChatManager } from './chatManager';

/**
 * Clase central que inicializa y coordina todos los componentes de la extensión
 * Actúa como un contenedor de dependencias y mediador para comunicaciones
 */
export class ExtensionContext {
  private eventBus: EventBus;
  private configManager: ConfigManager;
  private webViewManager: WebViewManager | null = null;
  private modelProvider: ModelAPIProvider | null = null;
  private orchestratorAgent: OrchestratorAgent | null = null;
  private memoryManager: MemoryManager | null = null;
  private chatManager: ChatManager | null = null;
  private commandManager: CommandManager | null = null;

  constructor() {
    this.eventBus = new EventBus();
    this.configManager = new ConfigManager(this.eventBus);
  }

  /**
   * Inicializa todos los componentes de la extensión
   * @param context El contexto de la extensión de VS Code
   * @param modelProvider Opcional: proveedor de modelos ya inicializado
   */
  public async initializeComponents(
    context: vscode.ExtensionContext,
    modelProvider?: ModelAPIProvider
  ): Promise<void> {
    try {
      // Obtener configuración desde el ConfigManager
      const initialModelType = this.configManager.getModelType();
      
      // Inicializar el gestor de memoria primero
      this.memoryManager = new MemoryManager(context);
      await this.memoryManager.initialize();
      
      // Inicializar el gestor de chats después del gestor de memoria
      this.chatManager = new ChatManager(this.memoryManager, this.eventBus);
      await this.chatManager.initialize();
      
      // Inicializar el proveedor de modelos o usar el proporcionado
      const storage = this.memoryManager.getStorage();
      this.modelProvider = modelProvider || new ModelAPIProvider(this.eventBus, initialModelType);
      await this.modelProvider.initialize(storage);
      
      // Inicializar el WebViewManager
      this.webViewManager = new WebViewManager(context.extensionUri, this.eventBus);
      
      // Inicializar el gestor de comandos con referencias a los managers
      this.commandManager = new CommandManager(this.eventBus, this.chatManager, this.memoryManager);
      
      // Registrar comandos en VS Code
      const commandDisposables = this.commandManager.registerCommands(context);
      commandDisposables.forEach(disposable => context.subscriptions.push(disposable));
      
      // Inicializar el orquestrador último ya que depende de los demás
      this.orchestratorAgent = new OrchestratorAgent(this.eventBus, this.modelProvider);
      await this.orchestratorAgent.initialize(context);
      
      // Registrar el proveedor de WebView
      context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
          WebViewManager.viewType,
          this.webViewManager
        )
      );
      
      // Escuchar cambios de configuración
      this.eventBus.on('config:changed', async (payload) => {
        if (this.modelProvider && payload.modelType) {
          await this.modelProvider.setModel(payload.modelType);
        }
      });
      
      // Registrar la limpieza de recursos
      context.subscriptions.push({
        dispose: () => this.dispose()
      });
    } catch (error) {
      console.error('Error al inicializar componentes:', error);
      vscode.window.showErrorMessage(`Error al inicializar la extensión: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      throw error;
    }
  }
  
  public getEventBus(): EventBus {
    return this.eventBus;
  }
  
  public getModelProvider(): ModelAPIProvider | null {
    return this.modelProvider;
  }
  
  public getWebViewManager(): WebViewManager | null {
    return this.webViewManager;
  }
  
  public getOrchestratorAgent(): OrchestratorAgent | null {
    return this.orchestratorAgent;
  }
  
  public getMemoryManager(): MemoryManager | null {
    return this.memoryManager;
  }
  
  public getChatManager(): ChatManager | null {
    return this.chatManager;
  }
  
  public getCommandManager(): CommandManager | null {
    return this.commandManager;
  }
  
  public getConfigManager(): ConfigManager {
    return this.configManager;
  }
  
  /**
   * Libera todos los recursos utilizados por la extensión
   */
  public dispose(): void {
    // Guardar el estado actual del chat antes de liberar recursos
    if (this.chatManager) {
      try {
        this.chatManager.dispose();
      } catch (error) {
        console.error('Error al liberar recursos del ChatManager:', error);
      }
      this.chatManager = null;
    }
    
    if (this.memoryManager) {
      try {
        this.memoryManager.dispose();
      } catch (error) {
        console.error('Error al liberar recursos del MemoryManager:', error);
      }
      this.memoryManager = null;
    }
    
    // Liberar recursos en orden inverso al de creación
    if (this.orchestratorAgent) {
      this.orchestratorAgent.dispose();
      this.orchestratorAgent = null;
    }
    
    this.commandManager = null;
    this.webViewManager = null;
    
    // Liberar el proveedor de modelos
    if (this.modelProvider) {
      this.modelProvider.abortRequest();
      this.modelProvider = null;
    }
  }
}