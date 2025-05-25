// src/features/ai/ReActGraph.ts

import { ModelManager } from './ModelManager';
import { PromptManager } from './promptManager';
import {
  ActionResult,
  Insight,
  PlanStep,
  ReasoningResult,
  ReflectionResult,
  WindsurfState,
  HistoryEntry, // Asegúrate que este tipo sea el correcto para tu historial
  NextAction,
  ToolExecution,
  PerformanceMetrics,
} from '@shared/types';
import { ToolRegistry } from '@features/tools/ToolRegistry';
import { InternalEventDispatcher } from '../../core/events/InternalEventDispatcher'; // Importar el dispatcher
import { EventType } from '../events/eventTypes'; // Importar los tipos de eventos

export class WindsurfGraph {
  // No es necesario que sean privados si no hay métodos que los usen internamente
  // y solo se pasan en el constructor.
  // private modelManager: ModelManager;
  // private toolRegistry: ToolRegistry;
  // private promptManager: PromptManager;
  private dispatcher: InternalEventDispatcher;

  constructor(
    modelManager: ModelManager, // Los parámetros no usados directamente pueden omitirse si solo son para la firma
    toolRegistry: ToolRegistry,
    promptManager: PromptManager,
    dispatcher: InternalEventDispatcher // Recibir el dispatcher
  ) {
    // this.modelManager = modelManager;
    // this.toolRegistry = toolRegistry;
    // this.promptManager = promptManager;
    this.dispatcher = dispatcher; // Guardar el dispatcher

    console.log('[WindsurfGraph] Initialized with MOCKED implementation and Event Dispatcher.');
  }

