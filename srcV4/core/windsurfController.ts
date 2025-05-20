/**
 * Controlador principal de la arquitectura Windsurf
 * Gestiona el ciclo ReAct y coordina todos los componentes del sistema
 */

import * as vscode from 'vscode';
import { VSCodeContext } from './types';
import { WindsurfConfig, ReActNodeType } from './config';
import { MemoryManager } from '../memory/memoryManager';
import { PromptManager } from '../prompts/promptManager';
import { ModelManager } from '../models/modelManager';
import { createReActGraph, ReActGraph } from '../langgraph/reactGraph';
import { ReActState, ReActGraphResult } from '../langgraph/types';
import { ToolRegistry } from '../tools/toolRegistry';
import { EventBus, EventType } from '../events';
import EventEmitter from 'eventemitter3';

// Nota: Los eventos ahora se definen en el módulo events/eventTypes.ts
// Mantenemos esta enumeración para compatibilidad con código existente
export enum WindsurfEvents {
  // Eventos del ciclo de vida de la conversación
  CONVERSATION_STARTED = 'conversation:started',
  CONVERSATION_ENDED = 'conversation:ended',
  
  // Eventos del ciclo ReAct
  REASONING_STARTED = 'react:reasoning:started',
  REASONING_COMPLETED = 'react:reasoning:completed',
  ACTION_STARTED = 'react:action:started',
  ACTION_COMPLETED = 'react:action:completed',
  REFLECTION_STARTED = 'react:reflection:started',
  REFLECTION_COMPLETED = 'react:reflection:completed',
  CORRECTION_STARTED = 'react:correction:started',
  CORRECTION_COMPLETED = 'react:correction:completed',
  
  // Eventos de respuesta
  RESPONSE_GENERATED = 'response:generated',
  RESPONSE_DELIVERED = 'response:delivered',
  
  // Eventos de error
  ERROR_OCCURRED = 'error:occurred'
}

// Mapa de conversión entre WindsurfEvents y EventType
const eventTypeMap = new Map<WindsurfEvents, EventType>([
  [WindsurfEvents.CONVERSATION_STARTED, EventType.CONVERSATION_STARTED],
  [WindsurfEvents.CONVERSATION_ENDED, EventType.CONVERSATION_ENDED],
  [WindsurfEvents.REASONING_STARTED, EventType.REASONING_STARTED],
  [WindsurfEvents.REASONING_COMPLETED, EventType.REASONING_COMPLETED],
  [WindsurfEvents.ACTION_STARTED, EventType.ACTION_STARTED],
  [WindsurfEvents.ACTION_COMPLETED, EventType.ACTION_COMPLETED],
  [WindsurfEvents.REFLECTION_STARTED, EventType.REFLECTION_STARTED],
  [WindsurfEvents.REFLECTION_COMPLETED, EventType.REFLECTION_COMPLETED],
  [WindsurfEvents.CORRECTION_STARTED, EventType.CORRECTION_STARTED],
  [WindsurfEvents.CORRECTION_COMPLETED, EventType.CORRECTION_COMPLETED],
  [WindsurfEvents.RESPONSE_GENERATED, EventType.RESPONSE_GENERATED],
  [WindsurfEvents.RESPONSE_DELIVERED, EventType.RESPONSE_DELIVERED],
  [WindsurfEvents.ERROR_OCCURRED, EventType.ERROR_OCCURRED]
]);

/**
 * Controlador principal para la arquitectura Windsurf
 * Implementa el patrón singleton
 */
export class WindsurfController extends EventEmitter {
  private static instance: WindsurfController;
  
  private vscodeContext: VSCodeContext;
  private memoryManager: MemoryManager;
  private promptManager: PromptManager;
  private modelManager: ModelManager;
  private reactGraph: ReActGraph;
  private toolRegistry: ToolRegistry; 
  private activeConversations: Map<string, ReActState> = new Map();
  
  // Bus de eventos centralizado para comunicación entre capas (legacy)
  public readonly events: EventEmitter;
  
