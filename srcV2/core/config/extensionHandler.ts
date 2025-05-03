import * as vscode from 'vscode';
import { CommandRegistry } from '../commands/commandRegistry';
import { BaseAPI } from '../../models/baseAPI';
import { ChatService } from '../../services/chatService';
import { SQLiteStorage } from '../storage/db/SQLiteStorage';
import { WebViewManager } from '../../ui/webviewManager';
import { logger } from '../../utils/logger';
import { ErrorHandler } from '../../utils/errorHandler';
import { OrchestratorService } from '../../orchestrator/orchestratorService';
import { EventBus } from '../event/eventBus';
import { ConfigurationManager } from './ConfigurationManager';
import { MessageProcessor } from '../../services/messageProcessor';
import { ACTIONS } from './constants';

/**
 * Central class that manages the extension components and their lifecycle
 */
export class ExtensionHandler {
  // Singleton implementation
  private static instance: ExtensionHandler | null = null;
  private messageProcessor: MessageProcessor | null = null;

  public static getInstance(): ExtensionHandler {
    if (!ExtensionHandler.instance) {
      throw new Error("ExtensionHandler not initialized. Ensure 'activate' has been called.");
    }
    return ExtensionHandler.instance;
  }

  public static async initialize(context: vscode.ExtensionContext): Promise<ExtensionHandler> {
    if (ExtensionHandler.instance) {
      logger.warn("ExtensionHandler.initialize called multiple times.");
      return ExtensionHandler.instance;
    }
    
    const handler = new ExtensionHandler(context);
    await handler.initializeComponents();
    ExtensionHandler.instance = handler;
    return handler;
  }

  // Core components
  private readonly context: vscode.ExtensionContext;
  private readonly configManager: ConfigurationManager;
  private readonly errorHandler: ErrorHandler;
  private readonly eventBus: EventBus;

  // Service components
  private storage: SQLiteStorage | null = null;
  private baseAPI: BaseAPI | null = null;
  private chatService: ChatService | null = null;
  private commandRegistry: CommandRegistry | null = null;
  private webViewManager: WebViewManager | null = null;
  private orchestratorService: OrchestratorService | undefined;

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.configManager = ConfigurationManager.getInstance(context);
    this.eventBus = EventBus.getInstance();
    
    // Inicializar ErrorHandler con ConfigManager
    // El ChatService se asignará más tarde en initializeComponents
    this.errorHandler = new ErrorHandler(this.configManager);
  }

  /**
   * Inicializa todos los componentes de la extensión en un orden correcto
   */
 private async initializeComponents(): Promise<void> {
    try {
      logger.info('Inicializando componentes de la extensión...');
      
      // 1. Inicializar almacenamiento
      this.storage = new SQLiteStorage(this.context);
      
      // 2. Inicializar API con el gestor de configuración unificado
      this.baseAPI = new BaseAPI(this.configManager);
      await this.baseAPI.initialize();
      
      // 3. Inicializar servicio de chat
      this.chatService = new ChatService(
        this.storage, 
        this.configManager,
        this.baseAPI
      );
      await this.chatService.initialize();
      
      // 3.1 Actualizar errorHandler con el servicio de chat
      // Ahora que el chatService está inicializado, lo asignamos al errorHandler
      if (this.chatService) {
        // Actualizar el errorHandler con el chatService ahora disponible
        this.errorHandler.chatService = this.chatService;
      }
      
      // 4. Inicializar y registrar comandos
      this.commandRegistry = new CommandRegistry();
      this.registerCommands();
      
    // 5. Inicializar orquestador SIEMPRE
this.orchestratorService = await this.initializeOrchestrator();
console.log(`[ExtensionHandler] Orquestador inicializado: ${!!this.orchestratorService}`);
if (!this.orchestratorService) {
  throw new Error('No se pudo inicializar el OrchestratorService. La extensión no puede continuar.');
}
      
      // 6. Inicializar WebView
      this.webViewManager = new WebViewManager(
        this.context.extensionUri,
        this.configManager,
        this.chatService,
        this.orchestratorService
      );
      const webviewDisposable = this.webViewManager.register(this.context);
      this.context.subscriptions.push(webviewDisposable);
      
      // 7. Inicializar procesador de mensajes
      this.messageProcessor = new MessageProcessor(
        this.configManager,
        this.baseAPI,
        this.chatService,
        this.errorHandler,
      );
      
      logger.info('Extensión inicializada correctamente');
    } catch (error) {
      logger.error('Error al inicializar la extensión:', {error});
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
        eventBus: this.eventBus,
        logger: logger,
        errorHandler: this.errorHandler,
        baseAPI: this.baseAPI!,
        configurationManager: this.configManager, 
        context: this.context
      });
    } catch (error) {
      logger.error('Error al inicializar el orquestador:', {error});
      throw error;
    }
  }

  /**
   * Registra los manejadores de comandos
   */
  private registerCommands(): void {
    if (!this.commandRegistry) return;
    
    // Registrar comandos de chat
    this.commandRegistry.register(ACTIONS.NEW_CHAT, async () => {
      if (this.chatService) {
        await this.chatService.createNewChat();
      }
    });
    
    this.commandRegistry.register(ACTIONS.SET_MODEL, async (args: { modelType: 'ollama' | 'gemini' }) => {
      if (this.baseAPI) {
        await this.baseAPI.setModel(args.modelType);
      }
    });
    
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
   * Procesa un mensaje de usuario a través del orquestador o directamente
   */
  public async processMessage(message: string): Promise<string> {
    if (!this.messageProcessor) {
      throw new Error('Procesador de mensajes no inicializado');
    }
    
    return await this.messageProcessor.process(message);
  }

  // Getters para componentes y servicios principales
  public getContext(): vscode.ExtensionContext { return this.context; }
  public getConfigManager(): ConfigurationManager { return this.configManager; }
  public getErrorHandler(): ErrorHandler { return this.errorHandler; }
  public getEventBus(): EventBus { return this.eventBus; }
  
  // Getters para componentes de servicio (pueden ser null si no están inicializados)
  public getStorage(): SQLiteStorage | null { return this.storage; }
  public getBaseAPI(): BaseAPI | null { return this.baseAPI; }
  public getChatService(): ChatService | null { return this.chatService; }
  public getCommandRegistry(): CommandRegistry | null { return this.commandRegistry; }
  public getWebViewManager(): WebViewManager | null { return this.webViewManager; }
  public getOrchestratorService(): OrchestratorService | undefined { return this.orchestratorService; }

  /**
   * Libera todos los recursos
   */
  public dispose(): void {
    logger.info('Liberando recursos de la extensión...');
    
    // Disponer servicios en orden inverso de dependencia
    if (this.webViewManager) {
      this.webViewManager.dispose();
      this.webViewManager = null;
    }
    
    if (this.orchestratorService) {
      this.orchestratorService.dispose?.();
      this.orchestratorService = undefined;
    }
    
    if (this.chatService) {
      this.chatService.dispose();
      this.chatService = null;
    }
    
    if (this.baseAPI) {
      this.baseAPI.dispose();
      this.baseAPI = null;
    }
    
    if (this.storage) {
      this.storage.close();
      this.storage = null;
    }
    
    // Limpiar instancia singleton
    ExtensionHandler.instance = null;
    
    logger.info('Extensión liberada');
  }
}