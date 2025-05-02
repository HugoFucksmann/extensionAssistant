import * as vscode from 'vscode';
import { ExtensionHandler } from './extensionHandler';
import { CommandRegistry } from '../commands/commandRegistry';
import { BaseAPI } from '../../models/baseAPI';
import { ChatService } from '../../services/chatService';
import { SQLiteStorage } from '../storage/db/SQLiteStorage';
import { WebViewManager } from '../../ui/webviewManager';

// Importaciones para orquestación (ahora siempre necesarias)
import { OrchestrationContext } from '../context/orchestrationContext';
import { EventBus } from '../event/eventBus';
import { ToolRegistry } from '../../tools/core/toolRegistry';
import { OrchestratorService } from '../../orchestrator/orchestratorService';
import { ErrorHandler } from '../../utils/errorHandler';
import { executeModelInteraction } from '../promptSystem/promptSystem';

// Importar tipos que se necesitan pero no se usan directamente
import { UIStateContext } from '../context/uiStateContext';
import { ConfigManager } from './configManager';
import { logger } from '../../utils/logger';

import { InputAnalyzer } from '../../orchestrator/inputAnalyzer';
import { DirectActionRouter } from '../../orchestrator/directActionRouter';
import { PlanningEngine } from '../../orchestrator/planningEngine';
import { ToolSelector } from '../../orchestrator/toolSelector';
import { WorkflowManager } from '../../orchestrator/workflowManager';
import { FeedbackManager } from '../../orchestrator/feedbackManager';

/**
 * Inicializa todos los componentes de la extensión en el orden correcto para evitar dependencias circulares.
 * Esta función es llamada desde extension.ts durante la activación.
 * 
 * @param context El contexto de VS Code
 * @param extensionContext El contexto de la extensión ya inicializado
 */
export async function initializeExtensionComponents(
  context: vscode.ExtensionContext,
  extensionContext: ExtensionHandler
): Promise<void> {
  console.log('Iniciando inicialización de componentes...');
  
  try {
    // 1. Obtener componentes básicos ya inicializados en el constructor de ExtensionContext
    const uiStateContext = extensionContext.getUIStateContext();
    const configManager = extensionContext.getConfigManager();
    
    if (!uiStateContext || !configManager) {
      throw new Error('Componentes básicos no inicializados correctamente');
    }
    
    // 2. Inicializar componentes en orden de dependencia
    // Almacenamiento -> BaseAPI -> ChatService -> Orquestación -> WebViewManager
    
    // Inicializar almacenamiento
    const storage = new SQLiteStorage(context);
    extensionContext.setStorage(storage);
    
    // Inicializar API del modelo
    const baseAPI = new BaseAPI(configManager, uiStateContext);
    await baseAPI.initialize();
    extensionContext.setBaseAPI(baseAPI);
    
    // Inicializar servicio de chat
    const chatService = new ChatService(storage, uiStateContext, baseAPI);
    await chatService.initialize();
    extensionContext.setChatService(chatService);
    
    // Inicializar registro de comandos y registrar comandos básicos
    const commandRegistry = new CommandRegistry();
    extensionContext.setCommandRegistry(commandRegistry);
    registerBasicCommands(commandRegistry, extensionContext);
    
    // Inicializar orquestación (ahora siempre se inicializa)
    console.log('Inicializando componentes de orquestación...');
    await initializeOrchestrationComponents(context, extensionContext);
    extensionContext.setUseOrchestration(true);
    
    // Inicializar WebViewManager
    const webViewManager = new WebViewManager(context.extensionUri, uiStateContext, chatService);
    const webviewDisposable = webViewManager.register(context);
    context.subscriptions.push(webviewDisposable);
    extensionContext.setWebViewManager(webViewManager);
    
    // Configurar estado inicial de la UI
    uiStateContext.setState('modelType', configManager.getModelType());
    uiStateContext.setState('persistChat', configManager.getPersistenceEnabled());
    
    console.log('Todos los componentes inicializados correctamente');
  } catch (error) {
    console.error('Error durante la inicialización de componentes:', error);
    throw error;
  }
}

