¡Entendido! Nos enfocaremos directamente en la implementación.

Etapa 1: Implementación del Núcleo de ReActGraph con LangGraph

Objetivo: Reemplazar el ReActEngine lineal por una primera versión funcional de ReActGraph usando LangGraph. Este grafo inicial tendrá nodos básicos: Análisis Inicial, Razonamiento, Acción y Generación de Respuesta.

Vamos a modificar los archivos paso a paso.

Paso 1.1: Definir el Estado del Grafo y Actualizar Tipos

Modificaremos src/shared/types.ts para refinar WindsurfState y prepararlo para ser el estado que maneje LangGraph. También, aseguraremos que HistoryEntry esté bien definido.

// src/shared/types.ts

import * as vscode from 'vscode';
import { z } from 'zod'; // Asegúrate de que zod esté importado si lo usas para schemas en otros tipos aquí

// --- Tipos existentes (ChatMessage, ToolExecution, PerformanceMetrics, etc.) se mantienen ---
// ... (mantén tus definiciones actuales para ChatMessage, ToolExecution, PerformanceMetrics, PlanStep, NextAction, ActionResult, ReflectionResult, CorrectionResult, VSCodeContext, Chat, ChatHistory)

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant' | 'system' | 'tool';
  timestamp: number;
  files?: string[];
  metadata?: {
    processingTime?: number;
    success?: boolean;
    toolName?: string;
    toolInput?: any;
    toolOutput?: any;
    isFinalToolResponse?: boolean;
    metrics?: PerformanceMetrics;
    status?: 'info' | 'success' | 'error' | 'thinking' | 'tool_executing' | 'user_input_pending' | 'skipped';
    [key: string]: any;
  };
}

export interface ToolExecution {
  name: string;
  status: 'started' | 'completed' | 'error' | 'permission_denied';
  parameters?: Record<string, any>;
  result?: any;
  error?: string;
  startTime?: number;
  endTime?: number;
  duration?: number;
}

export interface PerformanceMetrics {
  totalDuration?: number;
  llmCallCount?: number;
  llmTokenUsage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  reasoningTime?: number;
  actionTime?: number;
  reflectionTime?: number;
  toolExecutionCount?: number;
  averageToolTime?: number;
  memoryUsage?: number;
  [key: string]: any;
}

export interface PlanStep {
  id: string;
  stepDescription: string;
  toolToUse?: string;
  expectedOutcome: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  resultSummary?: string;
  startTime?: number;
  endTime?: number;
}

export interface NextAction {
  toolName: string;
  params: Record<string, any>;
  thought?: string;
}

export interface ActionResult {
  toolName: string;
  params: Record<string, any>;
  success: boolean;
  result?: any;
  error?: string;
  timestamp: number;
  metrics?: PerformanceMetrics;
}

export interface ReflectionResult {
  reflection: string;
  isSuccessfulSoFar: boolean;
  confidence?: number;
  needsCorrection: boolean;
  correctionSuggestion?: string;
  metrics?: PerformanceMetrics;
}

export interface CorrectionResult {
  correctionDescription: string;
  updatedPlan?: PlanStep[];
  nextActionAfterCorrection?: NextAction;
  metrics?: PerformanceMetrics;
}


// HistoryEntry: Asegúrate de que esté bien definido para el log del grafo
export interface HistoryEntry {
  phase:
    | 'user_input'
    | 'initial_analysis' // Nuevo para el nodo de análisis
    | 'reasoning'
    | 'action_planning'
    | 'action'
    | 'reflection'
    | 'correction'
    | 'response_generation' // Renombrado desde responseGeneration para consistencia
    | 'system_message'
    | 'tool_result'; // Nuevo para registrar explícitamente el resultado de una herramienta
  iteration?: number;
  content: string; // Puede ser el input del usuario, el pensamiento del LLM, el resultado de la herramienta, etc.
  timestamp: number;
  metadata: {
    tool_executions?: ToolExecution[];
    llm_metrics?: PerformanceMetrics['llmTokenUsage'];
    processingTime?: number; // ms
    status?: 'success' | 'error' | 'skipped' | 'pending' | 'in_progress'; // Añadido pending/in_progress
    error_message?: string;
    // Campos específicos para ciertos tipos de phase
    toolName?: string; // Para phase 'action' o 'tool_result'
    toolParams?: any; // Para phase 'action'
    toolOutput?: any; // Para phase 'tool_result'
    [key: string]: any;
  };
}

// WindsurfGraphState: El estado que será manejado por LangGraph
// Este es el estado que se pasará entre los nodos del grafo.
export interface WindsurfGraphState {
  // --- Entradas iniciales ---
  chatId: string;
  userMessage: string; // La consulta original del usuario para esta ejecución
  objective: string; // El objetivo principal, puede ser refinado por el análisis inicial
  
  // --- Estado del ciclo ReAct ---
  iterationCount: number;
  maxIterations: number;
  
  // --- Planificación (se desarrollará más en Etapa 2) ---
  // plan?: PlanState; // Contendrá subObjetivos, etc.
  // currentSubObjectiveId?: string;

  // --- Para el nodo de Razonamiento ---
  thought?: string; // El pensamiento del LLM
  
  // --- Para el nodo de Acción ---
  currentToolName?: string; // Nombre de la herramienta a ejecutar decidida por el razonamiento
  currentToolParams?: Record<string, any>; // Parámetros para la herramienta
  toolOutput?: any; // Resultado de la última herramienta ejecutada (puede ser string, object, etc.)
  toolError?: string; // Error de la última herramienta ejecutada

  // --- Historial y Logs ---
  history: HistoryEntry[]; // Historial detallado de cada paso y fase

  // --- Salida y Estado Final ---
  finalResponse?: string; // La respuesta final generada para el usuario
  completionStatus: 'in_progress' | 'completed' | 'failed' | 'max_iterations_reached';
  error?: string; // Mensaje de error si el grafo falla

  // --- Contexto adicional (puede ser cargado/usado por nodos específicos) ---
  projectContext?: any;
  editorContext?: any;
  
  // --- Métricas (opcional por ahora, se puede añadir más tarde) ---
  // metrics?: PerformanceMetrics;

  // Permite cualquier otra clave para flexibilidad durante el desarrollo
  [key: string]: any;
}


// WindsurfState: El estado general de la conversación, que puede *contener* el WindsurfGraphState
// para una ejecución particular del agente.
export interface WindsurfState {
  // --- Identificadores y metadatos de la conversación ---
  chatId: string;
  userMessage: string; // El último mensaje del usuario que disparó esta ejecución
  objective: string; // Objetivo general de la conversación (puede ser el userMessage inicial)
  
  // --- Estado del Agente/Grafo (para la ejecución actual) ---
  // Esto podría ser directamente WindsurfGraphState o una referencia a él.
  // Por simplicidad inicial, podemos anidar los campos relevantes.
  // O, mejor, tener una propiedad que sea el estado del grafo:
  // agentRunState?: WindsurfGraphState; // Estado específico de la ejecución actual del grafo

  // --- Para mantener compatibilidad con el código existente mientras migramos ---
  // Muchos de estos campos se moverán a WindsurfGraphState o se derivarán de él.
  iterationCount: number;
  maxIterations: number;
  completionStatus: 'in_progress' | 'completed' | 'failed';
  error?: string;
  reasoningResult?: ReasoningResult; // Podría ser derivado del historial del grafo
  actionResult?: ActionResult;       // Podría ser derivado del historial del grafo
  reflectionResult?: ReflectionResult; // A futuro
  correctionResult?: CorrectionResult; // A futuro
  history: HistoryEntry[]; // Historial general de la conversación (visible al usuario y al agente)
  projectContext?: any;
  editorContext?: any;
  metrics?: PerformanceMetrics;
  finalOutput?: any; // Salida final visible al usuario

