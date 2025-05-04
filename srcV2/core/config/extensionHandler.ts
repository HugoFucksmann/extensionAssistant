import * as vscode from 'vscode';
import { CommandRegistry } from '../commands/commandRegistry';
import { WebViewManager } from '../../ui/webviewManager';
import { log } from '../../utils/logger';
import { OrchestratorService } from '../../orchestrator/orchestratorService';
import { ConfigurationManager } from './ConfigurationManager';
import { ACTIONS } from './constants';
import { DependencyContainer } from '../dependencyContainer';

/**
 * Central class that manages the extension components and their lifecycle
 */
export class ExtensionHandler {
  // Singleton implementation
  private static instance: ExtensionHandler | null = null;

  public static getInstance(): ExtensionHandler {
    if (!ExtensionHandler.instance) {
      throw new Error('ExtensionHandler no inicializado. Llame a initialize() primero.');
    }
    return ExtensionHandler.instance;
  }

  /**
   * Inicializa la instancia singleton con el contexto de la extensión
   */
  public static async initialize(context: vscode.ExtensionContext): Promise<ExtensionHandler> {
    if (!ExtensionHandler.instance) {
      // Inicializar el contenedor de dependencias primero
      const dependencyContainer = DependencyContainer.getInstance();
      await dependencyContainer.initialize(context);
      
      // Crear la instancia de ExtensionHandler
      ExtensionHandler.instance = new ExtensionHandler(context);
      await ExtensionHandler.instance.initializeComponents();
    }
    return ExtensionHandler.instance;
  }

  // Contexto de la extensión
  private context: vscode.ExtensionContext;
  
  // Contenedor de dependencias
  private dependencyContainer: DependencyContainer;
  
  // Componentes de servicio
  private commandRegistry: CommandRegistry | null = null;
  private webViewManager: WebViewManager | null = null;
  
  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.dependencyContainer = DependencyContainer.getInstance();
  }

  /**
   * Inicializa todos los componentes de la extensión en un orden correcto
   * utilizando el contenedor de dependencias
   */
  public async initializeComponents(): Promise<void> {
    try {
      log('Inicializando componentes de la extensión...','info');
      
      // 1. Inicializar servicios de datos a través del contenedor
      await this.dependencyContainer.initializeDataServices();
      
      // 2. Inicializar y registrar comandos
      this.commandRegistry = new CommandRegistry();
      this.registerCommands();
      
      // 3. Inicializar orquestador - componente central
      await this.dependencyContainer.initializeOrchestrator();
      
      // 4. Inicializar WebView
      this.webViewManager = new WebViewManager(
        this.context.extensionUri,
        this.dependencyContainer.getOrchestratorService()
      );
      
      // Registrar el WebViewManager como proveedor de webview
      const webviewDisposable = vscode.window.registerWebviewViewProvider(
        'aiChat.chatView',
        this.webViewManager
      );
      this.context.subscriptions.push(webviewDisposable);
      
      log('Extensión inicializada correctamente','info');
    } catch (error) {
      log('Error al inicializar la extensión:', 'error');
      throw error;
    }
  }

  /**
   * Inicializa el orquestador y sus componentes
   */
  private async initializeOrchestrator(): Promise<OrchestratorService | undefined> {
   
    try {
      // Pasar todas las propiedades requeridas por OrchestratorCreateOptions
      return await OrchestratorService.create({
        eventBus: this.dependencyContainer.getEventBus(),
       
        errorHandler: this.dependencyContainer.getErrorHandler(),
        configurationManager: this.dependencyContainer.getConfigManager(), 
        context: this.context
      });
    } catch (error) {
      log('Error al inicializar el orquestador:', 'error');
      throw error;
    }
  }

  /**
   * Registra los manejadores de comandos
   */
  private registerCommands(): void {
    if (!this.commandRegistry) return;
    
    // Registrar comando para crear un nuevo chat (ahora simplemente limpia la UI)
    this.commandRegistry.register(ACTIONS.NEW_CHAT, async () => {
      // Notificar a la UI para limpiar el chat
      // La implementación real se maneja en webviewProvider.ts
      console.log('Comando nuevo chat ejecutado');
    });
    
   /*  // Registrar comando para cambiar el modelo
    this.commandRegistry.register(ACTIONS.SET_MODEL, async (args: { modelType: 'ollama' | 'gemini' }) => {
      const baseAPI = this.dependencyContainer.getBaseAPI();
      await baseAPI.setModel(args.modelType);
    }); */
    
    // Registrar comando para mostrar el chat
    this.commandRegistry.register('chat:show', async () => {
      vscode.commands.executeCommand('aiChat.chatView.focus');
    });
    
    // Registrar comandos con VS Code
    const commandDisposables = this.commandRegistry.registerWithVSCode(this.context);
    commandDisposables.forEach(disposable => 
      this.context.subscriptions.push(disposable)
    );
  }

/**
 * Procesa un mensaje de usuario directamente a través del orquestador
 */
public async processMessage(message: string): Promise<string> {
  try {
    const orchestratorService = this.getOrchestratorService();
    const result = await orchestratorService.orchestrateRequest(message);
    
    if (result.success) {
      // Extraer la respuesta del resultado
      if (typeof result.finalResult === 'string') {
        return result.finalResult;
      } else if (result.finalResult && typeof result.finalResult.response === 'string') {
        return result.finalResult.response;
      } else {
        return 'Operación completada exitosamente';
      }
    } else {
      throw new Error(result?.error?.message || 'Error en la orquestación');
    }
  } catch (error) {
    console.error('[ExtensionHandler] Error al procesar mensaje:', error);
    const errorHandler = this.dependencyContainer.getErrorHandler();
    return errorHandler.handleAndRespondToError(error, 'OrchestratorService');
  }
}

  // Getters para componentes y servicios principales
  public getContext(): vscode.ExtensionContext { return this.context; }
  public getConfigManager(): ConfigurationManager { return this.dependencyContainer.getConfigManager(); }
  public getErrorHandler() { return this.dependencyContainer.getErrorHandler(); }
  public getEventBus() { return this.dependencyContainer.getEventBus(); }
  
  // Getters para componentes de servicio
  public getStorage() { return this.dependencyContainer.getStorage(); }
  public getCommandRegistry(): CommandRegistry | null { return this.commandRegistry; }
  public getWebViewManager(): WebViewManager | null { return this.webViewManager; }
  public getOrchestratorService(): OrchestratorService { return this.dependencyContainer.getOrchestratorService(); }
  public getDependencyContainer(): DependencyContainer { return this.dependencyContainer; }

  /**
   * Libera todos los recursos
   */
  public dispose(): void {
    log('Liberando recursos de la extensión...','info');
    
    // Disponer servicios en orden inverso de dependencia
    if (this.webViewManager) {
      this.webViewManager.dispose();
      this.webViewManager = null;
    }
    
    // Liberar recursos del contenedor de dependencias
    this.dependencyContainer.dispose();
    
    // Limpiar instancia singleton
    ExtensionHandler.instance = null;
    
    log('Extensión liberada','info');
  }
}