/**
 * Registra los comandos básicos de la extensión.
 * 
 * @param commandRegistry El registro de comandos
 * @param extensionContext El contexto de la extensión
 */
function registerBasicCommands(
  commandRegistry: CommandRegistry,
  extensionContext: ExtensionHandler
): void {
  // Comando para crear un nuevo chat
  commandRegistry.register('chat:new', async () => {
    const chatService = extensionContext.getChatService();
    if (chatService) {
      await chatService.createNewChat();
    }
  });
  
  // Comando para cambiar el modelo
  commandRegistry.register('model:change', async (args: { modelType: 'ollama' | 'gemini' }) => {
    const configManager = extensionContext.getConfigManager();
    const baseAPI = extensionContext.getBaseAPI();
    
    if (configManager && baseAPI) {
      await configManager.setModelType(args.modelType);
      await baseAPI.setModel(args.modelType);
    }
  });
  
  // Comando para mostrar el panel de chat
  commandRegistry.register('chat:show', async () => {
    vscode.commands.executeCommand('aiChat.chatView.focus');
  });
}

/**
 * Inicializa los componentes relacionados con la orquestación.
 * 
 * @param context El contexto de VS Code
 * @param extensionContext El contexto de la extensión
 */
async function initializeOrchestrationComponents(
  context: vscode.ExtensionContext,
  extensionContext: ExtensionHandler
): Promise<OrchestratorService> {
  // Verificar dependencias
  const baseAPI = extensionContext.getBaseAPI();
  const uiContext = extensionContext.getUIStateContext();
  const configMgr = extensionContext.getConfigManager();
  
  if (!baseAPI || !uiContext || !configMgr) {
    throw new Error('Dependencias necesarias no disponibles para la orquestación');
  }
  
  // Inicializar componentes de orquestación en secuencia
  const eventBus = EventBus.getInstance();
  extensionContext.setEventBus(eventBus);
  
  const orchestrationContext = new OrchestrationContext();
  extensionContext.setOrchestrationContext(orchestrationContext);
  
  const toolRegistry = new ToolRegistry(logger);
  extensionContext.setToolRegistry(toolRegistry);
  
  // Crear instancias de los componentes reales
  const errorHandler = new ErrorHandler();
  const inputAnalyzer = new InputAnalyzer(
    orchestrationContext,
    logger,
    eventBus,
    baseAPI
  );

  const directActionRouter = new DirectActionRouter(
    logger,
    errorHandler,
    eventBus,
    toolRegistry,
    orchestrationContext
  );

  const feedbackManager = new FeedbackManager(
    logger,
    errorHandler,
    eventBus,
    context
  );

  const toolSelector = new ToolSelector(
    orchestrationContext,
    toolRegistry,
    logger,
    baseAPI
  );

  const workflowManager = new WorkflowManager(
    logger,
    errorHandler,
    toolSelector,
    toolRegistry,
    feedbackManager,
    baseAPI
  );

  const planningEngine = new PlanningEngine(
    orchestrationContext,
    logger,
    eventBus,
    baseAPI,
    toolRegistry,
    toolSelector,
    feedbackManager,
    {
      // Aquí irían los modulePlanners si los tienes
    }
  );

  // Crear OrchestratorService con los componentes reales
  try {
    const orchestratorService = new OrchestratorService(
      eventBus,
      orchestrationContext,
      configMgr,
      logger,
      errorHandler,
      inputAnalyzer,
      directActionRouter,
      planningEngine,
      toolSelector,
      workflowManager,
      feedbackManager
    );
    
    extensionContext.setOrchestratorService(orchestratorService);
    console.log('Componentes de orquestación inicializados correctamente');
    return orchestratorService;
  } catch (error) {
    console.error('Error al inicializar OrchestratorService:', error);
    throw error;
  }
}