  // Timestamp de la última actualización de este estado
  timestamp?: number; 
  [key: string]: any;
}


export interface VSCodeContext {
  extensionUri: vscode.Uri;
  extensionPath: string;
  subscriptions: vscode.Disposable[];
  outputChannel: vscode.OutputChannel;
  workspaceFolders?: readonly vscode.WorkspaceFolder[];
  activeTextEditor?: vscode.TextEditor;
  globalState: vscode.Memento;
  workspaceState: vscode.Memento;
}

export interface Chat {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  metadata?: {
    // Aquí es donde podríamos almacenar el WindsurfState completo asociado a un chat persistido
    windsurfState?: WindsurfState; 
    [key: string]: any;
  };
}

export interface ChatHistory {
  chats: Chat[];
  currentChatId?: string;
  metadata?: {
    [key:string]: any;
  };
}

// --- Fin de src/shared/types.ts ---


Explicación de los Cambios en types.ts:

HistoryEntry:

Añadido initial_analysis y tool_result a phase.

Añadido pending e in_progress a metadata.status.

Añadido toolName, toolParams, toolOutput a metadata para un registro más claro.

WindsurfGraphState (NUEVO):

Este es el tipo de dato que LangGraph manipulará. Contiene toda la información que los nodos necesitan pasar entre sí.

Incluye campos para la entrada (userMessage, objective), estado del ciclo (iterationCount), información para nodos específicos (thought, currentToolName, currentToolParams, toolOutput, toolError), el historial detallado (history), y la salida (finalResponse, completionStatus).

WindsurfState (MODIFICADO):

Este sigue siendo el estado general de la conversación que ConversationManager y MemoryManager podrían usar.

La idea es que WindsurfState podría contener una instancia de WindsurfGraphState cuando el agente está activo (agentRunState?: WindsurfGraphState;). Por ahora, para simplificar la transición, he mantenido algunos campos duplicados (iterationCount, history, finalOutput, etc.) que eventualmente se consolidarán o se derivarán del WindsurfGraphState activo.

history en WindsurfState puede ser el historial acumulado de todas las ejecuciones del grafo para esa conversación, mientras que history en WindsurfGraphState es el de la ejecución actual.

He mantenido el resto de tus tipos (ChatMessage, ToolExecution, etc.) ya que son útiles.

Paso 1.2: Implementar Nodos Básicos en ReActGraph.ts

Ahora, vamos a empezar a darle vida a src/features/ai/ReActGraph.ts. Necesitarás instalar langgraph:
npm install langgraph @langchain/core (ya tienes @langchain/core).

// src/features/ai/ReActGraph.ts
import { StateGraph, END, START } from '@langchain/langgraph';
import { RunnableLambda } from "@langchain/core/runnables";
import { WindsurfGraphState, HistoryEntry, ToolExecution } from '@shared/types';
import { LanguageModelService } from '@core/LanguageModelService';
import { ToolRegistry } from '@features/tools/ToolRegistry';
import { InternalEventDispatcher } from '@core/events/InternalEventDispatcher';
import { EventType, AgentPhaseEventPayload } from '@features/events/eventTypes';
import { PromptManager } from './promptManager'; // Necesario para los prompts
import { getConfig } from '@shared/config';

const config = getConfig(process.env.NODE_ENV === 'production' ? 'production' : 'development');

// Helper para añadir entradas al historial del grafo
function addHistoryEntry(
  state: WindsurfGraphState,
  phase: HistoryEntry['phase'],
  content: string | Record<string, any>,
  metadata: Partial<HistoryEntry['metadata']> = {}
): WindsurfGraphState {
  const newHistoryEntry: HistoryEntry = {
    phase,
    content: typeof content === 'string' ? content : JSON.stringify(content, null, 2),
    timestamp: Date.now(),
    iteration: state.iterationCount,
    metadata: {
      status: 'success', // Default, puede ser sobreescrito
      ...metadata,
    },
  };
  return { ...state, history: [...state.history, newHistoryEntry] };
}


export class ReActGraph {
  private graph: StateGraph<WindsurfGraphState>;
  private compiledGraph: RunnableLambda<WindsurfGraphState, WindsurfGraphState>; // O el tipo que devuelva compile()

  constructor(
    private languageModelService: LanguageModelService,
    private toolRegistry: ToolRegistry,
    private promptManager: PromptManager,
    private dispatcher: InternalEventDispatcher
  ) {
    this.graph = new StateGraph({
      channels: {
        // Define aquí los canales (campos del estado) y cómo se actualizan.
        // Por defecto, los campos se reemplazan. Puedes usar reductores para lógica más compleja.
        // Ejemplo:
        // userMessage: { value: (x, y) => y, default: () => "" },
        // history: { value: (x, y) => x.concat(y), default: () => [] }
        // Por ahora, dejaremos que LangGraph maneje el estado como un todo.
        // Esto significa que cada nodo debe retornar el *estado completo modificado*.
        chatId: { value: (x, y) => y ?? x, default: () => "" },
        userMessage: { value: (x, y) => y ?? x, default: () => "" },
        objective: { value: (x, y) => y ?? x, default: () => "" },
        iterationCount: { value: (x, y) => y ?? x, default: () => 0 },
        maxIterations: { value: (x, y) => y ?? x, default: () => config.backend.react.maxIterations },
        thought: { value: (x, y) => y, default: () => undefined }, // Se reemplaza
        currentToolName: { value: (x, y) => y, default: () => undefined },
        currentToolParams: { value: (x, y) => y, default: () => undefined },
        toolOutput: { value: (x, y) => y, default: () => undefined },
        toolError: { value: (x, y) => y, default: () => undefined },
        history: { value: (x, y) => y ?? x, default: () => [] }, // El nodo debe retornar el nuevo historial completo
        finalResponse: { value: (x, y) => y, default: () => undefined },
        completionStatus: { value: (x, y) => y ?? x, default: () => 'in_progress' },
        error: { value: (x, y) => y, default: () => undefined },
        projectContext: { value: (x, y) => y, default: () => undefined },
        editorContext: { value: (x, y) => y, default: () => undefined },
        // Para permitir que los nodos añadan claves arbitrarias si es necesario (con precaución)
        // ...new PASSTHROUGH, // Si usas una versión más nueva de langgraph
      },
    });

    this.initializeGraph();
    this.compiledGraph = this.graph.compile();
    this.dispatcher.systemInfo('ReActGraph initialized and compiled.', { source: 'ReActGraph' });
  }

  private dispatchAgentPhaseEvent(
    state: WindsurfGraphState,
    phase: AgentPhaseEventPayload['phase'],
    status: 'started' | 'completed',
    data?: any,
    error?: string
  ) {
    const payload: AgentPhaseEventPayload = {
      phase,
      chatId: state.chatId,
      iteration: state.iterationCount,
      source: 'ReActGraph',
      ...(data && { data }),
      ...(error && { error }),
    };
    this.dispatcher.dispatch(
      status === 'started' ? EventType.AGENT_PHASE_STARTED : EventType.AGENT_PHASE_COMPLETED,
      payload
    );
  }

