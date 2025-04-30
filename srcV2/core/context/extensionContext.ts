import * as vscode from 'vscode';
import { UIStateContext } from './uiStateContext';
import { ConfigManager } from '../config/configManager';
import { CommandRegistry } from '../commands/commandRegistry';
import { BaseAPI } from '../../models/baseAPI';
import { ChatService } from '../../services/chatService';
import { SQLiteStorage } from '../storage/db/SQLiteStorage';
import { WebViewManager } from '../../ui/webviewManager';

// Importaciones para orquestación
import { OrchestrationContext } from './orchestrationContext';
import { EventBus } from '../event/eventBus';
import { Logger, ConsoleLogger } from '../../utils/logger';
import { ErrorHandler } from '../../utils/errorHandler';
import { ToolRegistry } from '../../tools/core/toolRegistry';

// Componentes de orquestación
import { OrchestratorService } from '../../orchestrator/orchestratorService';
import { InputAnalyzer } from '../../orchestrator/inputAnalyzer';
import { DirectActionRouter } from '../../orchestrator/directActionRouter';
import { PlanningEngine } from '../../orchestrator/planningEngine';
import { ToolSelector } from '../../orchestrator/toolSelector';
import { WorkflowManager } from '../../orchestrator/workflowManager';
import { FeedbackManager } from '../../orchestrator/feedbackManager';

// Módulos especializados
import { EditingModule } from '../../modules/codeEditing/editingModule';
import { ExaminationModule } from '../../modules/codeExamination/examinationModule';

/**
 * Clase central que inicializa y coordina todos los componentes de la extensión
 * para el flujo directo (sin orquestación)
 */
export class ExtensionContext {
  // Singleton
  private static instance: ExtensionContext;

  // Obtener instancia singleton
  public static getInstance(): ExtensionContext {
    if (!ExtensionContext.instance) {
      ExtensionContext.instance = new ExtensionContext();
    }
    return ExtensionContext.instance;
  }

  // Establecer la instancia singleton (para uso desde activate)
  public static setInstance(instance: ExtensionContext): void {
    ExtensionContext.instance = instance;
  }

  // Componentes básicos
  private uiStateContext: UIStateContext;
  private configManager: ConfigManager;
  private commandRegistry: CommandRegistry | null = null;
  private baseAPI: BaseAPI | null = null;
  private chatService: ChatService | null = null;
  private storage: SQLiteStorage | null = null;
  private webViewManager: WebViewManager | null = null;
  
  // Componentes de orquestación
  private orchestrationContext: OrchestrationContext | null = null;
  private logger: Logger | null = null;
  private eventBus: EventBus | null = null;
  private errorHandler: ErrorHandler | null = null;
  private toolRegistry: ToolRegistry | null = null;
  private orchestratorService: OrchestratorService | null = null;
  
  // Módulos especializados
  private editingModule: EditingModule | null = null;
  private examinationModule: ExaminationModule | null = null;
  
  // Modo de flujo (directo u orquestación)
  private useOrchestration: boolean = true; // Activado ahora que hemos corregido los errores
  
  // Contexto de VS Code para la inicialización
  private vsCodeContext: vscode.ExtensionContext | null = null;

  private initialized: boolean = false;

  constructor() {
    this.uiStateContext = new UIStateContext();
    this.configManager = new ConfigManager(this.uiStateContext);
    
    // Leer configuración para determinar el modo de flujo
    // Activar el flujo de orquestación por defecto
    this.useOrchestration = true; // Flujo de orquestación activado
  }

