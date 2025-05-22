// src/core/WindsurfController.ts
import * as vscode from 'vscode';
import { VSCodeContext, WindsurfState } from '@shared/types';

// Define a custom interface for history entries to match the expected structure
interface HistoryItem {
  phase: string;
  data?: {
    toolName?: string;
    success?: boolean;
    params?: {
      message?: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
  [key: string]: any;
}

import { MemoryManager } from '../features/memory/MemoryManager';
import { WindsurfGraph } from '../features/ai/ReActGraph';
import { ToolRegistry } from '../features/tools/ToolRegistry';
import { EventBus } from '../features/events/EventBus';
import { EventType, ConversationEndedPayload } from '../features/events/eventTypes';
import { ConversationManager } from './ConversationManager';
// import { IWindsurfController } from './interfaces/IWindsurfController';

export class WindsurfController /* implements IWindsurfController */ {
  // private static instance: WindsurfController; // Ya no es singleton aquí, lo maneja ComponentFactory

  private vscodeContext: VSCodeContext;
  private eventBus: EventBus; // Tipo EventBus, no la instancia directamente si se inyecta
  private memoryManager: MemoryManager;
  private reactGraph: WindsurfGraph;
  private conversationManager: ConversationManager;
  private toolRegistry: ToolRegistry; // Para obtener información de herramientas si es necesario

  constructor(
    context: VSCodeContext,
    eventBusInstance: EventBus, // Recibe la instancia de EventBus
    memoryManager: MemoryManager,
    reactGraph: WindsurfGraph,
    conversationManager: ConversationManager,
    toolRegistry: ToolRegistry
  ) {
    this.vscodeContext = context;
    this.eventBus = eventBusInstance; // Asigna la instancia recibida
    this.memoryManager = memoryManager;
    this.reactGraph = reactGraph;
    this.conversationManager = conversationManager;
    this.toolRegistry = toolRegistry;

    console.log('[WindsurfController] Initialized with new architecture components.');
    this.eventBus.info('WindsurfController initialized', {}, 'WindsurfController');
  }

  // getInstance ya no es necesario aquí, ComponentFactory lo maneja.

  public async processUserMessage(
    chatId: string,
    userMessage: string,
    contextData: Record<string, any> = {}
  ): Promise<string> {
    console.log(`[WindsurfController:${chatId}] Processing message: "${userMessage.substring(0, 50)}..."`);
    this.eventBus.emitEvent(EventType.CONVERSATION_STARTED, { chatId, userMessage, source: 'WindsurfController' });

    // Obtener/crear estado de la conversación
    const state = this.conversationManager.getOrCreateConversationState(chatId, userMessage, contextData, this.vscodeContext);

    // Enriquecer contexto inicial (ej. project info) si es necesario antes de pasarlo al grafo
    try {
      if (!state.projectContext && this.toolRegistry) { // projectContext ya está en state
        const projectInfoTool = this.toolRegistry.getTool('getProjectInfo');
        if (projectInfoTool) {
          // Asumimos que getProjectInfo no necesita parámetros complejos aquí
          const projectInfoResult = await projectInfoTool.execute({});
          if (projectInfoResult.success) {
            state.projectContext = projectInfoResult.data; // Actualiza el estado directamente
            this.conversationManager.updateConversationState(chatId, state); // Guarda el estado actualizado
          }
        }
      }
    } catch (error) {
      console.warn(`[WindsurfController:${chatId}] Error getting project info:`, error);
      this.eventBus.emitEvent(EventType.ERROR_OCCURRED, { chatId, error: (error as Error).message, source: 'WindsurfController.ProjectInfo' });
    }

    try {
      const resultState = await this.reactGraph.runGraph(state);
      this.conversationManager.updateConversationState(chatId, resultState);

      let finalResponse = 'No se pudo generar una respuesta.';
      if (resultState.completionStatus === 'completed' && resultState.actionResult?.toolName === 'respond') {
        // ... (lógica para extraer finalResponse, igual que antes)
        // Use type assertion to handle the history item structure
        const respondAction = (resultState.history as HistoryItem[]).find(
            (h) => h.phase === 'action' && h.data?.toolName === 'respond' && h.data?.success
        );
        if (respondAction && respondAction.data?.params?.message && typeof respondAction.data.params.message === 'string') {
            finalResponse = respondAction.data.params.message;
        } else if (resultState.actionResult?.result?.message && typeof resultState.actionResult.result.message === 'string') {
            finalResponse = resultState.actionResult.result.message;
        } else {
            finalResponse = "La acción de respuesta se completó, pero el mensaje no está disponible.";
        }
      } else if (resultState.error) {
        finalResponse = `Error procesando tu solicitud: ${resultState.error}`;
        this.vscodeContext.outputChannel.appendLine(`[WindsurfController:${chatId}] Error from ReActGraph: ${resultState.error}`);
      } else if (resultState.completionStatus === 'failed') {
         finalResponse = `La tarea no pudo completarse. Último estado: ${resultState.history.slice(-1)[0]?.phase || 'desconocido'}.`;
         this.vscodeContext.outputChannel.appendLine(`[WindsurfController:${chatId}] Task failed. Check history.`);
      }


      await this.memoryManager.storeConversation(chatId, resultState); // Guardar en LTM
      this.conversationManager.endConversation(chatId /*, this.memoryManager */); // Notifica al manager

      this.eventBus.emitEvent(EventType.CONVERSATION_ENDED, {
        chatId,
        success: resultState.completionStatus === 'completed',
        response: finalResponse,
        duration: resultState.timestamp ? Date.now() - resultState.timestamp : undefined,
        source: 'WindsurfController'
      });
      return finalResponse;

    } catch (error: any) {
      console.error(`[WindsurfController:${chatId}] Critical error processing message:`, error);
      this.vscodeContext.outputChannel.appendLine(`[WindsurfController:${chatId}] Critical error: ${error.message}\n${error.stack}`);
      this.eventBus.emitEvent(EventType.ERROR_OCCURRED, {
        chatId,
        error: error.message || 'Unknown critical error',
        stack: error.stack,
        source: 'WindsurfController.ProcessUserMessageCatch'
      });
      // Actualizar estado a fallido si hay un error no controlado por el grafo
      const currentState = this.conversationManager.getConversationState(chatId);
      if (currentState) {
        currentState.completionStatus = 'failed';
        currentState.error = error.message;
        this.conversationManager.updateConversationState(chatId, currentState);
        await this.memoryManager.storeConversation(chatId, currentState);
      }
      return 'Lo siento, ha ocurrido un error crítico al procesar tu mensaje.';
    }
  }

  public clearConversation(chatId: string): void {
    this.conversationManager.clearConversation(chatId, this.memoryManager);
    this.eventBus.emitEvent(EventType.CONVERSATION_ENDED, { // O un nuevo tipo CONVERSATION_CLEARED
      chatId,
      cleared: true, // Asegúrate que este payload exista en eventTypes.ts
      source: 'WindsurfController'
    } as ConversationEndedPayload); // Cast si es necesario
    console.log(`[WindsurfController] Cleared conversation: ${chatId}`);
    this.vscodeContext.outputChannel.appendLine(`[WindsurfController] Cleared conversation: ${chatId}`);
  }

  public getEventBus(): EventBus { // Devuelve el tipo, no la instancia global
    return this.eventBus;
  }

  public dispose(): void {
    // Limpiar managers si tienen métodos dispose
    this.memoryManager.dispose();
    // this.eventBus.dispose(); // EventBus es un singleton, su dispose es global.
    // El logger también se desuscribe si tiene un dispose.
    console.log('[WindsurfController] Disposed');
  }
}