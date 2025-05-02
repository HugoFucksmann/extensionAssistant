import * as vscode from 'vscode';
import { ConfigManager } from './configManager';
import { CommandRegistry } from '../commands/commandRegistry';
import { BaseAPI } from '../../models/baseAPI';
import { ChatService } from '../../services/chatService';
import { SQLiteStorage } from '../storage/db/SQLiteStorage';
import { WebViewManager } from '../../ui/webviewManager';
import { EventBus } from '../event/eventBus';
import { logger } from '../../utils/logger';
import { ErrorHandler } from '../../utils/errorHandler';
import { OrchestratorService } from '../../orchestrator/orchestratorService';
import { UIStateContext } from '../context/uiStateContext';

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

  public static initialize(context: vscode.ExtensionContext): ExtensionHandler {
    if (ExtensionHandler.instance) {
      console.warn("ExtensionHandler.initialize called multiple times.");
    }
    ExtensionHandler.instance = new ExtensionHandler(context);
    return ExtensionHandler.instance;
  }

  // Core components
  private readonly vsCodeContext: vscode.ExtensionContext;
  private readonly uiStateContext: UIStateContext;
  private readonly configManager: ConfigManager;
  private readonly errorHandler: ErrorHandler;
  private readonly logger: typeof logger;
  private readonly eventBus: EventBus;

  // Service components
  private storage: SQLiteStorage | null = null;
  private baseAPI: BaseAPI | null = null;
  private chatService: ChatService | null = null;
  private commandRegistry: CommandRegistry | null = null;
  private webViewManager: WebViewManager | null = null;
  private orchestratorService: OrchestratorService | null = null;

  private constructor(context: vscode.ExtensionContext) {
    this.vsCodeContext = context;
    this.uiStateContext = new UIStateContext();
    this.configManager = ConfigManager.getInstance(this.uiStateContext, context);
    this.errorHandler = new ErrorHandler();
    this.logger = logger;
    this.eventBus = EventBus.getInstance();
  }

  /**
   * Initializes all extension components in the correct order
   */
  public async initialize(): Promise<void> {
    try {
      // Initialize storage
      this.storage = new SQLiteStorage(this.vsCodeContext);
      
      // Initialize API
      this.baseAPI = new BaseAPI(this.configManager, this.uiStateContext);
      await this.baseAPI.initialize();
      
      // Initialize chat service
      this.chatService = new ChatService(this.storage, this.uiStateContext, this.baseAPI);
      await this.chatService.initialize();
      
      // Initialize command registry
      this.commandRegistry = new CommandRegistry();
      this.registerCommands();
      
      // Initialize orchestrator
      this.orchestratorService = await this.initializeOrchestrator();
      
      // Initialize WebView
      this.webViewManager = new WebViewManager(
        this.vsCodeContext.extensionUri, 
        this.uiStateContext, 
        this.chatService
      );
      const webviewDisposable = this.webViewManager.register(this.vsCodeContext);
      this.vsCodeContext.subscriptions.push(webviewDisposable);
      
      // Set initial UI state
      this.uiStateContext.setState('modelType', this.configManager.getModelType());
      this.uiStateContext.setState('persistChat', this.configManager.getPersistenceEnabled());
      
      this.logger.info('Extension initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize extension:', {error});
      throw error;
    }
  }

  /**
   * Initialize the orchestrator and its components
   */
  private async initializeOrchestrator(): Promise<OrchestratorService> {
    try {
      return await OrchestratorService.create({
        eventBus: this.eventBus,
        logger: this.logger,
        errorHandler: this.errorHandler,
        baseAPI: this.baseAPI!,
        configManager: this.configManager,
        context: this.vsCodeContext
      });
    } catch (error) {
      this.logger.error('Failed to initialize orchestrator:', {error});
      throw error;
    }
  }

  /**
   * Register command handlers
   */
  private registerCommands(): void {
    if (!this.commandRegistry) return;
    
    // Register chat commands
    this.commandRegistry.register('chat:new', async () => {
      if (this.chatService) {
        await this.chatService.createNewChat();
      }
    });
    
    this.commandRegistry.register('model:change', async (args: { modelType: 'ollama' | 'gemini' }) => {
      if (this.configManager && this.baseAPI) {
        await this.configManager.setModelType(args.modelType);
        await this.baseAPI.setModel(args.modelType);
      }
    });
    
    this.commandRegistry.register('chat:show', async () => {
      vscode.commands.executeCommand('aiChat.chatView.focus');
    });
    
    // Register commands with VS Code
    const commandDisposables = this.commandRegistry.registerWithVSCode(this.vsCodeContext);
    commandDisposables.forEach(disposable => 
      this.vsCodeContext.subscriptions.push(disposable)
    );
  }

  /**
   * Process a user message through the orchestrator
   */
  public async processMessage(message: string): Promise<string> {
    if (!this.orchestratorService || !this.chatService) {
      throw new Error('Services not initialized. Extension not ready to process messages.');
    }
    
    this.uiStateContext.setState('isProcessing', true);
    
    try {
      // Add user message to chat
      await this.chatService.addUserMessage(message);
      
      // Process with orchestration
      const result = await this.orchestratorService.orchestrateRequest(message);
      
      if (!result.success) {
        throw new Error(result?.error?.message || 'Orchestration error');
      }
      
      // Extract response
      let response: string;
      if (typeof result.finalResult === 'string') {
        response = result.finalResult;
      } else if (result.finalResult && typeof result.finalResult.response === 'string') {
        response = result.finalResult.response;
      } else {
        response = 'Operation completed successfully';
      }
      
      // Add response to chat
      await this.chatService.addAssistantResponse(response);
      return response;
    } catch (error: any) {
      this.logger.error('Error processing message:', error);
      
      // Add error response
      const errorResponse = `Sorry, an error occurred: ${error.message || 'Unknown error'}`;
      await this.chatService.addAssistantResponse(errorResponse);
      
      this.uiStateContext.setState('error', error.message || 'Error processing message');
      throw error;
    } finally {
      this.uiStateContext.setState('isProcessing', false);
    }
  }

  // Getters for core components and services
  public getVSCodeContext(): vscode.ExtensionContext { return this.vsCodeContext; }
  public getUIStateContext(): UIStateContext { return this.uiStateContext; }
  public getConfigManager(): ConfigManager { return this.configManager; }
  public getErrorHandler(): ErrorHandler { return this.errorHandler; }
  public getLogger(): typeof logger { return this.logger; }
  public getEventBus(): EventBus { return this.eventBus; }
  
  // Getters for service components (may be null if not initialized)
  public getStorage(): SQLiteStorage | null { return this.storage; }
  public getBaseAPI(): BaseAPI | null { return this.baseAPI; }
  public getChatService(): ChatService | null { return this.chatService; }
  public getCommandRegistry(): CommandRegistry | null { return this.commandRegistry; }
  public getWebViewManager(): WebViewManager | null { return this.webViewManager; }
  public getOrchestratorService(): OrchestratorService | null { return this.orchestratorService; }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    this.logger.info('Disposing extension resources...');
    
    // Dispose services in reverse dependency order
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
    
    // Clear singleton instance
    ExtensionHandler.instance = null;
    
    this.logger.info('Extension disposed');
  }
}