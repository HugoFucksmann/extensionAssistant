import * as vscode from 'vscode';
import { EventBus } from './eventBus';
import { WebViewManager } from '../vscode_integration/webviewManager';
import { OrchestratorAgent } from '../agents/orchestratorAgent';
import { MemoryAgent } from '../agents/memory/memoryAgent';
import { CommandManager } from '../commands/commandManager';
import { ModelAPIProvider } from '../models/modelApiProvider';

/**
 * Clase central que inicializa y coordina todos los componentes de la extensión
 * Actúa como un contenedor de dependencias y mediador para comunicaciones
 */
export class ExtensionContext {
  private eventBus: EventBus;
  private webViewManager: WebViewManager | null = null;
  private modelProvider: ModelAPIProvider | null = null;
  private orchestratorAgent: OrchestratorAgent | null = null;
  private memoryAgent: MemoryAgent | null = null;
  private commandManager: CommandManager | null = null;

  constructor() {
    // Crear el bus de eventos central
    this.eventBus = new EventBus();
    console.log('ExtensionContext y EventBus inicializados');
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
      console.log('Iniciando inicialización de componentes...');
      
      // Configuración desde VS Code
      const config = vscode.workspace.getConfiguration('extensionAssistant');
      const initialModelType = config.get<'ollama' | 'gemini'>('modelType') || 'gemini';
      
      // Inicializar el proveedor de modelos o usar el proporcionado
      this.modelProvider = modelProvider || new ModelAPIProvider(this.eventBus, initialModelType);
      await this.modelProvider.initialize();
      
      // Inicializar el agente de memoria
      this.memoryAgent = new MemoryAgent(context, this.eventBus);
      await this.memoryAgent.initialize();
      
      // Inicializar el WebViewManager
      this.webViewManager = new WebViewManager(context.extensionUri, this.eventBus);
      
      // Inicializar el gestor de comandos
      this.commandManager = new CommandManager(this.eventBus);
      
      // Registrar comandos en VS Code
      const commandDisposables = this.commandManager.registerCommands(context);
      commandDisposables.forEach(disposable => context.subscriptions.push(disposable));
      
      // Inicializar el orquestrador último ya que depende de los demás
      this.orchestratorAgent = new OrchestratorAgent(this.eventBus, this.modelProvider);
      await this.orchestratorAgent.initialize(context);
      
      // Registrar el proveedor de WebView
      context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
          'aiChat.chatView',
          this.webViewManager
        )
      );
      
      // Cargar la lista de chats al inicio
      await this.memoryAgent.loadChatList();
      
      // Registrar la limpieza de recursos
      context.subscriptions.push({
        dispose: () => this.dispose()
      });
      
      console.log('Todos los componentes inicializados correctamente');
    } catch (error) {
      console.error('Error al inicializar componentes:', error);
      vscode.window.showErrorMessage(`Error al inicializar la extensión: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      throw error;
    }
  }
  
  /**
   * Obtiene el bus de eventos
   * @returns El bus de eventos central
   */
  public getEventBus(): EventBus {
    return this.eventBus;
  }
  
  /**
   * Obtiene el proveedor de modelos
   * @returns El proveedor de modelos o null si no está inicializado
   */
  public getModelProvider(): ModelAPIProvider | null {
    return this.modelProvider;
  }
  
  /**
   * Obtiene el WebViewManager
   * @returns El WebViewManager o null si no está inicializado
   */
  public getWebViewManager(): WebViewManager | null {
    return this.webViewManager;
  }
  
  /**
   * Obtiene el agente orquestrador
   * @returns El agente orquestrador o null si no está inicializado
   */
  public getOrchestratorAgent(): OrchestratorAgent | null {
    return this.orchestratorAgent;
  }
  
  /**
   * Obtiene el agente de memoria
   * @returns El agente de memoria o null si no está inicializado
   */
  public getMemoryAgent(): MemoryAgent | null {
    return this.memoryAgent;
  }
  
  /**
   * Obtiene el gestor de comandos
   * @returns El gestor de comandos o null si no está inicializado
   */
  public getCommandManager(): CommandManager | null {
    return this.commandManager;
  }
  
  /**
   * Libera todos los recursos utilizados por la extensión
   */
  public dispose(): void {
    console.log('Liberando recursos de ExtensionContext...');
    
    // Guardar el estado actual del chat antes de liberar recursos
    if (this.memoryAgent) {
      try {
        // No hacemos await aquí para no bloquear la liberación de recursos
        this.memoryAgent.dispose();
      } catch (error) {
        console.error('Error al guardar el estado de memoria:', error);
      }
      this.memoryAgent = null;
    }
    
    // Liberar recursos en orden inverso al de creación
    if (this.orchestratorAgent) {
      this.orchestratorAgent.dispose();
      this.orchestratorAgent = null;
    }
    
    // El CommandManager no tiene un método dispose explícito
    this.commandManager = null;
    
    // El WebViewManager no necesita limpieza especial
    this.webViewManager = null;
    
    // Liberar el proveedor de modelos
    if (this.modelProvider) {
      // Cancelar cualquier solicitud pendiente
      this.modelProvider.abortRequest();
      this.modelProvider = null;
    }
    
    console.log('Todos los recursos liberados correctamente');
  }
}