  /**
   * Simulates the ReAct flow with timeouts and event emissions
   * @param initialState The initial state for the graph
   * @returns A promise that resolves with the final state
   */
  async run(initialState: WindsurfState): Promise<WindsurfState> {
    const chatId = initialState.chatId;
    console.log(`[WindsurfGraph:${chatId}] Starting mocked ReAct flow`);

    let state: WindsurfState = {
      ...initialState,
      iterationCount: 0,
      history: [...(initialState.history || [])], // Asegurar que history sea un array
      completionStatus: 'in_progress',
    };

    const addHistoryEntry = (
      phase: HistoryEntry['phase'],
      content: string,
      iteration: number,
      metadata?: Record<string, any>
    ): void => {
      state.history.push({
        id: `hist_${chatId}_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        content,
        sender: phase === 'user_input' ? 'user' : 'assistant', // O 'system'
        timestamp: Date.now(),
        phase,
        iteration,
        metadata: {
          success: true,
          ...metadata,
        },
      });
    };

    try {
      // --- Simulación del Análisis Inicial / Preparación ---
      state.iterationCount++;
      this.dispatcher.dispatch(EventType.NODE_START, { chatId, nodeType: 'InitialAnalysis' });
      
      // Estado inicial
      addHistoryEntry('system', 'Starting initial analysis...', state.iterationCount, { status: 'thinking' });
      await this.timeout(1000);
      
      // Estado de progreso
      addHistoryEntry('system', 'Analyzing project context...', state.iterationCount, { status: 'thinking' });
      await this.timeout(2000);
      
      // Estado de éxito
      state.projectContext = { name: 'MockProject', path: '/mock/path' };
      addHistoryEntry('system', 'Initial analysis completed successfully', state.iterationCount, { 
        status: 'success',
        result: state.projectContext
      });
      this.dispatcher.dispatch(EventType.NODE_COMPLETE, { chatId, nodeType: 'InitialAnalysis' });


      // --- Simulación Iteración 1: Razonamiento ---
      state.iterationCount++;
      this.dispatcher.dispatch(EventType.REASONING_STARTED, { 
        chatId, 
        phase: `Reasoning-${state.iterationCount}`,
        nodeType: 'Reasoning'
      });

      // Estado inicial
      addHistoryEntry('reasoning', 'Starting reasoning process...', state.iterationCount, { status: 'thinking' });
      await this.timeout(1500);

      // Estado de generación de plan
      addHistoryEntry('reasoning', 'Generating action plan...', state.iterationCount, { status: 'thinking' });
      await this.timeout(2000);

      // Generar plan
      const mockPlanStep1: PlanStep = {
        id: 'plan-step-1',
        step: '1. Use mockTool to get information.',
        rationale: 'This is the first step in our mocked plan.',
        status: 'pending',
      };
      const mockNextAction: NextAction = {
        toolName: 'mockTool',
        params: { query: 'mock query for step 1' },
        expectedOutcome: 'Get some mocked data.',
        requiredContext: ['projectContext']
      };

      // Estado de éxito
      state.reasoningResult = {
        reasoning: 'The agent decided to use mockTool based on the objective (mocked).',
        plan: [mockPlanStep1],
        nextAction: mockNextAction,
        metrics: { reasoningTime: 3500 } as PerformanceMetrics,
      };
      addHistoryEntry('reasoning', 'Action plan generated successfully', state.iterationCount, { 
        status: 'success',
        plan: state.reasoningResult.plan
      });
      this.dispatcher.dispatch(EventType.REASONING_COMPLETED, {
        chatId,
        phase: `Reasoning-${state.iterationCount}`,
        nodeType: 'Reasoning',
        result: { plan: state.reasoningResult.plan, nextAction: state.reasoningResult.nextAction },
        duration: 3500
      });

      // --- Simulación Iteración 1: Acción ---
      this.dispatcher.dispatch(EventType.TOOL_EXECUTION_STARTED, { 
        chatId,
        tool: mockNextAction.toolName,
        parameters: mockNextAction.params,
      });
      
      // Estado inicial
      addHistoryEntry('action', `Executing tool: ${mockNextAction.toolName}...`, state.iterationCount, { 
        status: 'thinking',
        tool: mockNextAction.toolName
      });
      await this.timeout(1500);

      // Estado de progreso
      addHistoryEntry('action', `Processing request with ${mockNextAction.toolName}...`, state.iterationCount, { 
        status: 'thinking',
        tool: mockNextAction.toolName
      });
      await this.timeout(2000);

      // Generar resultado
      const mockToolExecution: ToolExecution = {
        name: mockNextAction.toolName,
        status: 'completed',
        parameters: mockNextAction.params,
        result: { data: 'This is the mocked result from mockTool' },
        startTime: Date.now() - 3500,
        endTime: Date.now(),
      };
      state.actionResult = {
        toolName: mockNextAction.toolName,
        params: mockNextAction.params,
        success: true,
        result: mockToolExecution.result,
        timestamp: Date.now(),
        execution: mockToolExecution,
        metrics: { actionTime: 300 } as PerformanceMetrics,
      };
      mockPlanStep1.status = 'completed'; // Actualizar estado del plan
      mockPlanStep1.result = mockToolExecution.result;
      addHistoryEntry('action', `Action '${mockNextAction.toolName}' executed. Result: ${JSON.stringify(mockToolExecution.result)}`, state.iterationCount, { toolName: mockNextAction.toolName, result: mockToolExecution.result });
      this.dispatcher.dispatch(EventType.TOOL_EXECUTION_COMPLETED, { // O ACTION_COMPLETED
        chatId,
        tool: mockNextAction.toolName,
        parameters: mockNextAction.params,
        result: mockToolExecution.result,
        duration: 300,
        // iteration: state.iterationCount // Opcional
      });

      // --- Simulación Iteración 1: Reflexión ---
      this.dispatcher.dispatch(EventType.REFLECTION_STARTED, { 
        chatId, 
        phase: `Reflection-${state.iterationCount}`,
        nodeType: 'Reflection'
      });

      // Estado inicial
      addHistoryEntry('reflection', 'Starting reflection process...', state.iterationCount, { status: 'thinking' });
      await this.timeout(1500);

      // Estado de análisis
      addHistoryEntry('reflection', 'Analyzing results...', state.iterationCount, { status: 'thinking' });
      await this.timeout(2000);

      const mockInsight: Insight = {
        id: 'insight-1',
        type: 'observation',
        content: 'The mockTool executed successfully and provided the expected data.',
        timestamp: Date.now(),
      };
      state.reflectionResult = {
        reflection: 'The action was successful. The plan is proceeding as expected.',
        isSuccessful: true,
        confidence: 0.95,
        evaluationReasons: ['Tool executed correctly', 'Result matches expected outcome'],
        needsCorrection: false,
        insights: [mockInsight],
        metrics: { reflectionTime: 400 } as PerformanceMetrics,
      };
      addHistoryEntry('reflection', `Reflection complete. Confidence: ${state.reflectionResult.confidence}`, state.iterationCount, { reflection: state.reflectionResult.reflection });
      this.dispatcher.dispatch(EventType.REFLECTION_COMPLETED, {
        chatId,
        phase: `Reflection-${state.iterationCount}`,
        nodeType: 'Reflection',
        result: { reflection: state.reflectionResult.reflection, needsCorrection: state.reflectionResult.needsCorrection },
        duration: 400
      });

      // --- Simulación: Generación de Respuesta ---
      state.iterationCount++;
      
      // Estado inicial
      addHistoryEntry('system', 'Generating final response...', state.iterationCount, { status: 'thinking' });
      await this.timeout(1500);

      // Estado de formateo
      addHistoryEntry('system', 'Formatting response...', state.iterationCount, { status: 'thinking' });
      await this.timeout(2000);

      // Generar respuesta final
      const finalResponseMessage = "Mocked ReAct flow completed successfully. The mockTool provided: 'This is the mocked result from mockTool'.";

      // Simular que la herramienta 'respond' se ejecuta (o una lógica similar)
      // Esto es importante para que ApplicationLogicService pueda extraer la respuesta.
      const respondActionToolName = 'respond';
      this.dispatcher.dispatch(EventType.TOOL_EXECUTION_STARTED, { chatId, tool: respondActionToolName, parameters: { message: finalResponseMessage } });
      await this.timeout(1750);
      const respondToolExecution: ToolExecution = {
          name: respondActionToolName, status: 'completed',
          parameters: { message: finalResponseMessage }, result: { success: true, message: finalResponseMessage },
          startTime: Date.now() - 50, endTime: Date.now()
      };
      state.actionResult = { // Sobrescribir el actionResult con el de 'respond'
          toolName: respondActionToolName, params: { message: finalResponseMessage },
          success: true, result: { message: finalResponseMessage },
          timestamp: Date.now(), execution: respondToolExecution,
      };
      addHistoryEntry('action', `Final response generated: ${finalResponseMessage.substring(0,30)}...`, state.iterationCount, { toolName: respondActionToolName, message: finalResponseMessage });
      this.dispatcher.dispatch(EventType.TOOL_EXECUTION_COMPLETED, { chatId, tool: respondActionToolName, result: { message: finalResponseMessage }, duration: 50 });


      state.completionStatus = 'completed';
      this.dispatcher.dispatch(EventType.RESPONSE_GENERATED, { // Evento específico para la respuesta final
          chatId,
          response: finalResponseMessage,
          success: true,
          // duration: /* tiempo total o de generación de respuesta */
      });

      console.log(`[WindsurfGraph:${chatId}] Completed mocked ReAct flow successfully.`);

    } catch (error: any) {
      console.error(`[WindsurfGraph:${chatId}] Error in mocked ReAct flow:`, error);
      state.completionStatus = 'failed';
      state.error = error.message;
      addHistoryEntry('system', `Error in ReAct flow: ${error.message}`, state.iterationCount, { error: error.message });
      this.dispatcher.dispatch(EventType.NODE_ERROR, { // Evento genérico de error del nodo/grafo
        chatId,
        nodeType: 'ReActGraphExecution',
        error: error, // Pasar el objeto error completo
        // state: { completionStatus: state.completionStatus, error: state.error }
      });
       this.dispatcher.dispatch(EventType.ERROR_OCCURRED, { // Evento más general de error
        chatId,
        error: error.message,
        stack: error.stack,
        source: 'ReActGraph.Mock',
      });
    } finally {
        // Evento final del grafo, ya sea completado o fallido
        this.dispatcher.dispatch(state.completionStatus === 'completed' ? EventType.NODE_COMPLETE : EventType.NODE_ERROR, {
            chatId,
            nodeType: 'ReActGraphExecution',
            state: { completionStatus: state.completionStatus, error: state.error, finalResponse: state.actionResult?.toolName === 'respond' ? state.actionResult.result?.message : undefined },
            // duration: /* tiempo total del grafo */
        });
    }

    return state;
  }

  private timeout(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}