  // --- Nodos del Grafo ---
  private async initialAnalysisNode(state: WindsurfGraphState): Promise<Partial<WindsurfGraphState>> {
    this.dispatchAgentPhaseEvent(state, 'initialAnalysis', 'started');
    let newState = addHistoryEntry(state, 'initial_analysis', 'Starting initial analysis...');
    
    try {
      // En una implementación real, llamarías al LLM con initialAnalysisPrompt
      // Por ahora, un mock simple:
      await new Promise(resolve => setTimeout(resolve, 50)); // Simular llamada LLM
      const analysisResult = {
        refinedObjective: `Respond to: ${state.userMessage.substring(0, 50)}... (analyzed)`,
        complexity: 'medium',
      };
      
      newState = addHistoryEntry(newState, 'initial_analysis', 
        `Analysis complete. Objective: ${analysisResult.refinedObjective}`, 
        { status: 'success', analysis: analysisResult }
      );
      this.dispatchAgentPhaseEvent(newState, 'initialAnalysis', 'completed', { analysis: analysisResult });
      
      return { 
        objective: analysisResult.refinedObjective, 
        history: newState.history,
        iterationCount: 0, // El análisis inicial es iteración 0
      };
    } catch (e: any) {
      const errorMsg = `Error in initial analysis: ${e.message}`;
      newState = addHistoryEntry(newState, 'initial_analysis', errorMsg, { status: 'error', error_message: e.message });
      this.dispatchAgentPhaseEvent(newState, 'initialAnalysis', 'completed', undefined, e.message);
      return { history: newState.history, error: errorMsg, completionStatus: 'failed' };
    }
  }

  private async reasoningNode(state: WindsurfGraphState): Promise<Partial<WindsurfGraphState>> {
    const currentIteration = state.iterationCount + 1; // Incrementar para este ciclo de razonamiento
    let newState = { ...state, iterationCount: currentIteration };
    
    this.dispatchAgentPhaseEvent(newState, 'reasoning', 'started');
    newState = addHistoryEntry(newState, 'reasoning', 'Starting reasoning...');

    try {
      const toolsDescription = this.toolRegistry.getAllTools()
        .map(t => `Name: ${t.name}, Description: ${t.description}, Params: ${JSON.stringify(t.parametersSchema.shape || t.parametersSchema._def?.shape?.() || {})}`) // Simplificado
        .join('\n');

      const llmReasoning = await this.languageModelService.generateReasoning(
        { // Pasar un WindsurfState simplificado o mapear campos
          ...state, 
          userMessage: state.userMessage, // Asegurar que userMessage esté
          objective: state.objective,
          history: state.history, // Pasar el historial actual del grafo
        },
        toolsDescription
      );

      newState = addHistoryEntry(newState, 'reasoning', 
        `Thought: ${llmReasoning.thought}. Action: ${llmReasoning.toolName || 'None'}.`, 
        { 
          status: llmReasoning.error ? 'error' : 'success', 
          llm_thought: llmReasoning.thought,
          tool_to_execute: llmReasoning.toolName,
          tool_params_suggestion: llmReasoning.toolInput,
          error_message: llmReasoning.error
        }
      );
      
      this.dispatchAgentPhaseEvent(newState, 'reasoning', 'completed', 
        { thought: llmReasoning.thought, action: { name: llmReasoning.toolName, input: llmReasoning.toolInput } }, 
        llmReasoning.error
      );

      if (llmReasoning.error) {
        return { 
          history: newState.history, 
          error: `Reasoning error: ${llmReasoning.error}`, 
          // No marcar como 'failed' aún, podría intentar generar respuesta
          thought: llmReasoning.thought,
          currentToolName: undefined, // No hay herramienta si hay error
          currentToolParams: undefined,
        };
      }
      
      return {
        history: newState.history,
        thought: llmReasoning.thought,
        currentToolName: llmReasoning.toolName,
        currentToolParams: llmReasoning.toolInput,
      };

    } catch (e: any) {
      const errorMsg = `Error in reasoning node: ${e.message}`;
      newState = addHistoryEntry(newState, 'reasoning', errorMsg, { status: 'error', error_message: e.message });
      this.dispatchAgentPhaseEvent(newState, 'reasoning', 'completed', undefined, e.message);
      return { history: newState.history, error: errorMsg, completionStatus: 'failed' };
    }
  }

  private async actionNode(state: WindsurfGraphState): Promise<Partial<WindsurfGraphState>> {
    let newState = { ...state };
    const { currentToolName, currentToolParams, chatId } = state;

    if (!currentToolName) {
      // Esto no debería pasar si la lógica condicional es correcta
      newState = addHistoryEntry(newState, 'system_message', 'No tool selected for action.', { status: 'skipped' });
      return { history: newState.history, toolOutput: "No tool was selected.", toolError: undefined };
    }

    this.dispatchAgentPhaseEvent(newState, 'action', 'started', { toolName: currentToolName, params: currentToolParams });
    newState = addHistoryEntry(newState, 'action', `Executing tool: ${currentToolName}...`, { 
      status: 'in_progress', 
      toolName: currentToolName, 
      toolParams: currentToolParams 
    });

    try {
      const toolResult = await this.toolRegistry.executeTool(
        currentToolName,
        currentToolParams || {},
        { chatId, uiOperationId: `graph_op_${state.iterationCount}` } // uiOperationId podría venir del estado si es relevante
      );

      const toolExecutionLog: ToolExecution = {
        name: currentToolName,
        status: toolResult.success ? 'completed' : 'error',
        parameters: currentToolParams || {},
        result: toolResult.data,
        error: toolResult.error,
        startTime: Date.now() - (toolResult.executionTime || 0), // Aproximado
        endTime: Date.now(),
        duration: toolResult.executionTime,
      };
      
      newState = addHistoryEntry(newState, 'tool_result', 
        toolResult.success ? `Tool ${currentToolName} output: ${JSON.stringify(toolResult.data).substring(0,100)}...` : `Tool ${currentToolName} error: ${toolResult.error}`,
        { 
          status: toolResult.success ? 'success' : 'error', 
          tool_executions: [toolExecutionLog],
          toolName: currentToolName,
          toolOutput: toolResult.data,
          error_message: toolResult.error
        }
      );
      this.dispatchAgentPhaseEvent(newState, 'action', 'completed', 
        { toolName: currentToolName, result: toolResult.data, success: toolResult.success }, 
        toolResult.error
      );

      return {
        history: newState.history,
        toolOutput: toolResult.data,
        toolError: toolResult.error,
        // Si la herramienta es 'sendResponseToUser', el estado de finalización se manejará en la lógica condicional
      };
    } catch (e: any) {
      const errorMsg = `Error in action node while executing ${currentToolName}: ${e.message}`;
      newState = addHistoryEntry(newState, 'action', errorMsg, { status: 'error', error_message: e.message, toolName: currentToolName });
      this.dispatchAgentPhaseEvent(newState, 'action', 'completed', { toolName: currentToolName }, e.message);
      return { history: newState.history, toolError: errorMsg, error: errorMsg, completionStatus: 'failed' };
    }
  }

