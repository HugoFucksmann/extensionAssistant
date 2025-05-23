// src/core/ChatService.ts

import { VSCodeContext, WindsurfState, HistoryEntry } from '@shared/types'; // Asegúrate que HistoryEntry esté aquí
import { ChatMemoryManager } from '../features/memory/ChatMemoryManager';
import { WindsurfGraph } from '../features/ai/ReActGraph';
import { ToolRegistry } from '../features/tools/ToolRegistry';
import { EventBus } from '../features/events/EventBus';
import { EventType, ConversationEndedPayload, ResponseEventPayload, ToolExecutionEventPayload } from '../features/events/eventTypes'; // Añadir más tipos si son necesarios
import { ChatStateManager } from './ChatStateManager';

// Interfaz para el HistoryItem si no está ya en types.ts
interface ChatServiceHistoryItem extends HistoryEntry { // Extiende de HistoryEntry
  // phase ya está en HistoryEntry
  // data podría ser parte de metadata en HistoryEntry
  // Si necesitas 'data' como un campo separado, defínelo aquí.
  // Por ahora, asumimos que la estructura de HistoryEntry es suficiente
  // o que 'data' está dentro de 'metadata'.
  // Ejemplo: metadata: { toolName?: string; success?: boolean; params?: { message?: string; [key: string]: any; }; [key: string]: any; }
}


export class ChatService {
  private vscodeContext: VSCodeContext;
  private eventBus: EventBus;
  private chatMemoryManager: ChatMemoryManager;
  private reactGraph: WindsurfGraph;
  private chatStateManager: ChatStateManager;
  private toolRegistry: ToolRegistry;

  constructor(
    context: VSCodeContext,
    eventBusInstance: EventBus,
    chatMemoryManager: ChatMemoryManager,
    reactGraph: WindsurfGraph,
    chatStateManager: ChatStateManager,
    toolRegistry: ToolRegistry
  ) {
    this.vscodeContext = context;
    this.eventBus = eventBusInstance;
    this.chatMemoryManager = chatMemoryManager;
    this.reactGraph = reactGraph;
    this.chatStateManager = chatStateManager;
    this.toolRegistry = toolRegistry;

    console.log('[ChatService] Initialized.');
    this.eventBus.info('ChatService initialized', {}, 'ChatService');
  }

  // *** MÉTODO AÑADIDO ***
  public getChatStateManager(): ChatStateManager {
    return this.chatStateManager;
  }