  /**
   * Inicializa todos los componentes de la extensión para el flujo directo
   */
  public async initializeComponents(context: vscode.ExtensionContext): Promise<void> {
    try {
      // Guardar el contexto de VS Code para uso posterior
      this.vsCodeContext = context;
      
      // Inicializar componentes comunes
      this.storage = new SQLiteStorage(context);
      
      // Inicializar API de modelo
      const initialModelType = this.configManager.getModelType();
      this.baseAPI = new BaseAPI(this.configManager, this.uiStateContext, initialModelType); 
      await this.baseAPI.initialize();
      
      // Inicializar servicio de chat (siempre necesario para la UI)
      this.chatService = new ChatService(this.storage, this.uiStateContext, this.baseAPI);
      await this.chatService.initialize();
      
      // Si está habilitada la orquestación, inicializar sus componentes
      if (this.useOrchestration) {
        await this.initializeOrchestrationComponents();
      }
      
      // Inicializar el WebViewManager con el servicio de chat
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
      
      // Registrar comandos según el modo de flujo
      if (this.useOrchestration) {
        this.registerOrchestrationCommands();
      } else {
        this.registerDirectFlowCommands();
      }
      
      // Registrar comandos en VS Code
      const commandDisposables = this.commandRegistry.registerWithVSCode(context);
      commandDisposables.forEach(disposable => context.subscriptions.push(disposable));
      
      // Registrar limpieza de recursos
      context.subscriptions.push({
        dispose: () => this.dispose()
      });
      
      console.log(`Componentes del flujo ${this.useOrchestration ? 'de orquestación' : 'directo'} inicializados correctamente`);
      this.initialized = true;
    } catch (error) {
      console.error(`Error al inicializar componentes del flujo ${this.useOrchestration ? 'de orquestación' : 'directo'}:`, error);
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
    this.commandRegistry.register('chat:new', () => this.chatService!.createNewChat());
    this.commandRegistry.register('chat:load', (args: any) => {
      if (args?.chatId) {
        return this.chatService!.loadChat(args.chatId, args.loadMessages !== false);
      }
    });
    this.commandRegistry.register('chat:list:load', () => this.chatService!.getChatList());
    
    // Registrar comandos de modelo
    this.commandRegistry.register('model:change', (args: any) => {
      if (!args?.modelType) return;
      return this.baseAPI!.setModel(args.modelType);
    });
    
    // Registrar comandos de mensaje (usando el flujo de orquestación si está disponible)
    this.commandRegistry.register('message:send', (args: any) => {
      if (args?.message) {
        if (this.useOrchestration && this.orchestratorService) {
          return this.processMessageWithOrchestration(args.message);
        } else {
          return this.chatService!.processUserMessage(args.message);
        }
      }
    });
  }
  
  /**
   * Inicializa los componentes necesarios para el flujo de orquestación
   */
  private async initializeOrchestrationComponents(): Promise<void> {
    console.log('========== INICIO INICIALIZACIÓN DE COMPONENTES DE ORQUESTACIÓN ==========');
    try {
      // Inicializar componentes base de orquestación
      console.log('[DEBUG] Inicializando componentes base...');
      this.logger = new ConsoleLogger();
      console.log('[DEBUG] ConsoleLogger inicializado');
      
      this.eventBus = new EventBus();
      console.log('[DEBUG] EventBus inicializado');
      
      this.errorHandler = new ErrorHandler(); // No requiere parámetros
      console.log('[DEBUG] ErrorHandler inicializado');
      
      this.orchestrationContext = new OrchestrationContext(); // No acepta parámetros
      console.log('[DEBUG] OrchestrationContext inicializado');
      
      this.toolRegistry = new ToolRegistry(this.logger);
      console.log('[DEBUG] ToolRegistry inicializado');
      
      // Inicializar módulos especializados
      console.log('[DEBUG] Inicializando módulos especializados...');
      
      this.editingModule = new EditingModule(
        this.toolRegistry,
        this.logger,
        this.baseAPI!
      );
      console.log('[DEBUG] EditingModule inicializado');
      
      this.examinationModule = new ExaminationModule(
        this.toolRegistry,
        this.logger,
        this.baseAPI!
      );
      console.log('[DEBUG] ExaminationModule inicializado');
      
      // Inicializar componentes de orquestación
      console.log('[DEBUG] Inicializando componentes de orquestación...');
      
      console.log('[DEBUG] Creando InputAnalyzer...');
      const inputAnalyzer = new InputAnalyzer(
        this.configManager,
        this.orchestrationContext,
        this.logger,
        this.eventBus,
        this.baseAPI!
      );
      console.log('[DEBUG] InputAnalyzer inicializado');
      
      console.log('[DEBUG] Creando DirectActionRouter...');
      const directActionRouter = new DirectActionRouter(
        this.logger,
        this.errorHandler,
        this.eventBus,
        this.toolRegistry,
        this.orchestrationContext
      );
      console.log('[DEBUG] DirectActionRouter inicializado');
      
      console.log('[DEBUG] Creando FeedbackManager...');
      const feedbackManager = new FeedbackManager(
        this.logger,
        this.errorHandler,
        this.eventBus,
        this.vsCodeContext! // Usar el contexto de VS Code guardado
      );
      console.log('[DEBUG] FeedbackManager inicializado');
      
      console.log('[DEBUG] Creando ToolSelector...');
      const toolSelector = new ToolSelector(
        this.orchestrationContext,
        this.toolRegistry,
        this.logger,
        this.errorHandler,
        this.baseAPI! // Aseguramos que baseAPI está inicializado
      );
      console.log('[DEBUG] ToolSelector inicializado');
      
      // Inicializar planificador y gestor de flujo de trabajo
      console.log('[DEBUG] Creando PlanningEngine...');
      const planningEngine = new PlanningEngine(
        this.orchestrationContext,
        this.configManager,
        this.logger,
        this.eventBus,
        this.baseAPI!,
        this.toolRegistry,
        toolSelector,
        feedbackManager
      );
      console.log('[DEBUG] PlanningEngine inicializado');
      
      console.log('[DEBUG] Creando WorkflowManager...');
      const workflowManager = new WorkflowManager(
        this.logger,
        this.errorHandler,
        toolSelector,
        this.toolRegistry,
        feedbackManager,
        this.baseAPI!
      );
      console.log('[DEBUG] WorkflowManager inicializado');
      
      // Inicializar el servicio de orquestación
      console.log('[DEBUG] Creando OrchestratorService...');
      this.orchestratorService = new OrchestratorService(
        this.eventBus,
        this.orchestrationContext,
        this.configManager,
        this.logger,
        this.errorHandler,
        inputAnalyzer,
        directActionRouter,
        planningEngine,
        toolSelector,
        workflowManager,
        feedbackManager
      );
      console.log('[DEBUG] OrchestratorService inicializado');
      
      console.log('[INFO] Flujo de orquestación inicializado correctamente');
      console.log('========== FIN INICIALIZACIÓN DE COMPONENTES DE ORQUESTACIÓN (EXITOSO) ==========');
    } catch (error: any) {
      console.error('[ERROR] Error al inicializar flujo de orquestación:', error);
      console.error('[DEBUG] Stack trace:', error.stack);
      console.log('========== FIN INICIALIZACIÓN DE COMPONENTES DE ORQUESTACIÓN (CON ERROR) ==========');
      throw error;
    }
  }
  
  /**
   * Registra los comandos para el flujo de orquestación
   */
  private registerOrchestrationCommands(): void {
    if (!this.commandRegistry || !this.orchestratorService || !this.baseAPI || !this.chatService) return;
    
    // Registrar comandos de chat (necesarios para la UI)
    this.commandRegistry.register('chat:new', () => this.chatService!.createNewChat());
    this.commandRegistry.register('chat:load', (args: any) => {
      if (args?.chatId) {
        return this.chatService!.loadChat(args.chatId, args.loadMessages !== false);
      }
    });
    this.commandRegistry.register('chat:list:load', () => this.chatService!.getChatList());
    
    // Registrar comandos de modelo (compatibles con ambos flujos)
    this.commandRegistry.register('model:change', (args: any) => {
      if (!args?.modelType) return;
      return this.baseAPI!.setModel(args.modelType);
    });
    
    // Redirigir comandos de mensaje al orquestador
    this.commandRegistry.register('message:send', async (args: any) => {
      if (args?.message) {
        return this.processMessageWithOrchestration(args.message);
      }
    });
    
    // Comando específico para orquestación directa (para pruebas)
    this.commandRegistry.register('assistant:process', (args: any) => {
      if (args?.message) {
        return this.orchestratorService!.orchestrateRequest(args.message);
      }
    });
  }
  
  /**
   * Libera todos los recursos utilizados por la extensión
   */
  public dispose(): void {
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
    
    // Liberar módulos especializados
    this.editingModule = null;
    this.examinationModule = null;
    
    // Liberar componentes de orquestación
    this.orchestratorService = null;
    this.orchestrationContext = null;
    this.toolRegistry = null;
    this.errorHandler = null;
    this.logger = null;
    this.eventBus = null;
    
    this.commandRegistry = null;
    
    console.log(`Recursos del flujo ${this.useOrchestration ? 'de orquestación' : 'directo'} liberados correctamente`);
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
  
  public getOrchestratorService(): OrchestratorService | null {
    return this.orchestratorService;
  }
  
  public getWebViewManager(): WebViewManager | null {
    return this.webViewManager;
  }
  
  /**
   * Procesa un mensaje del usuario a través del flujo de orquestación
   * @param message Mensaje del usuario
   * @returns Respuesta procesada
   */
  private async processMessageWithOrchestration(message: string): Promise<string> {
    console.log('========== INICIO PROCESAMIENTO DE MENSAJE ==========');
    console.log(`[DEBUG] useOrchestration: ${this.useOrchestration}`);
    console.log(`[DEBUG] orchestratorService: ${this.orchestratorService ? 'Inicializado' : 'No inicializado'}`);
    console.log(`[DEBUG] chatService: ${this.chatService ? 'Inicializado' : 'No inicializado'}`);
    console.log(`[DEBUG] baseAPI: ${this.baseAPI ? 'Inicializado' : 'No inicializado'}`);
    
    if (!this.chatService) {
      console.error('[ERROR] El servicio de chat no está inicializado');
      throw new Error('El servicio de chat no está inicializado');
    }
    
    try {
      console.log(`[INFO] Procesando mensaje: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);
      
      // 1. Añadir el mensaje del usuario al chat
      console.log('[DEBUG] Agregando mensaje del usuario al chat...');
      await this.chatService.addUserMessage(message);
      console.log('[DEBUG] Mensaje del usuario agregado exitosamente');
      
      // 2. Indicar que estamos procesando
      console.log('[DEBUG] Actualizando estado de procesamiento...');
      this.uiStateContext.setState('isProcessing', true);
      console.log('[DEBUG] Estado de procesamiento actualizado');
      
      try {
        let response = '';
        
        // 3. Procesar el mensaje según el flujo activo
        if (this.useOrchestration && this.orchestratorService) {
          // Flujo de orquestación
          console.log('[INFO] Usando flujo de orquestación');
          console.log('[DEBUG] Valor de useOrchestration:', this.useOrchestration);
          console.log('[DEBUG] Estado de orchestratorService:', this.orchestratorService ? 'Inicializado' : 'No inicializado');
          
          try {
            console.log('[DEBUG] Llamando a orchestratorService.orchestrateRequest()...');
            console.log('[DEBUG] Tipo de orchestratorService:', typeof this.orchestratorService);
            console.log('[DEBUG] Métodos disponibles:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.orchestratorService)));
            
            const result = await this.orchestratorService.orchestrateRequest(message);
            console.log('[DEBUG] Resultado de orquestación:', JSON.stringify(result, null, 2));
            
            if (result && result.success) {
              console.log('[INFO] Orquestación completada exitosamente');
              console.log('[DEBUG] Resultado final completo:', JSON.stringify(result.finalResult, null, 2));
              
              // Procesar el resultado final para asegurar que sea una cadena de texto
              if (typeof result.finalResult === 'string') {
                response = result.finalResult;
              } else if (result.finalResult?.moduleResult?.message) {
                // Caso específico para el resultado del módulo de comunicación
                let message = result.finalResult.moduleResult.message;
                
                // Si el mensaje contiene JSON en formato string, extraerlo
                if (message.includes('```json')) {
                  try {
                    const jsonMatch = message.match(/```json\n([\s\S]*?)\n```/);
                    if (jsonMatch && jsonMatch[1]) {
                      const jsonObj = JSON.parse(jsonMatch[1]);
                      if (jsonObj.message) {
                        response = jsonObj.message;
                      } else {
                        response = message;
                      }
                    } else {
                      response = message;
                    }
                  } catch (e: unknown) {
                    console.error('[ERROR] Error al parsear JSON en la respuesta:', e);
                    response = message;
                  }
                } else {
                  response = message;
                }
              } else if (result.finalResult?.response) {
                response = result.finalResult.response;
              } else if (result.finalResult?.text) {
                response = result.finalResult.text;
              } else if (result.finalResult) {
                // Si el resultado final es un objeto, intentar extraer información útil
                if (typeof result.finalResult === 'object') {
                  // Caso específico cuando el objeto tiene moduleResult directamente en la raíz
                  if (result.finalResult.moduleResult && result.finalResult.moduleResult.message) {
                    let message = result.finalResult.moduleResult.message;
                    
                    // Si el mensaje contiene JSON en formato string, extraerlo
                    if (message.includes('```json')) {
                      try {
                        const jsonMatch = message.match(/```json\n([\s\S]*?)\n```/);
                        if (jsonMatch && jsonMatch[1]) {
                          const jsonObj = JSON.parse(jsonMatch[1]);
                          if (jsonObj.message) {
                            response = jsonObj.message;
                          } else {
                            response = message;
                          }
                        } else {
                          response = message;
                        }
                      } catch (e: unknown) {
                        console.error('[ERROR] Error al parsear JSON en la respuesta:', e);
                        response = message;
                      }
                    } else {
                      response = message;
                    }
                  } else {
                    // Intentar convertir el objeto a JSON
                    try {
                      response = JSON.stringify(result.finalResult, null, 2);
                    } catch (e: unknown) {
                      response = `Error al procesar la respuesta: ${e instanceof Error ? e.message : String(e)}`;
                    }
                  }
                } else {
                  response = `${result.finalResult}`;
                }
              } else {
                response = 'Operación completada exitosamente';
              }
              
              // Logs para ver el prompt y la respuesta
              console.log('=== PROMPT ENVIADO AL MODELO ===');
              console.log(message);
              console.log('=== RESPUESTA CRUDA DEL MODELO ===');
              console.log(response);
              console.log('================================');
              
              console.log('[DEBUG] Respuesta procesada:', response.substring(0, 100) + (response.length > 100 ? '...' : ''));
            } else {
              console.error('[ERROR] La orquestación falló');
              console.error('[DEBUG] Detalles del error:', result?.error);
              throw new Error(result?.error?.message || 'Error en la orquestación');
            }
          } catch (orchError: any) {
            console.error('[ERROR] Excepción en orquestación:', orchError);
            console.error('[DEBUG] Stack trace:', orchError.stack);
            // Fallback al flujo directo
            console.log('[INFO] Fallback al flujo directo');
            console.log('[DEBUG] Llamando a baseAPI.generateResponse()...');
            response = await this.baseAPI!.generateResponse(message);
            console.log('[DEBUG] Respuesta generada con flujo directo:', response.substring(0, 100) + '...');
          }
        } else {
          // Flujo directo
          console.log('[INFO] Usando flujo directo (orquestación desactivada o no inicializada)');
          console.log('[DEBUG] Llamando a baseAPI.generateResponse()...');
          response = await this.baseAPI!.generateResponse(message);
          console.log('[DEBUG] Respuesta generada con flujo directo:', response.substring(0, 100) + '...');
        }
        