  private async responseGenerationNode(state: WindsurfGraphState): Promise<Partial<WindsurfGraphState>> {
    this.dispatchAgentPhaseEvent(state, 'responseGeneration', 'started');
    let newState = addHistoryEntry(state, 'response_generation', 'Generating final response...');

    try {
      // Si ya hay un finalResponse (ej. de sendResponseToUser), usar ese.
      if (state.finalResponse) {
        newState = addHistoryEntry(newState, 'response_generation', 'Using pre-existing final response.', { status: 'success' });
        this.dispatchAgentPhaseEvent(newState, 'responseGeneration', 'completed', { response: state.finalResponse });
        return { history: newState.history, completionStatus: 'completed' };
      }
      
      // Si hubo un error grave antes y no hay herramienta, generar respuesta de error.
      if (state.error && !state.currentToolName && !state.toolOutput) {
          const errorResponse = `I encountered an error: ${state.error}. I am unable to proceed with a tool.`;
          newState = addHistoryEntry(newState, 'response_generation', errorResponse, { status: 'success' });
          this.dispatchAgentPhaseEvent(newState, 'responseGeneration', 'completed', { response: errorResponse });
          return { history: newState.history, finalResponse: errorResponse, completionStatus: 'completed' }; // O 'failed' si el error es terminal
      }

      const llmFinalResponse = await this.languageModelService.generateFinalResponse({
        ...state,
        userMessage: state.userMessage,
        objective: state.objective,
        history: state.history,
      });
      
      newState = addHistoryEntry(newState, 'response_generation', `Final response: ${llmFinalResponse.substring(0,100)}...`, { status: 'success' });
      this.dispatchAgentPhaseEvent(newState, 'responseGeneration', 'completed', { response: llmFinalResponse });
      
      return {
        history: newState.history,
        finalResponse: llmFinalResponse,
        completionStatus: 'completed',
      };
    } catch (e: any) {
      const errorMsg = `Error in response generation node: ${e.message}`;
      newState = addHistoryEntry(newState, 'response_generation', errorMsg, { status: 'error', error_message: e.message });
      this.dispatchAgentPhaseEvent(newState, 'responseGeneration', 'completed', undefined, e.message);
      // Devolver un mensaje de error como respuesta final si la generación falla
      const fallbackResponse = `Sorry, I encountered an issue while generating the final response: ${e.message}`;
      return { history: newState.history, finalResponse: fallbackResponse, completionStatus: 'failed', error: errorMsg };
    }
  }

  // --- Lógica Condicional ---
  private shouldContinue(state: WindsurfGraphState): "actionNode" | "responseGenerationNode" | typeof END {
    const { currentToolName, toolError, iterationCount, maxIterations, error: graphError } = state;

    if (graphError) { // Si hubo un error grave en un nodo anterior (ej. razonamiento falló críticamente)
        return END; // O ir a un nodo de manejo de errores específico si lo tuvieras
    }

    if (currentToolName === 'sendResponseToUser' && !toolError) {
      // Si la herramienta fue sendResponseToUser y tuvo éxito, su "output" es la respuesta.
      // El `toolOutput` de `sendResponseToUser` (definido en su ToolDefinition)
      // contiene `messageSentToChat: true`, `contentPreview`, etc.
      // El mensaje real ya fue enviado a la UI por el evento RESPONSE_GENERATED emitido por la herramienta.
      // Aquí, el `finalResponse` del estado del grafo podría ser el `contentPreview` o un mensaje de confirmación.
      return END; // El flujo termina aquí porque la respuesta ya se envió.
    }
    
    if (!currentToolName || toolError) { // No hay herramienta o la herramienta falló
      return "responseGenerationNode"; // Intentar generar una respuesta basada en lo que se tenga
    }
    
    if (iterationCount >= maxIterations) {
      let newState = addHistoryEntry(state, 'system_message', 'Max iterations reached.', { status: 'error' });
      // No podemos modificar el estado directamente aquí, pero la lógica de END debería manejarlo.
      // O, mejor, responseGenerationNode debería generar un mensaje de "max iterations".
      // Por ahora, vamos a responseGenerationNode para que lo maneje.
      return "responseGenerationNode";
    }
    
    return "actionNode"; // Si hay herramienta y no hay error, y no se superaron iteraciones, continuar con la acción.
  }
  
  // Lógica condicional después de la acción
  private afterAction(state: WindsurfGraphState): "reasoningNode" | "responseGenerationNode" | typeof END {
    const { currentToolName, toolError, iterationCount, maxIterations, error: graphError } = state;

    if (graphError) { // Si la acción causó un error irrecuperable en el nodo
        return END;
    }

    if (currentToolName === 'sendResponseToUser' && !toolError) {
        // El estado `finalResponse` ya debería estar poblado por el `actionNode`
        // o la herramienta `sendResponseToUser` ya envió el mensaje.
        // El grafo puede terminar.
        return END;
    }

    if (toolError) { // Si la herramienta falló, intentar razonar de nuevo o generar respuesta
        // Podríamos tener una lógica más sofisticada aquí, como un contador de reintentos
        // o un nodo de reflexión específico para errores de herramientas.
        // Por ahora, si una herramienta falla, vamos a razonar de nuevo.
        if (iterationCount >= maxIterations) {
            return "responseGenerationNode"; // Demasiadas iteraciones, generar respuesta de error
        }
        return "reasoningNode"; // Intentar razonar de nuevo con el error de la herramienta en el historial
    }

    // Si la herramienta tuvo éxito y no es sendResponseToUser
    if (iterationCount >= maxIterations) {
        return "responseGenerationNode"; // Límite de iteraciones, generar respuesta final
    }
    
    return "reasoningNode"; // Continuar el ciclo ReAct
  }


  private initializeGraph(): void {
    this.graph.addNode("initialAnalysis", this.initialAnalysisNode.bind(this) as any);
    this.graph.addNode("reasoning", this.reasoningNode.bind(this) as any);
    this.graph.addNode("action", this.actionNode.bind(this) as any);
    this.graph.addNode("responseGeneration", this.responseGenerationNode.bind(this) as any);

    this.graph.addEdge(START, "initialAnalysis");
    this.graph.addEdge("initialAnalysis", "reasoning");
    
    this.graph.addConditionalEdges("reasoning", this.shouldContinue.bind(this), {
      actionNode: "action",
      responseGenerationNode: "responseGeneration",
      [END]: END,
    });
    
    this.graph.addConditionalEdges("action", this.afterAction.bind(this), {
        reasoningNode: "reasoning",
        responseGenerationNode: "responseGeneration",
        [END]: END
    });

    this.graph.addEdge("responseGeneration", END);
  }

