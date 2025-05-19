/**
 * Controlador principal de la arquitectura Windsurf
 * Gestiona el ciclo ReAct y coordina todos los componentes del sistema
 */

import * as vscode from 'vscode';
import { VSCodeContext } from './types';
import { MemoryManager } from '../memory/memoryManager';
import { PromptManager } from '../prompts/promptManager';
import { ModelManager } from '../models/modelManager';
import { createReActGraph, ReActGraph } from '../langgraph/reactGraph';
import { ReActState, ReActGraphResult } from '../langgraph/types';

/**
 * Controlador principal para la arquitectura Windsurf
 * Implementa el patrón singleton
 */
export class WindsurfController {
  private static instance: WindsurfController;
  
  private vscodeContext: VSCodeContext;
  private memoryManager: MemoryManager;
  private promptManager: PromptManager;
  private modelManager: ModelManager;
  private reactGraph: ReActGraph;
  
  private activeConversations: Map<string, ReActState> = new Map();
  
  /**
   * Constructor privado para implementar el patrón singleton
   */
  private constructor(context: VSCodeContext) {
    this.vscodeContext = context;
    
    // Inicializar componentes
    this.memoryManager = new MemoryManager();
    this.promptManager = new PromptManager();
    this.modelManager = new ModelManager();
    
    // Inicializar el grafo ReAct con el modelo predeterminado
    const defaultModel = 'gemini-pro';
    this.reactGraph = createReActGraph(defaultModel);
    
    console.log('[WindsurfController] Initialized with ReAct architecture');
  }
  
  /**
   * Obtiene la instancia única del controlador
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
   * Procesa un mensaje del usuario y ejecuta el ciclo ReAct
   * @param chatId Identificador único de la conversación
   * @param userMessage Mensaje del usuario
   * @param contextData Datos adicionales de contexto
   * @returns Respuesta generada por el agente
   */
  public async processUserMessage(
    chatId: string,
    userMessage: string,
    contextData: Record<string, any> = {}
  ): Promise<string> {
    console.log(`[WindsurfController:${chatId}] Processing message: "${userMessage.substring(0, 50)}..."`);
    
    // Inicializar o recuperar el estado de la conversación
    let state = this.activeConversations.get(chatId);
    if (!state) {
      state = this.initializeReActState(chatId, userMessage, contextData);
      this.activeConversations.set(chatId, state);
    } else {
      // Actualizar el estado con el nuevo mensaje
      state.input = userMessage;
      state.metadata = {
        ...state.metadata,
        chatId,
        contextData: { ...state.metadata.contextData, ...contextData }
      };
    }
    
    try {
      // Ejecutar el grafo ReAct
      const result = await this.reactGraph.runGraph(state);
      
      // Actualizar el estado de la conversación con el resultado
      this.activeConversations.set(chatId, {
        ...state,
        ...result
      });
      
      // Extraer la respuesta final
      const finalResponse = result.output || 'No se pudo generar una respuesta.';
      
      // Guardar en memoria
      await this.memoryManager.storeConversation(chatId, {
        userMessage,
        response: finalResponse,
        metadata: result.metadata || {}
      });
      
      return finalResponse;
    } catch (error) {
      console.error(`[WindsurfController:${chatId}] Error processing message:`, error);
      
      // Devolver un mensaje de error amigable
      return 'Lo siento, ha ocurrido un error al procesar tu mensaje. Por favor, inténtalo de nuevo.';
    }
  }
  
  /**
   * Inicializa el estado para el grafo ReAct
   */
  private initializeReActState(
    chatId: string,
    userMessage: string,
    contextData: Record<string, any>
  ): ReActState {
    return {
      input: userMessage,
      output: null,
      intermediateSteps: [],
      metadata: {
        chatId,
        userId: contextData.userId || 'anonymous',
        contextData,
        history: []
      }
    };
  }
  
  /**
   * Limpia una conversación
    // Respuesta por defecto
    return 'Procesé tu solicitud, pero no pude generar una respuesta adecuada.';
  }
  
  /**
   * Limpia los recursos de una conversación
   */
  public clearConversation(chatId: string): void {
    this.activeConversations.delete(chatId);
    console.log(`[WindsurfController] Cleared conversation: ${chatId}`);
  }
  
  /**
   * Libera todos los recursos al desactivar la extensión
   */
  public dispose(): void {
    this.activeConversations.clear();
    this.memoryManager.dispose();
    console.log('[WindsurfController] Disposed');
  }
}