  // Bus de eventos avanzado
  private eventBus: EventBus;
  
  /**
   * Constructor privado para implementar el patrón singleton
   */
  private constructor(context: VSCodeContext) {
    // Llamar al constructor de la clase padre (EventEmitter)
    super();
    
    this.vscodeContext = context;
    
    // Inicializar el bus de eventos centralizado (legacy)
    this.events = new EventEmitter();
    
    // Inicializar el bus de eventos avanzado
    this.eventBus = EventBus.getInstance();
    
    // Configurar el puente entre los dos sistemas de eventos
    this.setupEventBridge();
    
    // Inicializar componentes
    this.memoryManager = new MemoryManager();
    this.promptManager = new PromptManager();
    this.modelManager = new ModelManager();
    this.toolRegistry = new ToolRegistry();
    
    // Inicializar el grafo ReAct con el modelo predeterminado y el bus de eventos
    const defaultModel = 'gemini-pro';
    this.reactGraph = createReActGraph(defaultModel, this.events);
    
    // Pasar el toolRegistry al grafo ReAct
    if (this.reactGraph.setToolRegistry) {
      this.reactGraph.setToolRegistry(this.toolRegistry);
    }
    
    console.log('[WindsurfController] Initialized with ReAct architecture and advanced event handling');
    this.eventBus.debug('[WindsurfController] Initialized controller with advanced event handling');
  }
  
