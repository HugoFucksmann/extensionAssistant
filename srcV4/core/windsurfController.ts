/**
 * Simplified WindsurfController using unified EventBus
 * Removed legacy event system and duplication
 */

import * as vscode from 'vscode';
import { VSCodeContext, WindsurfState, HistoryEntry, PlanStep } from './types'; // Asegúrate que PlanStep esté exportado
import { WindsurfConfig } from './config'; // ReActNodeType no se usa aquí directamente
import { MemoryManager } from '../memory/memoryManager';
import { PromptManager } from '../prompts/promptManager';
import { ModelManager } from '../models/modelManager';
// ReActState y ReActGraphResult ya no se importan de langgraph/types
import { ToolRegistry } from '../tools/toolRegistry';
import { EventBus, eventBus } from '../events/eventBus';
import { ConversationEndedPayload, EventType } from '../events/eventTypes';
import { WindsurfGraph } from '../agents/windsurfGraph';

/**
 * Main controller for Windsurf architecture
 * Implements singleton pattern and coordinates all system components
 */
export class WindsurfController {
  private static instance: WindsurfController;

  private vscodeContext: VSCodeContext;
  private memoryManager: MemoryManager;
  private promptManager: PromptManager;
  private modelManager: ModelManager;
  private windsurfGraph: WindsurfGraph; // Cambiado de reactGraph a windsurfGraph
  private toolRegistry: ToolRegistry;
  private activeConversations: Map<string, WindsurfState> = new Map(); // Cambiado de ReActState a WindsurfState
  private eventBus: EventBus;