        // 4. Añadir la respuesta al chat
        console.log('[DEBUG] Agregando respuesta del asistente al chat...');
        await this.chatService.addAssistantResponse(response);
        console.log('[DEBUG] Respuesta del asistente agregada exitosamente');
        
        console.log('========== FIN PROCESAMIENTO DE MENSAJE (EXITOSO) ==========');
        return response;
      } finally {
        // Asegurar que siempre se actualice el estado de procesamiento
        console.log('[DEBUG] Actualizando estado final de procesamiento...');
        this.uiStateContext.setState('isProcessing', false);
        console.log('[DEBUG] Estado de procesamiento actualizado a false');
      }
    } catch (error: any) {
      console.error('[ERROR] Error general al procesar mensaje:', error);
      console.error('[DEBUG] Stack trace:', error.stack);
      
      // Añadir mensaje de error como respuesta del asistente
      const errorResponse = `Lo siento, ocurrió un error: ${error.message || 'Error desconocido'}`;
      console.log('[DEBUG] Agregando mensaje de error como respuesta...');
      await this.chatService.addAssistantResponse(errorResponse);
      console.log('[DEBUG] Mensaje de error agregado exitosamente');
      
      this.uiStateContext.setState('isProcessing', false);
      this.uiStateContext.setState('error', error.message || 'Error al procesar mensaje');
      
      console.log('========== FIN PROCESAMIENTO DE MENSAJE (CON ERROR) ==========');
      return errorResponse;
    }
  }

  /**
   * Método público para procesar mensajes del usuario
   * Actúa como punto de entrada para el flujo de orquestación
   * @param message Mensaje del usuario
   * @returns Respuesta procesada
   */
  public async processMessage(message: string): Promise<string> {
    console.log('[ExtensionContext] Recibida solicitud para procesar mensaje');
    
    if (!this.initialized) {
      console.error('[ExtensionContext] Error: ExtensionContext no inicializado');
      throw new Error('ExtensionContext no inicializado. Llame a initializeComponents primero.');
    }
    
    return this.processMessageWithOrchestration(message);
  }
}