  /**
   * Configura un puente entre el sistema de eventos legacy y el nuevo EventBus
   */
  private setupEventBridge(): void {
    // Reenviar eventos del EventEmitter al EventBus
    this.events.on('*', (eventName: string, ...args: any[]) => {
      // Convertir el tipo de evento si es posible
      const eventType = eventTypeMap.get(eventName as WindsurfEvents) || eventName;
      this.eventBus.emit(eventType as EventType, args[0] || {});
    });
    
    // No necesitamos reenviar eventos del EventBus al EventEmitter
    // ya que estamos migrando gradualmente al nuevo sistema
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
    
    // Emitir evento de inicio de conversación (usando el nuevo sistema de eventos)
    this.eventBus.emit(EventType.CONVERSATION_STARTED, { chatId, userMessage });
    
    // Enriquecer los datos de contexto con información del proyecto si está disponible
    try {
      if (!contextData.projectContext && this.toolRegistry) {
        const projectInfo = await this.toolRegistry.executeTool('getProjectInfo', {});
        if (projectInfo.success) {
          contextData.projectContext = projectInfo.data;
        }
      }
    } catch (error) {
      console.warn(`[WindsurfController:${chatId}] Error getting project info:`, error);
      // No interrumpir el flujo si falla la obtención de información del proyecto
    }
    
    // Inicializar o recuperar el estado de la conversación
    let state = this.activeConversations.get(chatId);
    if (!state) {
      state = this.initializeReActState(chatId, userMessage, contextData);
      this.activeConversations.set(chatId, state);
    } else {
      // Actualizar el estado con el nuevo mensaje
      state.userMessage = userMessage;
      state.finalResponse = undefined; // Resetear la salida anterior
      state.intermediateSteps = []; // Resetear los pasos intermedios
      state.metadata = {
        ...state.metadata,
        chatId,
        contextData: { ...state.metadata.contextData, ...contextData },
        startTime: Date.now() // Actualizar el tiempo de inicio
      };
    }
    
    try {
      // Configurar listeners para eventos específicos del grafo
      // Estos listeners son temporales y se eliminarán después de la ejecución
      const tempListeners = new Map();
      
      // Listener para eventos de herramienta
      const toolExecutionStartedListener = (data: any) => {
        if (data.chatId === chatId) {
          console.log(`[WindsurfController:${chatId}] Tool execution started: ${data.tool}`);
        }
      };
      
      const toolExecutionCompletedListener = (data: any) => {
        if (data.chatId === chatId) {
          console.log(`[WindsurfController:${chatId}] Tool execution completed: ${data.tool}`);
        }
      };
      
      // Registrar listeners temporales
      this.events.on('tool:execution:started', toolExecutionStartedListener);
      this.events.on('tool:execution:completed', toolExecutionCompletedListener);
      tempListeners.set('tool:execution:started', toolExecutionStartedListener);
      tempListeners.set('tool:execution:completed', toolExecutionCompletedListener);
      
      // Ejecutar el grafo ReAct
      const result = await this.reactGraph.runGraph(state);
      
      // Eliminar listeners temporales
      for (const [event, listener] of tempListeners.entries()) {
        this.events.removeListener(event, listener);
      }
      
      // Actualizar el estado de la conversación con el resultado
      const updatedState = {
        ...state,
        ...result,
        metadata: {
          ...state.metadata,
          ...result.metadata,
          lastUpdated: Date.now()
        }
      };
      
      this.activeConversations.set(chatId, updatedState);
      
      // Extraer la respuesta final
      const finalResponse = result.output || 'No se pudo generar una respuesta.';
      
      // No necesitamos emitir el evento RESPONSE_GENERATED aquí ya que el grafo ReAct ya lo emite
      
      // Guardar en memoria
      await this.memoryManager.storeConversation(chatId, {
        objective: `Responder a: ${userMessage.substring(0, 50)}...`,
        userMessage,
        chatId,
        iterationCount: result.executionInfo?.iterations || 1,
        maxIterations: 10,
        completionStatus: 'completed',
        history: updatedState.intermediateSteps.map(step => {
          // Convertir el tipo de fase a uno de los valores aceptados
          const toolName = step.action.tool || '';
          let phase: 'reasoning' | 'action' | 'reflection' | 'correction' = 'action';
          
          if (toolName === 'analyze' || toolName === 'reason') {
            phase = 'reasoning';
          } else if (toolName === 'execute') {
            phase = 'action';
          } else if (toolName === 'reflect') {
            phase = 'reflection';
          } else if (toolName === 'correct') {
            phase = 'correction';
          }
          
          return {
            phase,
            timestamp: step.timestamp || Date.now(),
            data: {
              input: step.action.toolInput || {},
              output: step.observation
            },
            iteration: 1
          };
        }),
        metadata: result.metadata || {}
      });
      
      // Emitir evento de fin de conversación (usando el nuevo sistema de eventos)
      this.eventBus.emit(EventType.CONVERSATION_ENDED, { 
        chatId, 
        success: true,
        response: finalResponse,
        duration: result.executionInfo?.duration || 0
      });
      
      return finalResponse;
    } catch (error: any) {
      console.error(`[WindsurfController:${chatId}] Error processing message:`, error);
      
      // Emitir evento de error (usando el nuevo sistema de eventos)
      this.eventBus.emit(EventType.ERROR_OCCURRED, { 
        chatId, 
        error: error.message || 'Unknown error',
        stack: error.stack,
        source: 'WindsurfController'
      });
      
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
      userMessage: userMessage,
      finalResponse: undefined,
      intermediateSteps: [],
      history: {
        reasoning: [],
        actions: [],
        reflections: [],
        corrections: []
      },
      currentNode: ReActNodeType.INITIAL_ANALYSIS,
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
    this.memoryManager.clearConversationMemory(chatId);
    
    // Emitir evento de fin de conversación
    this.events.emit(WindsurfEvents.CONVERSATION_ENDED, { 
      chatId, 
      cleared: true
    });
    
    console.log(`[WindsurfController] Cleared conversation: ${chatId}`);
  }
  
  /**
   * Libera todos los recursos al desactivar la extensión
   */
  public dispose(): void {
    // Limpiar todas las conversaciones activas
    this.activeConversations.clear();
    
    // Liberar recursos del gestor de memoria
    this.memoryManager.dispose();
    
    // Eliminar todos los listeners de eventos
    this.events.removeAllListeners();
    this.removeAllListeners();
    
    console.log('[WindsurfController] Disposed');
  }
}