  public async processUserMessage(
    chatId: string,
    userMessage: string,
    contextData: Record<string, any> = {}
  ): Promise<void> { // Debería devolver void, la respuesta se envía por evento
    console.log(`[ChatService:${chatId}] Processing message: "${userMessage.substring(0, 50)}..."`);
    this.eventBus.emitEvent(EventType.CONVERSATION_STARTED, { chatId, userMessage, source: 'ChatService' });

    const state = this.chatStateManager.getOrCreateConversationState(chatId, userMessage, contextData, this.vscodeContext);

    try {
      if (!state.projectContext && this.toolRegistry) {
        const projectInfoTool = this.toolRegistry.getTool('getProjectInfo');
        if (projectInfoTool) {
          // Asumiendo que execute puede devolver un tipo más específico o ActionResult
          const projectInfoResult = await projectInfoTool.execute({}) as { success: boolean, data: any, error?: string };
          if (projectInfoResult.success) {
            state.projectContext = projectInfoResult.data;
            this.chatStateManager.updateConversationState(chatId, state);
          }
        }
      }
    } catch (error) {
      console.warn(`[ChatService:${chatId}] Error getting project info:`, error);
      this.eventBus.emitEvent(EventType.ERROR_OCCURRED, { chatId, error: (error as Error).message, source: 'ChatService.ProjectInfo' });
    }

    let finalResponseText = 'No se pudo generar una respuesta.'; // Default
    let processingDuration = 0;
    const processingStartTime = Date.now();

    try {
      const resultState = await this.reactGraph.run(state);
      this.chatStateManager.updateConversationState(chatId, resultState);
      processingDuration = Date.now() - processingStartTime;

      if (resultState.completionStatus === 'completed') {
          // Buscar la acción 'respond' en el historial para la respuesta final
          const respondAction = resultState.history.find(
              (h: HistoryEntry) => h.phase === 'action' && h.metadata?.toolName === 'respond' && h.metadata?.success
          );

          if (respondAction && respondAction.metadata?.params?.message && typeof respondAction.metadata.params.message === 'string') {
              finalResponseText = respondAction.metadata.params.message;
          } else if (resultState.actionResult?.result?.message && typeof resultState.actionResult.result.message === 'string') {
              // Fallback al actionResult general si existe
              finalResponseText = resultState.actionResult.result.message;
          } else {
              finalResponseText = "La tarea se completó, pero no se encontró un mensaje de respuesta explícito.";
              this.vscodeContext.outputChannel.appendLine(`[ChatService:${chatId}] Task completed, but no explicit 'respond' message found in history or actionResult.`);
          }
          // Emitir evento de respuesta generada
          this.eventBus.emitEvent(EventType.RESPONSE_GENERATED, {
              chatId,
              response: finalResponseText,
              success: true,
              duration: processingDuration, // Duración del procesamiento del grafo
              metadata: { /* otros metadatos relevantes del resultState */ }
          } as ResponseEventPayload);

      } else if (resultState.error) {
        finalResponseText = `Error procesando tu solicitud: ${resultState.error}`;
        this.vscodeContext.outputChannel.appendLine(`[ChatService:${chatId}] Error from ReActGraph: ${resultState.error}`);
        this.eventBus.emitEvent(EventType.ERROR_OCCURRED, { chatId, error: resultState.error, source: 'ReActGraph', duration: processingDuration });
      } else if (resultState.completionStatus === 'failed') {
         finalResponseText = `La tarea no pudo completarse. Último estado: ${resultState.history.slice(-1)[0]?.phase || 'desconocido'}.`;
         this.vscodeContext.outputChannel.appendLine(`[ChatService:${chatId}] Task failed. Check history.`);
         this.eventBus.emitEvent(EventType.ERROR_OCCURRED, { chatId, error: 'Task failed', details: { lastPhase: resultState.history.slice(-1)[0]?.phase }, source: 'ReActGraph', duration: processingDuration });
      }


      await this.chatMemoryManager.storeConversation(chatId, resultState);
      this.chatStateManager.endConversation(chatId, this.chatMemoryManager);

      this.eventBus.emitEvent(EventType.CONVERSATION_ENDED, {
        chatId,
        success: resultState.completionStatus === 'completed',
        response: finalResponseText, // Incluir la respuesta aquí también para el log del evento
        duration: resultState.metrics?.totalDuration || processingDuration, // Usar métrica si está disponible
        source: 'ChatService'
      } as ConversationEndedPayload); // Asegurar el tipo correcto

      // ChatService ya no devuelve la respuesta directamente. Se envía por evento.
      // return finalResponseText; // ELIMINAR ESTA LÍNEA

    } catch (error: any) {
      processingDuration = Date.now() - processingStartTime;
      console.error(`[ChatService:${chatId}] Critical error processing message:`, error);
      this.vscodeContext.outputChannel.appendLine(`[ChatService:${chatId}] Critical error: ${error.message}\n${error.stack}`);
      
      const errorPayload = {
        chatId,
        error: error.message || 'Unknown critical error in ChatService',
        stack: error.stack,
        source: 'ChatService.ProcessUserMessageCatch',
        duration: processingDuration
      };
      this.eventBus.emitEvent(EventType.ERROR_OCCURRED, errorPayload);
      this.eventBus.emitEvent(EventType.CONVERSATION_ENDED, {
          chatId,
          success: false,
          error: error.message,
          duration: processingDuration,
          source: 'ChatService.ProcessUserMessageCatch'
      } as ConversationEndedPayload);


      const currentState = this.chatStateManager.getConversationState(chatId);
      if (currentState) {
        currentState.completionStatus = 'failed';
        currentState.error = error.message;
        this.chatStateManager.updateConversationState(chatId, currentState);
        await this.chatMemoryManager.storeConversation(chatId, currentState);
      }
      // return 'Lo siento, ha ocurrido un error crítico al procesar tu mensaje.'; // ELIMINAR ESTA LÍNEA
    }
  }

  public clearConversation(chatId: string): void {
    this.chatStateManager.clearConversation(chatId, this.chatMemoryManager);
    this.eventBus.emitEvent(EventType.CONVERSATION_ENDED, {
      chatId,
      cleared: true, // Indica que fue borrado
      source: 'ChatService'
    } as ConversationEndedPayload);
    console.log(`[ChatService] Cleared conversation: ${chatId}`);
    this.vscodeContext.outputChannel.appendLine(`[ChatService] Cleared conversation: ${chatId}`);
  }

  public getEventBus(): EventBus {
    return this.eventBus;
  }

  public async dispose(): Promise<void> { // Hacerlo async si chatMemoryManager.dispose es async
    await this.chatMemoryManager.dispose();
    console.log('[ChatService] Disposed');
  }
}