  public async run(initialFullState: WindsurfState): Promise<WindsurfState> {
    // Mapear WindsurfState a WindsurfGraphState para la ejecución del grafo
    const initialGraphState: WindsurfGraphState = {
      chatId: initialFullState.chatId,
      userMessage: initialFullState.userMessage,
      objective: initialFullState.objective || initialFullState.userMessage, // Usar userMessage como objetivo inicial si no hay uno específico
      iterationCount: 0, // El grafo maneja su propia cuenta de iteraciones
      maxIterations: initialFullState.maxIterations || config.backend.react.maxIterations,
      history: initialFullState.history ? [...initialFullState.history] : [], // Copiar historial si existe
      completionStatus: 'in_progress',
      projectContext: initialFullState.projectContext,
      editorContext: initialFullState.editorContext,
      // Otros campos se inicializarán a undefined o sus defaults
    };
    
    // Añadir la entrada del usuario al historial del grafo si no está ya
    if (!initialGraphState.history.some(e => e.phase === 'user_input' && e.content === initialFullState.userMessage)) {
        const userEntry: HistoryEntry = {
            phase: 'user_input',
            content: initialFullState.userMessage,
            timestamp: Date.now(), // O el timestamp del mensaje del usuario si se tiene
            iteration: 0,
            metadata: { status: 'success' }
        };
        initialGraphState.history.push(userEntry);
    }


    this.dispatcher.dispatch(EventType.CONVERSATION_STARTED, {
      chatId: initialGraphState.chatId,
      userMessage: initialGraphState.userMessage,
      source: 'ReActGraph'
    });

    let finalGraphState: WindsurfGraphState | undefined;
    try {
      finalGraphState = await this.compiledGraph.invoke(initialGraphState, {
        recursionLimit: (initialGraphState.maxIterations * 2) + 5, // Límite de recursión generoso
      });
    } catch (e: any) {
      console.error(`[ReActGraph:${initialGraphState.chatId}] Critical error invoking graph:`, e);
      // Crear un estado de error si la invocación del grafo falla catastróficamente
      finalGraphState = {
        ...initialGraphState,
        error: `Graph invocation failed: ${e.message}`,
        completionStatus: 'failed',
        history: addHistoryEntry(initialGraphState, 'system_message', `Critical graph error: ${e.message}`, {status: 'error'}).history,
      };
    }
    
    if (!finalGraphState) { // Por si acaso la invocación devuelve undefined/null
        finalGraphState = {
            ...initialGraphState,
            error: "Graph execution resulted in an undefined state.",
            completionStatus: "failed",
            history: addHistoryEntry(initialGraphState, 'system_message', "Graph execution resulted in an undefined state.", {status: 'error'}).history,
        };
    }

    // Mapear el WindsurfGraphState final de nuevo a WindsurfState
    const finalFullState: WindsurfState = {
      ...initialFullState, // Mantener campos del estado original que no maneja el grafo
      objective: finalGraphState.objective,
      iterationCount: finalGraphState.iterationCount,
      history: finalGraphState.history, // El historial del grafo es ahora el historial principal
      finalOutput: finalGraphState.finalResponse,
      completionStatus: finalGraphState.completionStatus,
      error: finalGraphState.error || initialFullState.error, // Combinar errores
      // Actualizar otros campos si es necesario
      reasoningResult: { // Ejemplo de cómo podrías reconstruir esto si fuera necesario
        reasoning: finalGraphState.thought || '',
        plan: [], // El plan detallado vendrá en Etapa 2
        nextAction: { 
          toolName: finalGraphState.currentToolName || '', 
          params: finalGraphState.currentToolParams || {}
        }
      },
      actionResult: finalGraphState.currentToolName ? {
        toolName: finalGraphState.currentToolName,
        params: finalGraphState.currentToolParams || {},
        success: !finalGraphState.toolError,
        result: finalGraphState.toolOutput,
        error: finalGraphState.toolError,
        timestamp: Date.now() // Aproximado
      } : undefined,
      timestamp: Date.now(),
    };

    this.dispatcher.dispatch(EventType.CONVERSATION_ENDED, {
      chatId: finalFullState.chatId,
      finalStatus: finalFullState.completionStatus,
      duration: Date.now() - (initialFullState.timestamp || Date.now()), // Asumiendo que initialState tiene un timestamp de inicio
      source: 'ReActGraph'
    });
    
    // Despachar la respuesta final a la UI si existe y el grafo la generó
    // Esto es redundante si responseGenerationNode o sendResponseToUser ya lo hicieron.
    // Pero es un fallback.
    if (finalGraphState.finalResponse && finalGraphState.completionStatus === 'completed') {
        const isAlreadySentByTool = finalGraphState.history.some(
            entry => entry.phase === 'tool_result' && 
                     entry.metadata?.toolName === 'sendResponseToUser' &&
                     entry.metadata?.status === 'success'
        );
        if (!isAlreadySentByTool) {
            this.dispatcher.dispatch(EventType.RESPONSE_GENERATED, {
                responseContent: finalGraphState.finalResponse,
                isFinal: true,
                chatId: finalGraphState.chatId,
                source: 'ReActGraph.run',
            });
        }
    } else if (finalGraphState.completionStatus === 'failed' && finalGraphState.error) {
        // Si el grafo falló, asegurar que se envíe un mensaje de error
         this.dispatcher.dispatch(EventType.RESPONSE_GENERATED, {
            responseContent: `I'm sorry, I encountered an error: ${finalGraphState.error}`,
            isFinal: true,
            chatId: finalGraphState.chatId,
            source: 'ReActGraph.run.error',
        });
    }


    return finalFullState;
  }
}
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END

Explicación de ReActGraph.ts:

Importaciones: Se importa StateGraph, END, START de LangGraph y otras dependencias.

addHistoryEntry Helper: Función para añadir entradas al historial de forma consistente dentro del estado del grafo.

Constructor:

Se crea una instancia de StateGraph<WindsurfGraphState>.

channels: Aquí es donde defines cómo se actualizan los campos del estado. Por ahora, la mayoría de los campos simplemente se reemplazan (value: (x, y) => y). history es un ejemplo donde podrías querer concatenar, pero para que los nodos devuelvan el estado completo, es más simple que el nodo construya el nuevo array de historial.

Se llama a initializeGraph() para definir nodos y aristas.

Se compila el grafo: this.compiledGraph = this.graph.compile().

dispatchAgentPhaseEvent: Helper para emitir eventos de inicio/fin de fase.

Nodos del Grafo (initialAnalysisNode, reasoningNode, actionNode, responseGenerationNode):

Cada nodo es una función async que recibe el WindsurfGraphState actual.

Importante: Cada nodo debe retornar un Partial<WindsurfGraphState> que contenga solo los campos que modifica. LangGraph se encargará de fusionar estas actualizaciones en el estado general según la configuración de los channels. Si no usas channels con reductores específicos, cada nodo debe retornar el estado completo modificado. Por simplicidad inicial, he hecho que los nodos retornen Partial<WindsurfGraphState> con los campos que cambian.

Se añade logging al historial del grafo usando addHistoryEntry.

Se emiten eventos AGENT_PHASE_STARTED y AGENT_PHASE_COMPLETED.

initialAnalysisNode: Simula un análisis. En una implementación real, usaría initialAnalysisPrompt.

reasoningNode: Llama a languageModelService.generateReasoning().

actionNode: Llama a toolRegistry.executeTool().

responseGenerationNode: Llama a languageModelService.generateFinalResponse() o usa una respuesta preexistente (ej. de sendResponseToUser).

Lógica Condicional (shouldContinue, afterAction):

shouldContinue: Se llama después del nodo reasoning. Decide si ir a actionNode (si hay herramienta), responseGenerationNode (si no hay herramienta o error), o END.

afterAction: Se llama después del nodo action. Decide si volver a reasoningNode (ciclo ReAct), ir a responseGenerationNode (si la herramienta falló o se alcanzó el límite de iteraciones), o END (si la herramienta fue sendResponseToUser).

initializeGraph():

this.graph.addNode("nombreNodo", this.funcionNodo.bind(this)): Añade los nodos.

this.graph.addEdge(START, "initialAnalysis"): Define el punto de entrada.

this.graph.addConditionalEdges("nodoOrigen", this.funcionCondicional.bind(this), { "rama1": "nodoDestino1", ... }): Define las transiciones condicionales.

this.graph.addEdge("responseGeneration", END): Define un punto final.

run(initialFullState: WindsurfState):

Este es el método principal que se llamará desde ApplicationLogicService.

Mapea el WindsurfState de entrada a un WindsurfGraphState inicial para el grafo.

Invoca el grafo compilado: await this.compiledGraph.invoke(initialGraphState).

recursionLimit: Es importante establecer un límite de recursión para evitar bucles infinitos en el grafo.

Mapea el WindsurfGraphState final de nuevo a WindsurfState.

Emite eventos CONVERSATION_STARTED y CONVERSATION_ENDED.

Importante: La gestión de la respuesta final a la UI (vía RESPONSE_GENERATED) es crucial. Si una herramienta como sendResponseToUser ya lo hizo, el grafo no necesita hacerlo de nuevo. Si el grafo llega a responseGenerationNode, ese nodo es responsable. El run tiene un fallback.

Paso 1.3: Integración con ApplicationLogicService y ComponentFactory

src/core/ApplicationLogicService.ts:

// src/core/ApplicationLogicService.ts
import { VSCodeContext, WindsurfState, HistoryEntry } from '../shared/types'; // HistoryEntry añadido
import { MemoryManager } from '../features/memory/MemoryManager';
import { ReActGraph } from '../features/ai/ReActGraph'; // <-- CAMBIADO a ReActGraph
import { ToolRegistry } from '../features/tools/ToolRegistry';
import { ConversationManager } from './ConversationManager';
import { ToolResult } from '../features/tools/types'; 

