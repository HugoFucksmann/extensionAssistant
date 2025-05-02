// extensionHandler.ts
import * as vscode from 'vscode';
import { ConfigSystem } from './configSystem';
import { CommandRegistry } from '../commands/commandRegistry';
import { BaseAPI } from '../../models/baseAPI';
import { ChatService } from '../../services/chatService';
import { SQLiteStorage } from '../storage/db/SQLiteStorage';
import { WebViewManager } from '../../ui/webviewManager';
import { logger } from '../../utils/logger';
import { ErrorHandler } from '../../utils/errorHandler';
import { OrchestratorService } from '../../orchestrator/orchestratorService';
import { UIStateContext } from '../context/uiStateContext';
import { EventBus } from '../event/eventBus';

/**
 * Central class that manages the extension components and their lifecycle
 */
export class ExtensionHandler {
  // Singleton implementation
  private static instance: ExtensionHandler | null = null;

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
  private readonly configSystem: ConfigSystem;
  private readonly errorHandler: ErrorHandler;
  private readonly uiStateContext: UIStateContext;
  private readonly eventBus: EventBus;

  // Service components
  private storage: SQLiteStorage | null = null;
  private baseAPI: BaseAPI | null = null;
  private chatService: ChatService | null = null;
  private commandRegistry: CommandRegistry | null = null;
  private webViewManager: WebViewManager | null = null;
  private orchestratorService: OrchestratorService | null = null;

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.configSystem = ConfigSystem.getInstance();
    this.errorHandler = new ErrorHandler();
    this.uiStateContext = new UIStateContext();
    this.eventBus = EventBus.getInstance();
    
    // Sincronizar UIStateContext con ConfigSystem para permitir compatibilidad inversa
    this.setupConfigurationSync();
  }

  /**
   * Enlaza UIStateContext para recibir actualizaciones de configuración
   * Esta función permite la compatibilidad inversa con código existente que depende de UIStateContext
   */
  private setupConfigurationSync(): void {
    // Sincronizar valores iniciales
    this.uiStateContext.setState('modelType', this.configSystem.getModelType());
    this.uiStateContext.setState('persistChat', this.configSystem.getPersistenceEnabled());
    this.uiStateContext.setState('useOrchestration', this.configSystem.getUseOrchestration());
    
    // Escuchar cambios futuros
    this.configSystem.onAnyChange((key, value) => {
      // Solo sincronizar valores conocidos
      if (['modelType', 'persistChat', 'useOrchestration'].includes(key)) {
        this.uiStateContext.setState(key, value);
      }
    });
  }

  /**
   * Inicializa todos los componentes de la extensión en un orden correcto
   */
  private async initializeComponents(): Promise<void> {
    try {
      logger.info('Inicializando componentes de la extensión...');
      
      // 1. Inicializar almacenamiento
      this.storage = new SQLiteStorage(this.context);
      
      // 2. Inicializar API
      this.baseAPI = new BaseAPI(this.configSystem, this.uiStateContext);
      await this.baseAPI.initialize();
      
      // 3. Inicializar servicio de chat
      this.chatService = new ChatService(this.storage, this.uiStateContext, this.baseAPI);
      await this.chatService.initialize();
      
      // 4. Inicializar y registrar comandos
      this.commandRegistry = new CommandRegistry();
      this.registerCommands();
      
      // 5. Inicializar orquestador si está habilitado
      if (this.configSystem.getUseOrchestration()) {
        this.orchestratorService = await this.initializeOrchestrator();
      }
      
      // 6. Inicializar WebView
      this.webViewManager = new WebViewManager(
        this.context.extensionUri, 
        this.uiStateContext, 
        this.chatService
      );
      const webviewDisposable = this.webViewManager.register(this.context);
      this.context.subscriptions.push(webviewDisposable);
      
      logger.info('Extensión inicializada correctamente');
    } catch (error) {
      logger.error('Error al inicializar la extensión:', error);
      throw error;
    }
  }

  /**
   * Inicializa el orquestador y sus componentes
   */
  private async initializeOrchestrator(): Promise<OrchestratorService> {
    try {
      return await OrchestratorService.create({
        eventBus: this.eventBus,
        logger: logger,
        errorHandler: this.errorHandler,
        baseAPI: this.baseAPI!,
        configManager: this.configSystem,
        context: this.context
      });
    } catch (error) {
      logger.error('Error al inicializar el orquestador:', error);
      throw error;
    }
  }

  /**
   * Registra los manejadores de comandos
   */
  private registerCommands(): void {
    if (!this.commandRegistry) return;
    
    // Registrar comandos de chat
    this.commandRegistry.register('chat:new', async () => {
      if (this.chatService) {
        await this.chatService.createNewChat();
      }
    });
    
    this.commandRegistry.register('model:change', async (args: { modelType: 'ollama' | 'gemini' }) => {
      if (this.configSystem && this.baseAPI) {
        await this.configSystem.setModelType(args.modelType);
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
    if (!this.chatService) {
      throw new Error('Servicio de chat no inicializado');
    }
    
    this.uiStateContext.setState('isProcessing', true);
    
    try {
      // Añadir mensaje del usuario al chat
      await this.chatService.addUserMessage(message);
      
      let response: string;
      
      // Procesar con orquestador si está disponible
      if (this.orchestratorService && this.configSystem.getUseOrchestration()) {
        const result = await this.orchestratorService.orchestrateRequest(message);
        
        if (!result.success) {
          throw new Error(result?.error?.message || 'Error de orquestación');
        }
        
        // Extraer respuesta
        if (typeof result.finalResult === 'string') {
          response = result.finalResult;
        } else if (result.finalResult && typeof result.finalResult.response === 'string') {
          response = result.finalResult.response;
        } else {
          response = 'Operación completada con éxito';
        }
      } else {
        // Procesamiento directo con la API si no hay orquestador
        if (!this.baseAPI) {
          throw new Error('API no inicializada');
        }
        response = await this.baseAPI.sendMessage(message);
      }
      
      // Añadir respuesta al chat
      await this.chatService.addAssistantResponse(response);
      return response;
    } catch (error: any) {
      logger.error('Error al procesar el mensaje:', error);
      
      // Añadir respuesta de error
      const errorResponse = `Lo siento, ocurrió un error: ${error.message || 'Error desconocido'}`;
      await this.chatService.addAssistantResponse(errorResponse);
      
      this.uiStateContext.setState('error', error.message || 'Error al procesar el mensaje');
      throw error;
    } finally {
      this.uiStateContext.setState('isProcessing', false);
    }
  }

  // Getters para componentes y servicios principales
  public getContext(): vscode.ExtensionContext { return this.context; }
  public getConfigSystem(): ConfigSystem { return this.configSystem; }
  public getUIStateContext(): UIStateContext { return this.uiStateContext; }
  public getErrorHandler(): ErrorHandler { return this.errorHandler; }
  public getEventBus(): EventBus { return this.eventBus; }
  
  // Getters para componentes de servicio (pueden ser null si no están inicializados)
  public getStorage(): SQLiteStorage | null { return this.storage; }
  public getBaseAPI(): BaseAPI | null { return this.baseAPI; }
  public getChatService(): ChatService | null { return this.chatService; }
  public getCommandRegistry(): CommandRegistry | null { return this.commandRegistry; }
  public getWebViewManager(): WebViewManager | null { return this.webViewManager; }
  public getOrchestratorService(): OrchestratorService | null { return this.orchestratorService; }

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
      this.orchestratorService = null;
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
    
    // Limpiar instancia singleton
    ExtensionHandler.instance = null;
    
    logger.info('Extensión liberada');
  }
}