  /**
   * Private constructor for singleton pattern
   */
  private constructor(context: VSCodeContext) {
    this.vscodeContext = context;
    this.eventBus = eventBus;

    // Initialize components
    this.memoryManager = new MemoryManager();
    this.promptManager = new PromptManager();
    this.modelManager = new ModelManager();
    this.toolRegistry = new ToolRegistry(); // ToolRegistry se pasa a WindsurfGraph

    // Initialize Windsurf graph (LangGraph implementation)
    this.windsurfGraph = new WindsurfGraph(
      this.modelManager,
      this.toolRegistry,
      this.promptManager
      // No pasamos eventBus aquí a menos que WindsurfGraph lo maneje internamente
    );

    console.log('[WindsurfController] Initialized with WindsurfGraph (LangGraph based)');
    this.eventBus.info('WindsurfController initialized with WindsurfGraph', {}, 'WindsurfController');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(context?: VSCodeContext): WindsurfController {
    if (!WindsurfController.instance) {
      if (!context) {
        throw new Error('VSCodeContext is required for initialization');
      }
      WindsurfController.instance = new WindsurfController(context);
    }
    return WindsurfController.instance;
  }

  /**
   * Process user message through WindsurfGraph cycle
   */
  public async processUserMessage(
    chatId: string,
    userMessage: string,
    contextData: Record<string, any> = {}
  ): Promise<string> {
    console.log(`[WindsurfController:${chatId}] Processing message: "${userMessage.substring(0, 50)}..."`);

    this.eventBus.emitEvent(EventType.CONVERSATION_STARTED, { chatId, userMessage });

    // Enrich context with project info (si es necesario antes de la inicialización del estado)
    // WindsurfGraph podría manejar esto internamente también si se le pasa el toolRegistry
    try {
        if (!contextData.projectContext && this.toolRegistry) {
          const projectInfoTool = this.toolRegistry.getTool('getProjectInfo');
          if (projectInfoTool) {
            const projectInfo = await projectInfoTool.execute({});
            if (projectInfo.success) {
              contextData.projectContext = projectInfo.data;
            }
          }
        }
      } catch (error) {
        console.warn(`[WindsurfController:${chatId}] Error getting project info:`, error);
      }

    let state = this.activeConversations.get(chatId);
    if (!state) {
      state = this.initializeWindsurfState(chatId, userMessage, contextData);
      this.activeConversations.set(chatId, state);
    } else {
      // Update existing state for a new message in the same conversation
      state.userMessage = userMessage;
      state.objective = `Responder a: ${userMessage.substring(0, 100)}...`; // Reset objective
      state.iterationCount = 0;
      state.completionStatus = 'in_progress';
      state.reasoningResult = undefined;
      state.actionResult = undefined;
      state.reflectionResult = undefined;
      state.correctionResult = undefined;
      // state.history.push({ phase: 'user_message', timestamp: Date.now(), data: { userMessage }, iteration: 0}); // Opcional
      // No limpiar todo el historial si es una continuación. Si es un "nuevo" mensaje, el historial se reinicia en initializeWindsurfState.
      // Si se desea mantener el historial entre mensajes de una misma conversación, no reinicializarlo.
      // Por ahora, `initializeWindsurfState` crea un estado fresco.
    }
    
    // Actualizar el estado con cualquier nuevo contextData
    state.projectContext = contextData.projectContext || state.projectContext;
    state.editorContext = contextData.editorContext || state.editorContext;


    try {
      // Execute Windsurf graph
      const resultState = await this.windsurfGraph.runGraph(state);
      this.activeConversations.set(chatId, resultState);

      let finalResponse = 'No se pudo generar una respuesta.';
      if (resultState.completionStatus === 'completed' && resultState.actionResult?.toolName === 'respond') {
        // Asumimos que la herramienta 'respond' devuelve el mensaje en 'result.message' o similar
        // Esto depende de la implementación de la herramienta 'respond' y su ToolResult.data
        if (resultState.actionResult.result && typeof resultState.actionResult.result.message === 'string') {
            finalResponse = resultState.actionResult.result.message;
        } else if (resultState.actionResult.result && typeof resultState.actionResult.result.delivered === 'boolean') {
            // Si 'respond' no devuelve el mensaje, podríamos necesitar un campo específico en WindsurfState
            // o buscar en el historial la última acción de 'respond'.
            // Por ahora, si 'respond' tuvo éxito, asumimos que el mensaje se envió a la UI
            // y no necesitamos devolverlo aquí explícitamente, a menos que queramos loggearlo.
            // Para este ejemplo, vamos a asumir que el mensaje para el usuario está en el `actionResult.result.message`
            // Si no, necesitamos un mecanismo diferente.
             const respondAction = resultState.history.find(
                h => h.phase === 'action' && h.data.toolName === 'respond' && h.data.success
            );
            if (respondAction && respondAction.data.params && typeof respondAction.data.params.message === 'string') {
                finalResponse = respondAction.data.params.message;
            } else {
                finalResponse = "La acción de respuesta se completó, pero el mensaje no está disponible.";
            }
        }
      } else if (resultState.error) {
        finalResponse = `Error: ${resultState.error}`;
      }


      // Store in memory
      // La estructura de WindsurfState ya es la esperada por MemoryManager
      await this.memoryManager.storeConversation(chatId, resultState);

      this.eventBus.emitEvent(EventType.CONVERSATION_ENDED, {
        chatId,
        success: resultState.completionStatus === 'completed',
        response: finalResponse,
        // duration: (resultState.metadata?.endTime || Date.now()) - (resultState.metadata?.startTime || Date.now()) // WindsurfState no tiene metadata.endTime/startTime
        duration: Date.now() - (state.timestamp || Date.now()) // Usar timestamp del estado si existe
      });

      return finalResponse;
    } catch (error: any) {
      console.error(`[WindsurfController:${chatId}] Error processing message:`, error);
      this.eventBus.emitEvent(EventType.ERROR_OCCURRED, {
        chatId,
        error: error.message || 'Unknown error',
        stack: error.stack,
        source: 'WindsurfController'
      });
      return 'Lo siento, ha ocurrido un error al procesar tu mensaje. Por favor, inténtalo de nuevo.';
    }
  }

  /**
   * Initialize WindsurfState for conversation
   */
  private initializeWindsurfState(
    chatId: string,
    userMessage: string,
    contextData: Record<string, any>
  ): WindsurfState {
    return {
      objective: `Responder a: ${userMessage.substring(0, 100)}...`,
      userMessage: userMessage,
      chatId: chatId,
      iterationCount: 0,
      maxIterations: WindsurfConfig.react.maxIterations,
      completionStatus: 'in_progress',
      history: [],
      projectContext: contextData.projectContext,
      editorContext: contextData.editorContext,
      // Otros campos de WindsurfState con valores iniciales
      reasoningResult: undefined,
      actionResult: undefined,
      reflectionResult: undefined,
      correctionResult: undefined,
      timestamp: Date.now(), // Añadido para calcular duración
      // ... cualquier otro campo necesario de WindsurfState
    };
  }

  public clearConversation(chatId: string): void {
    this.activeConversations.delete(chatId);
    this.memoryManager.clearConversationMemory(chatId);
    this.eventBus.emitEvent(EventType.CONVERSATION_ENDED, {
      chatId,
      cleared: true
    } as ConversationEndedPayload);
    console.log(`[WindsurfController] Cleared conversation: ${chatId}`);
  }

  public getEventBus(): EventBus {
    return this.eventBus;
  }

  public dispose(): void {
    this.activeConversations.clear();
    this.memoryManager.dispose();
    this.eventBus.dispose();
    console.log('[WindsurfController] Disposed');
  }
}