export interface ProcessUserMessageResult {
  success: boolean;
  finalResponse?: string; // Este podría volverse menos relevante si la UI escucha eventos
  updatedState?: WindsurfState;
  error?: string;
}

export class ApplicationLogicService {
  constructor(
    private vscodeContext: VSCodeContext,
    private memoryManager: MemoryManager,
    private reActGraph: ReActGraph, // <-- CAMBIADO a reActGraph
    private conversationManager: ConversationManager,
    private toolRegistry: ToolRegistry // ToolRegistry se pasa al ReActGraph, pero puede ser útil aquí para otras cosas
  ) {
    console.log('[ApplicationLogicService] Initialized with ReActGraph.');
  }

  public async processUserMessage(
    chatId: string,
    userMessage: string,
    contextData: Record<string, any> = {}
  ): Promise<ProcessUserMessageResult> {
    const startTime = Date.now();
    console.log(`[ApplicationLogicService:${chatId}] Processing message via ReActGraph: "${userMessage.substring(0, 50)}..."`);

    const initialState = this.conversationManager.getOrCreateConversationState(
      chatId,
      userMessage,
      contextData,
      this.vscodeContext
    );
    initialState.timestamp = startTime; // Asegurar que el estado inicial tenga un timestamp

    // Limpiar el estado de ejecución anterior si es necesario, o dejar que el grafo lo haga.
    // El grafo debería comenzar con un estado "limpio" para la ejecución actual.
    initialState.completionStatus = 'in_progress';
    initialState.error = undefined;
    initialState.finalOutput = undefined;
    // initialState.history podría ser solo la entrada del usuario para el grafo,
    // o el historial completo si el grafo lo necesita para el contexto inicial.
    // ReActGraph.run ahora maneja la adición de la entrada del usuario al historial del grafo.

    try {
      // --- LLAMAR AL NUEVO ReActGraph ---
      const resultState = await this.reActGraph.run(initialState);
      // ---                               ---

      this.conversationManager.updateConversationState(chatId, resultState);
      await this.memoryManager.storeConversation(chatId, resultState); // Persistir el estado final

      const duration = Date.now() - startTime;
      console.log(`[ApplicationLogicService:${chatId}] ReActGraph processing finished. Status: ${resultState.completionStatus}. Duration: ${duration}ms.`);

      // La respuesta final ahora se envía a la UI a través de eventos (RESPONSE_GENERATED)
      // emitidos por ReActGraph o las herramientas.
      // El `finalResponse` aquí es más para logging o si algún otro sistema lo necesita.
      return {
        success: resultState.completionStatus === 'completed',
        finalResponse: typeof resultState.finalOutput === 'string' ? resultState.finalOutput : undefined,
        updatedState: resultState,
        error: resultState.completionStatus === 'failed' ? (resultState.error || 'Processing did not complete successfully.') : undefined,
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`[ApplicationLogicService:${chatId}] CRITICAL error processing message with ReActGraph (duration: ${duration}ms):`, error);
      
      const errorState = this.conversationManager.getConversationState(chatId) || initialState;
      errorState.completionStatus = 'failed';
      errorState.error = error.message || 'Unknown critical error during graph processing.';
      
      // Añadir al historial del estado general (no necesariamente el del grafo si falló antes de empezar)
      if (!errorState.history) errorState.history = [];
      const errorEntry: HistoryEntry = {
          phase: 'system_message',
          content: `Critical error in ApplicationLogicService: ${errorState.error}`,
          timestamp: Date.now(),
          iteration: errorState.iterationCount || 0,
          metadata: { status: 'error' }
      };
      errorState.history.push(errorEntry);
      
      this.conversationManager.updateConversationState(chatId, errorState);
      await this.memoryManager.storeConversation(chatId, errorState);
      
      return {
        success: false,
        error: errorState.error,
        updatedState: errorState,
      };
    }
  }

  // ... (otros métodos como clearConversation, invokeTool, dispose se mantienen igual) ...
  public async clearConversation(chatId: string): Promise<void> {
    console.log(`[ApplicationLogicService] Clearing conversation: ${chatId}`);
    this.conversationManager.clearConversation(chatId, this.memoryManager);
  }

  public async invokeTool(
    toolName: string,
    params: any,
    executionContextArgs: { chatId?: string; uiOperationId?: string; [key: string]: any } = {}
  ): Promise<ToolResult> {
    if (!this.toolRegistry) {
      console.error('[ApplicationLogicService] ToolRegistry not available to invokeTool.');
      return { success: false, error: 'ToolRegistry not available', executionTime: 0 };
    }
    console.log(`[ApplicationLogicService] Invoking tool "${toolName}" directly with params:`, params, "ContextArgs:", executionContextArgs);
    return this.toolRegistry.executeTool(toolName, params, executionContextArgs);
  }

  public dispose(): void {
    if (this.memoryManager && typeof (this.memoryManager as any).dispose === 'function') {
        (this.memoryManager as any).dispose();
    }
    console.log('[ApplicationLogicService] Disposed.');
  }
}
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END

src/core/ComponentFactory.ts:

// src/core/ComponentFactory.ts
import * as vscode from 'vscode';
import { VSCodeContext } from '../shared/types';
import { EventLogger } from '../features/events/EventLogger';
import { ModelManager } from '../features/ai/ModelManager';
import { PromptManager } from '../features/ai/promptManager';
import { ToolRegistry } from '../features/tools/ToolRegistry';
import { allToolDefinitions } from '../features/tools/definitions';
import { MemoryManager } from '../features/memory/MemoryManager';
import { ConversationManager } from './ConversationManager';
import { ApplicationLogicService } from './ApplicationLogicService';
import { InternalEventDispatcher } from './events/InternalEventDispatcher';

import { LanguageModelService } from './LanguageModelService';
import { ReActGraph } from '../features/ai/ReActGraph'; // <-- CAMBIADO a ReActGraph

export class ComponentFactory {
  private static applicationLogicServiceInstance: ApplicationLogicService;
  private static internalEventDispatcherInstance: InternalEventDispatcher;
  private static eventLoggerInstance: EventLogger;
  private static toolRegistryInstance: ToolRegistry;
  private static vscodeContextInstance: VSCodeContext;

  private static modelManagerInstance: ModelManager;
  private static promptManagerInstance: PromptManager;
  private static languageModelServiceInstance: LanguageModelService;
  private static reActGraphInstance: ReActGraph; // <-- CAMBIADO a ReActGraph

  public static getInternalEventDispatcher(): InternalEventDispatcher {
    if (!this.internalEventDispatcherInstance) {
      this.internalEventDispatcherInstance = new InternalEventDispatcher();
      console.log('[ComponentFactory] InternalEventDispatcher instance created.');
    }
    return this.internalEventDispatcherInstance;
  }

  private static getVSCodeContext(extensionContext: vscode.ExtensionContext): VSCodeContext {
    if (!this.vscodeContextInstance) {
        this.vscodeContextInstance = {
            extensionUri: extensionContext.extensionUri,
            extensionPath: extensionContext.extensionPath,
            subscriptions: extensionContext.subscriptions,
            outputChannel: vscode.window.createOutputChannel("Extension Assistant Log"),
            globalState: extensionContext.globalState,
            workspaceState: extensionContext.workspaceState,
        };
        console.log('[ComponentFactory] VSCodeContext instance created.');
    }
    return this.vscodeContextInstance;
  }

  public static getToolRegistry(extensionContext: vscode.ExtensionContext): ToolRegistry {
    if (!this.toolRegistryInstance) {
      const dispatcher = this.getInternalEventDispatcher();
      this.toolRegistryInstance = new ToolRegistry(dispatcher);
      this.toolRegistryInstance.registerTools(allToolDefinitions);
      console.log(`[ComponentFactory] ToolRegistry instance created with ${allToolDefinitions.length} tools.`);
    }
    return this.toolRegistryInstance;
  }
  
