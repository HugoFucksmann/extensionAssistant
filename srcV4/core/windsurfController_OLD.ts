/**
 * Controlador principal de la arquitectura Windsurf
 * Gestiona el ciclo ReAct y coordina todos los componentes del sistema
 */


import { VSCodeContext } from './types';
import {  ReActNodeType } from './config';
import { ReActState } from '../langgraph/types';
import { EventBus, EventType } from '../events';
import EventEmitter from 'eventemitter3';

// Importar interfaces y factory

import { IModelManager } from './interfaces/model-manager.interface';
import { IToolRegistry } from './interfaces/tool-registry.interface';
import { IReActGraph } from './interfaces/react-graph.interface';
import { ComponentFactory } from './factory/componentFactory';
import { FeatureFlags } from './featureFlags';
import { IMemoryManager } from '../features/memory';

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
  private memoryManager!: IMemoryManager;
  private modelManager!: IModelManager;
  private reactGraph!: IReActGraph;
  private toolRegistry!: IToolRegistry; 
  private activeConversations: Map<string, ReActState> = new Map();
  
  // Bus de eventos centralizado para comunicación entre capas (legacy)
  public readonly events: EventEmitter;
  
  // Bus de eventos avanzado
  private eventBus: EventBus;
  
  // Factory de componentes
  private componentFactory: ComponentFactory;
  
  // Feature flags
  private featureFlags: FeatureFlags;
  
  /**
   * Constructor privado para implementar el patrón singleton
   */
  private constructor(context: VSCodeContext) {
    // Llamar al constructor de la clase padre (EventEmitter)
    super();
    
    this.vscodeContext = context;
    
    // Inicializar el bus de eventos centralizado (legacy)
    this.events = new EventEmitter();
    
    // Obtener la factory de componentes
    this.componentFactory = ComponentFactory.getInstance();
    
    // Obtener feature flags
    this.featureFlags = FeatureFlags.getInstance();
    
    // Inicializar el bus de eventos avanzado
    this.eventBus = this.componentFactory.getEventBus() as EventBus;
    
    // Configurar el puente entre los dos sistemas de eventos
    this.setupEventBridge();
    
    // Inicializar componentes usando la factory
    this.initializeComponents();
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
   * Inicializa los componentes usando la factory
   */
  private initializeComponents(): void {
    // Obtener componentes de la factory
    this.memoryManager = this.componentFactory.getMemoryManager();
    this.modelManager = this.componentFactory.getModelManager();
    this.toolRegistry = this.componentFactory.getToolRegistry();
    this.reactGraph = this.componentFactory.getReActGraph();
    
    // Registrar el controlador en la factory para que otros componentes puedan acceder a él
    this.componentFactory.register('windsurfController', this);
  }
  
  /**
   * Obtiene la instancia única del controlador
   */
  public static getInstance(context?: VSCodeContext): WindsurfController {
    if (!WindsurfController.instance) {
      if (!context) {
        throw new Error('Context is required when creating WindsurfController instance');
      }
      
      WindsurfController.instance = new WindsurfController(context);
    }
    
    return WindsurfController.instance;
  }
  
  /**
   * Reinicia el controlador con nuevas configuraciones
   * Útil cuando cambian los feature flags
   */
  public reset(): void {
    // Reiniciar la factory
    this.componentFactory.reset();
    
    // Reinicializar componentes
    this.initializeComponents();
    
    // Limpiar conversaciones activas
    this.activeConversations.clear();
    
    this.eventBus.debug('[WindsurfController] Reset completed');
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
        chatId,
        messages: [
          { role: 'user', content: userMessage, timestamp: Date.now() - 1000 },
          { role: 'assistant', content: finalResponse, timestamp: Date.now() }
        ],
        currentStep: 'completed',
        context: {
          objective: `Responder a: ${userMessage.substring(0, 50)}...`
        },
        userMessage,
        finalResponse,
        startTime: result.executionInfo?.startTime,
        lastUpdateTime: Date.now(),
        toolExecutions: updatedState.intermediateSteps.map(step => {
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
            toolName: step.action.tool || '',
            input: step.action.toolInput || {},
            output: step.observation,
            timestamp: step.timestamp || Date.now(),
            success: true
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
    this.memoryManager.clearConversation(chatId);
    
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
    if ('dispose' in this.memoryManager) {
      (this.memoryManager as any).dispose();
    }
    
    // Eliminar todos los listeners de eventos
    this.events.removeAllListeners();
    this.removeAllListeners();
    
    // Registrar en el bus de eventos
    this.eventBus.debug('[WindsurfController] Disposed');
  }
}