  public static getModelManager(): ModelManager {
    if (!this.modelManagerInstance) {
      this.modelManagerInstance = new ModelManager(); 
      console.log('[ComponentFactory] ModelManager instance created.');
    }
    return this.modelManagerInstance;
  }

  public static getPromptManager(): PromptManager {
    if (!this.promptManagerInstance) {
      // El PromptManager actual se instancia a sí mismo como singleton,
      // pero para consistencia con otros componentes, lo manejamos aquí.
      // Si tu PromptManager no es un singleton exportado, necesitarías:
      // this.promptManagerInstance = new PromptManager();
      // Si es un singleton exportado (como `export const promptManager = new PromptManager();`):
      this.promptManagerInstance = PromptManager.prototype.constructor(); // O importa la instancia directamente
      // Para tu caso actual, donde `promptManager.ts` exporta una instancia:
      // import { promptManager as pmInstance } from '../features/ai/promptManager';
      // this.promptManagerInstance = pmInstance;
      // Sin embargo, para mantener el patrón de fábrica, es mejor que PromptManager sea una clase normal.
      // Asumiendo que cambias PromptManager para que sea una clase normal:
      this.promptManagerInstance = new PromptManager();
      console.log('[ComponentFactory] PromptManager instance created.');
    }
    return this.promptManagerInstance;
  }
  
  public static getLanguageModelService(extensionContext: vscode.ExtensionContext): LanguageModelService {
    if (!this.languageModelServiceInstance) {
      const modelManager = this.getModelManager();
      const promptManager = this.getPromptManager(); // Usar el de la fábrica
      const dispatcher = this.getInternalEventDispatcher();
      this.languageModelServiceInstance = new LanguageModelService(modelManager, promptManager, dispatcher);
      console.log('[ComponentFactory] LanguageModelService instance created.');
    }
    return this.languageModelServiceInstance;
  }

  // --- MÉTODO ACTUALIZADO ---
  public static getReActGraph(extensionContext: vscode.ExtensionContext): ReActGraph { // <-- CAMBIADO
    if (!this.reActGraphInstance) {
      const languageModelService = this.getLanguageModelService(extensionContext);
      const toolRegistry = this.getToolRegistry(extensionContext);
      const promptManager = this.getPromptManager(); // ReActGraph necesita PromptManager
      const dispatcher = this.getInternalEventDispatcher();
      this.reActGraphInstance = new ReActGraph(languageModelService, toolRegistry, promptManager, dispatcher); // <-- CAMBIADO
      console.log('[ComponentFactory] ReActGraph instance created.');
    }
    return this.reActGraphInstance;
  }
  
  public static getApplicationLogicService(extensionContext: vscode.ExtensionContext): ApplicationLogicService {
    if (!this.applicationLogicServiceInstance) {
      const vscodeContext = this.getVSCodeContext(extensionContext);
      const dispatcher = this.getInternalEventDispatcher();

      if (!this.eventLoggerInstance) {
        this.eventLoggerInstance = new EventLogger(vscodeContext, dispatcher);
        console.log('[ComponentFactory] EventLogger instance created and subscribed.');
      }

      const memoryManager = new MemoryManager(extensionContext);
      const toolRegistry = this.getToolRegistry(extensionContext);
      const conversationManager = new ConversationManager();
      
      const reActGraph = this.getReActGraph(extensionContext); // <-- USAR NUEVO MÉTODO

      this.applicationLogicServiceInstance = new ApplicationLogicService(
        vscodeContext,
        memoryManager,
        reActGraph, // <-- INYECTAR ReActGraph
        conversationManager,
        toolRegistry
      );
      console.log('[ComponentFactory] ApplicationLogicService instance created.');
    }
    return this.applicationLogicServiceInstance;
  }

  public static dispose(): void {
    if (this.applicationLogicServiceInstance && typeof (this.applicationLogicServiceInstance as any).dispose === 'function') {
        (this.applicationLogicServiceInstance as any).dispose();
    }
    if (this.modelManagerInstance && typeof (this.modelManagerInstance as any).dispose === 'function') {
        (this.modelManagerInstance as any).dispose();
    }
    if (this.internalEventDispatcherInstance && typeof this.internalEventDispatcherInstance.dispose === 'function') {
        this.internalEventDispatcherInstance.dispose();
    }
    if (this.eventLoggerInstance && typeof (this.eventLoggerInstance as any).dispose === 'function') {
        (this.eventLoggerInstance as any).dispose();
    }
    // ReActGraph no tiene un método dispose actualmente.

    // @ts-ignore
    this.applicationLogicServiceInstance = undefined;
    // @ts-ignore
    this.internalEventDispatcherInstance = undefined;
    // @ts-ignore
    this.eventLoggerInstance = undefined;
    // @ts-ignore
    this.toolRegistryInstance = undefined;
    // @ts-ignore
    this.vscodeContextInstance = undefined;
    // @ts-ignore
    this.modelManagerInstance = undefined;
    // @ts-ignore
    this.promptManagerInstance = undefined;
    // @ts-ignore
    this.languageModelServiceInstance = undefined;
    // @ts-ignore
    this.reActGraphInstance = undefined; // <-- CAMBIADO
    console.log('[ComponentFactory] All instances disposed.');
  }
}
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END

Modificación en src/features/ai/promptManager.ts:
Para que ComponentFactory pueda instanciar PromptManager de forma estándar, cambia la exportación de la instancia singleton a una exportación de clase normal.

// src/features/ai/promptManager.ts

import { ChatPromptTemplate, BasePromptTemplate } from '@langchain/core/prompts';
import { initialAnalysisPrompt } from './prompts/initialAnalysisPrompt';
import { reasoningPrompt } from './prompts/reasoningPrompt';
import { reflectionPrompt } from './prompts/reflectionPrompt';
import { correctionPrompt } from './prompts/correctionPrompt';
import { responseGenerationPrompt } from './prompts/responseGenerationPrompt';

export type PromptType = 
  | 'initialAnalysis'
  | 'reasoning'
  | 'reflection'
  | 'correction'
  | 'responseGeneration';

export class PromptManager { // <-- CAMBIO: Ahora es una clase normal
  private prompts: Map<PromptType, BasePromptTemplate>;

  constructor() {
    this.prompts = new Map();
    this.registerPrompts();
    console.log('[PromptManager] Initialized with prompts:', Array.from(this.prompts.keys()).join(', '));
  }

  private registerPrompts(): void {
    this.prompts.set('initialAnalysis', initialAnalysisPrompt);
    this.prompts.set('reasoning', reasoningPrompt);
    this.prompts.set('reflection', reflectionPrompt);
    this.prompts.set('correction', correctionPrompt);
    this.prompts.set('responseGeneration', responseGenerationPrompt);
  }
  
  public getPrompt(type: PromptType): BasePromptTemplate {
    const prompt = this.prompts.get(type);
    if (!prompt) {
      throw new Error(`[PromptManager] No se encontró el prompt de tipo: ${type}`);
    }
    return prompt;
  }
  
  public async formatPrompt(type: PromptType, values: Record<string, any>): Promise<string> {
    const prompt = this.getPrompt(type);
    try {
      // Langchain prompts ahora son sync para format, formatMessages es async
      // Si usas formatMessages, mantenlo async. Si usas format, puede ser sync.
      // Por consistencia con el código original, lo mantendré async.
      const formattedMessages = await prompt.formatMessages(values);
      // Asumimos que para `generateText` de `LanguageModelService` necesitas un string.
      // Esto podría necesitar ajuste basado en cómo `LanguageModelService` espera el prompt.
      // Si `LanguageModelService.generateText` toma `BaseMessage[]`, entonces retorna `formattedMessages`.
      // Si toma un string, concatena el contenido.
      // Por ahora, asumiré que toma un string y el primer mensaje es el principal.
      if (formattedMessages.length > 0 && typeof formattedMessages[0].content === 'string') {
        return formattedMessages[0].content; // O una concatenación más inteligente
      }
      return JSON.stringify(formattedMessages); // Fallback
    } catch (error) {
      console.error(`[PromptManager] Error al formatear el prompt ${type}:`, error);
      throw new Error(`Error al formatear el prompt: ${error}`);
    }
  }
  
  public registerPrompt(type: PromptType, prompt: BasePromptTemplate): void {
    this.prompts.set(type, prompt);
    console.log(`[PromptManager] Prompt '${type}' registrado/actualizado`);
  }
}

// Eliminar la exportación de la instancia singleton de aquí:
// export const promptManager = new PromptManager();
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END

Paso 1.4: Eliminar o Marcar como Obsoleto ReActEngine.ts

Puedes eliminar el archivo src/core/ReActEngine.ts o renombrarlo a ReActEngine_old.ts por si necesitas consultarlo. Ya no será utilizado.

Paso 1.5: Ajustes en ConversationManager.ts

El ConversationManager crea el WindsurfState. Debemos asegurarnos de que el WindsurfState que crea sea compatible con lo que ReActGraph.run() espera como initialFullState.

// src/core/ConversationManager.ts
import { WindsurfState, VSCodeContext, HistoryEntry, WindsurfGraphState } from '../shared/types'; // WindsurfGraphState importado
import { MemoryManager } from '../features/memory/MemoryManager';
import { getConfig } from '../shared/config';
import { IConversationManager } from './interfaces/IConversationManager';

const config = getConfig(process.env.NODE_ENV === 'production' ? 'production' : 'development');

export class ConversationManager implements IConversationManager {
  private activeConversations: Map<string, WindsurfState> = new Map();

  constructor() {
    console.log('[ConversationManager] Initialized');
  }

  public getOrCreateConversationState(
    chatId: string,
    userMessage: string,
    contextData: Record<string, any> = {},
    vscodeContext: VSCodeContext
  ): WindsurfState {
    let state = this.activeConversations.get(chatId);
    const currentTime = Date.now();

    if (state) {
      // Reutilizar y actualizar estado existente para una nueva ejecución del grafo
      state.userMessage = userMessage; // El mensaje que dispara esta nueva ejecución
      state.objective = `Responder a: ${userMessage.substring(0, 100)}...`; // Objetivo se refinará en el grafo
      state.iterationCount = 0; // Se reinicia para la ejecución del grafo
      state.completionStatus = 'in_progress';
      state.error = undefined;
      state.finalOutput = undefined;
      state.timestamp = currentTime;

      // El historial del WindsurfState general se mantiene y crece.
      // El ReActGraph.run tomará este historial y lo usará para su WindsurfGraphState.history.
      const userHistoryEntry: HistoryEntry = {
          phase: 'user_input',
          content: userMessage,
          timestamp: currentTime,
          iteration: 0, 
          metadata: { status: 'success' },
      };
      if (!state.history) state.history = [];
      state.history.push(userHistoryEntry);

      // Limpiar resultados de ejecuciones anteriores del grafo si estaban en el WindsurfState principal
      state.reasoningResult = undefined;
      state.actionResult = undefined;
      
      // Actualizar contextos si se proporcionan nuevos
      if (contextData.projectContext) state.projectContext = contextData.projectContext;
      if (contextData.editorContext) state.editorContext = contextData.editorContext;

      console.log(`[ConversationManager] Reusing and updating state for chat ${chatId} for new graph run.`);
      this.activeConversations.set(chatId, state);
      return state;
    }

    // Crear nuevo estado de conversación
    const initialUserEntry: HistoryEntry = {
        phase: 'user_input',
        content: userMessage,
        timestamp: currentTime,
        iteration: 0,
        metadata: { status: 'success' },
    };

    const newState: WindsurfState = {
      chatId: chatId,
      userMessage: userMessage, // Mensaje que inicia esta conversación/ejecución
      objective: `Responder a: ${userMessage.substring(0, 100)}...`, // Objetivo inicial
      iterationCount: 0, // Se refiere a las iteraciones del grafo para esta ejecución
      maxIterations: config.backend.react.maxIterations,
      completionStatus: 'in_progress',
      history: [initialUserEntry], // Historial general de la conversación
      projectContext: contextData.projectContext,
      editorContext: contextData.editorContext,
      metrics: {},
      timestamp: currentTime,
    };
    this.activeConversations.set(chatId, newState);
    console.log(`[ConversationManager] Created new WindsurfState for chat ${chatId}`);
    return newState;
  }

  public getConversationState(chatId:string): WindsurfState | undefined {
    return this.activeConversations.get(chatId);
  }

  public updateConversationState(chatId: string, state: WindsurfState): void {
    state.timestamp = Date.now(); // Siempre actualizar timestamp en update
    this.activeConversations.set(chatId, state);
  }

  public async endConversation(chatId: string, memoryManager?: MemoryManager): Promise<void> {
    const state = this.activeConversations.get(chatId);
    if (state) {
      // La persistencia se maneja en ApplicationLogicService después de ReActGraph.run
      console.log(`[ConversationManager] Graph run for last message in chat ${chatId} ended. Status: ${state.completionStatus}.`);
    }
  }

  public clearConversation(chatId: string, memoryManager?: MemoryManager): void {
    this.activeConversations.delete(chatId);
    if (memoryManager) {
      memoryManager.clearConversationMemory(chatId);
    }
    console.log(`[ConversationManager] Cleared active conversation state and memory for chat ${chatId}`);
  }
}
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END

Consideraciones Adicionales para la Etapa 1:

Errores y Robustez: La implementación inicial de los nodos en ReActGraph.ts tiene un manejo de errores básico. Esto se puede refinar.

Paso de Estado: Asegúrate de que cada nodo del grafo reciba el estado correctamente y devuelva solo las partes del estado que ha modificado, o el estado completo si así lo prefieres para la gestión de channels en LangGraph. El ejemplo actual hace que los nodos retornen Partial<WindsurfGraphState>.

Prompts: Los prompts (initialAnalysisPrompt, reasoningPrompt, responseGenerationPrompt) deben estar bien definidos para que el LLM genere las salidas esperadas por los nodos. El reasoningPrompt actual es un buen punto de partida. initialAnalysisPrompt necesitará ser creado o adaptado.

Eventos: Verifica que los eventos AGENT_PHASE_STARTED, AGENT_PHASE_COMPLETED, CONVERSATION_STARTED, CONVERSATION_ENDED, y RESPONSE_GENERATED se emitan correctamente y sean consumidos por la UI (WebviewProvider) o EventLogger como esperas.

Siguientes Pasos Inmediatos:

Instalar langgraph: npm install langgraph

Aplicar los cambios a types.ts.

Implementar ReActGraph.ts con los nodos y la lógica de grafo.

Modificar promptManager.ts para que sea una clase normal.

Actualizar ComponentFactory.ts para usar ReActGraph y la nueva instanciación de PromptManager.

Actualizar ApplicationLogicService.ts para llamar a ReActGraph.run().

Actualizar ConversationManager.ts para asegurar que el WindsurfState inicial sea compatible.

Probar el flujo: Envía un mensaje simple desde la UI y observa (mediante logs y la UI si los eventos se reflejan) si el grafo se ejecuta, llama a las herramientas (si el razonamiento lo decide) y genera una respuesta.

Esta es una etapa grande y fundamental. Tómate tu tiempo para cada parte. ¡Avísame cuando estés listo para la siguiente etapa o si tienes preguntas sobre esta!