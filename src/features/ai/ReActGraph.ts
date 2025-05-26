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
  HistoryEntry, 
  NextAction,
  ToolExecution,
  PerformanceMetrics,
} from '@shared/types';
import { ToolRegistry } from '@features/tools/ToolRegistry';
import { InternalEventDispatcher } from '../../core/events/InternalEventDispatcher'; 
import { EventType } from '../events/eventTypes'; 

export class WindsurfGraph {
  private dispatcher: InternalEventDispatcher;

  constructor(
    modelManager: ModelManager, 
    toolRegistry: ToolRegistry,
    promptManager: PromptManager,
    dispatcher: InternalEventDispatcher 
  ) {
    this.dispatcher = dispatcher; 

    console.log('[WindsurfGraph] Initialized with MOCKED implementation and Event Dispatcher.');
  }

  async run(initialState: WindsurfState): Promise<WindsurfState> {
    const chatId = initialState.chatId;
    console.log(`[WindsurfGraph:${chatId}] Starting mocked ReAct flow`);

    let state: WindsurfState = {
      ...initialState,
      iterationCount: 0,
      history: [...(initialState.history || [])], 
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
        sender: phase === 'user_input' ? 'user' : 'assistant', 
        timestamp: Date.now(),
        phase,
        iteration,
        metadata: {
          success: true,
          status: 'info', // Default status for history entries
          ...metadata,
        },
      });
    };

    try {
      // --- Simulación del Análisis Inicial / Preparación ---
      state.iterationCount++;
      this.dispatcher.dispatch(EventType.NODE_START, { chatId, nodeType: 'InitialAnalysis' });
      
      addHistoryEntry('system', 'Starting initial analysis...', state.iterationCount, { status: 'thinking' });
      await this.timeout(100); // Reducido para acelerar el mock
      
      addHistoryEntry('system', 'Analyzing project context...', state.iterationCount, { status: 'thinking' });
      await this.timeout(200); // Reducido
      
      state.projectContext = { name: 'MockProject', path: '/mock/path' };
      addHistoryEntry('system', 'Initial analysis completed successfully', state.iterationCount, { 
        status: 'success',
        result: state.projectContext
      });
      this.dispatcher.dispatch(EventType.NODE_COMPLETE, { chatId, nodeType: 'InitialAnalysis', duration: 300 });


      // --- Simulación Iteración 1: Razonamiento ---
      state.iterationCount++;
      this.dispatcher.dispatch(EventType.REASONING_STARTED, { 
        chatId, 
        phase: `Reasoning-${state.iterationCount}`,
        nodeType: 'Reasoning'
      });

      addHistoryEntry('reasoning', 'Starting reasoning process...', state.iterationCount, { status: 'thinking' });
      await this.timeout(150); // Reducido

      addHistoryEntry('reasoning', 'Generating action plan...', state.iterationCount, { status: 'thinking' });
      await this.timeout(200); // Reducido

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

      state.reasoningResult = {
        reasoning: 'The agent decided to use mockTool based on the objective (mocked).',
        plan: [mockPlanStep1],
        nextAction: mockNextAction,
        metrics: { reasoningTime: 350 } as PerformanceMetrics,
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
        duration: 350
      });

      // --- Simulación Iteración 1: Acción (mockTool) ---
      this.dispatcher.dispatch(EventType.TOOL_EXECUTION_STARTED, { 
        chatId,
        toolName: mockNextAction.toolName,
        parameters: mockNextAction.params,
      });
      
      addHistoryEntry('action', `Executing tool: ${mockNextAction.toolName}...`, state.iterationCount, { 
        status: 'tool_executing', // Cambiado a 'tool_executing' para consistencia con UI
        tool: mockNextAction.toolName
      });
      await this.timeout(150); // Reducido

      // No es necesario un segundo 'thinking' para la misma herramienta si es una simulación rápida
      // addHistoryEntry('action', `Processing request with ${mockNextAction.toolName}...`, state.iterationCount, { 
      //   status: 'tool_executing', 
      //   tool: mockNextAction.toolName
      // });
      // await this.timeout(200); // Reducido

      const mockToolExecution: ToolExecution = {
        name: mockNextAction.toolName,
        status: 'completed',
        parameters: mockNextAction.params,
        result: { data: 'This is the mocked result from mockTool' },
        startTime: Date.now() - 150, // Ajustar al timeout
        endTime: Date.now(),
      };
      state.actionResult = {
        toolName: mockNextAction.toolName,
        params: mockNextAction.params,
        success: true,
        result: mockToolExecution.result,
        timestamp: Date.now(),
        execution: mockToolExecution,
        metrics: { actionTime: 150 } as PerformanceMetrics,
      };
      mockPlanStep1.status = 'completed'; 
      mockPlanStep1.result = mockToolExecution.result;
      addHistoryEntry('action', `Action '${mockNextAction.toolName}' executed. Result: ${JSON.stringify(mockToolExecution.result)}`, state.iterationCount, { 
          toolName: mockNextAction.toolName, 
          result: mockToolExecution.result,
          status: 'success' 
      });
      this.dispatcher.dispatch(EventType.TOOL_EXECUTION_COMPLETED, { 
        chatId,
        toolName: mockNextAction.toolName,
        parameters: mockNextAction.params,
        result: mockToolExecution.result,
        duration: 150, // Ajustar al timeout
      });

      // --- Simulación Iteración 1: Reflexión ---
      this.dispatcher.dispatch(EventType.REFLECTION_STARTED, { 
        chatId, 
        phase: `Reflection-${state.iterationCount}`,
        nodeType: 'Reflection'
      });

      addHistoryEntry('reflection', 'Starting reflection process...', state.iterationCount, { status: 'thinking' });
      await this.timeout(150); // Reducido

      addHistoryEntry('reflection', 'Analyzing results...', state.iterationCount, { status: 'thinking' });
      await this.timeout(200); // Reducido

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
        metrics: { reflectionTime: 350 } as PerformanceMetrics, // Suma de timeouts
      };
      addHistoryEntry('reflection', `Reflection complete. Confidence: ${state.reflectionResult.confidence}`, state.iterationCount, { 
          reflection: state.reflectionResult.reflection,
          status: 'success'
      });
      this.dispatcher.dispatch(EventType.REFLECTION_COMPLETED, {
        chatId,
        phase: `Reflection-${state.iterationCount}`,
        nodeType: 'Reflection',
        result: { reflection: state.reflectionResult.reflection, needsCorrection: state.reflectionResult.needsCorrection },
        duration: 350 // Suma de timeouts
      });

      // --- Simulación: Generación de Respuesta (respond tool) ---
      state.iterationCount++; // Nueva iteración para la respuesta final si se considera un paso separado
      
      const respondActionToolName = 'respond';
      const finalResponseMessage = `## Mocked Solution

He analizado (mock) y esta es la respuesta:

\`\`\`javascript
// Mocked code snippet
function hello() { console.log("World!"); }
\`\`\`

Esto es un ejemplo de respuesta mockeada.`;

      this.dispatcher.dispatch(EventType.TOOL_EXECUTION_STARTED, { 
          chatId, 
          toolName: respondActionToolName, 
          parameters: { message: finalResponseMessage.substring(0, 50) + "..." } // Log params resumidos
      });
      addHistoryEntry('action', `Generating final response with ${respondActionToolName}...`, state.iterationCount, { 
          status: 'tool_executing', 
          toolName: respondActionToolName 
      });
      await this.timeout(170); // Reducido

      const respondToolExecution: ToolExecution = {
          name: respondActionToolName, status: 'completed',
          parameters: { message: finalResponseMessage }, result: { success: true, message: finalResponseMessage },
          startTime: Date.now() - 170, endTime: Date.now()
      };
      // Esto es crucial: ApplicationLogicService usa actionResult.result.message para el finalResponse
      state.actionResult = { 
          toolName: respondActionToolName, params: { message: finalResponseMessage },
          success: true, result: { message: finalResponseMessage }, // Asegurar que el mensaje esté aquí
          timestamp: Date.now(), execution: respondToolExecution,
      };
      addHistoryEntry('action', `Final response generated via ${respondActionToolName}.`, state.iterationCount, { 
          toolName: respondActionToolName, 
          // message: finalResponseMessage.substring(0,30)+"...", // No es necesario duplicar el mensaje completo en historial
          status: 'success'
      });
      this.dispatcher.dispatch(EventType.TOOL_EXECUTION_COMPLETED, { 
          chatId, 
          toolName: respondActionToolName, 
          parameters: { message: finalResponseMessage.substring(0,50) + "..." },
          result: { success: true, messageDelivered: true }, // El resultado de 'respond' es más sobre la entrega
          duration: 170 
      });

      // RESPONSE_GENERATED es un evento adicional, puede ser útil para logging específico de respuestas.
      // El flujo de UI se basará en TOOL_EXECUTION_COMPLETED para 'respond' y el finalResponse de AppLogicService.
      this.dispatcher.dispatch(EventType.RESPONSE_GENERATED, { 
          chatId,
          responseContent: finalResponseMessage,
          isFinal: true,
          duration: 170 
      });

      state.completionStatus = 'completed';
      console.log(`[WindsurfGraph:${chatId}] Completed mocked ReAct flow successfully.`);

    } catch (error: any) {
      console.error(`[WindsurfGraph:${chatId}] Error in mocked ReAct flow:`, error);
      state.completionStatus = 'failed';
      state.error = error.message;
      addHistoryEntry('system', `Error in ReAct flow: ${error.message}`, state.iterationCount, { error: error.message, status: 'error' });
      
      // Si el error ocurre durante una ejecución de herramienta, se debería haber emitido TOOL_EXECUTION_ERROR
      // Este es un error más general del grafo.
      this.dispatcher.dispatch(EventType.NODE_ERROR, { 
        chatId,
        nodeType: 'ReActGraphExecution',
        error: error.message
      });
       this.dispatcher.dispatch(EventType.ERROR_OCCURRED, { 
        chatId,
        errorMessage: error.message,
        errorStack: error.stack,
        source: 'ReActGraph.Mock'
      });
    } finally {
        this.dispatcher.dispatch(state.completionStatus === 'completed' ? EventType.NODE_COMPLETE : EventType.NODE_ERROR, {
            chatId,
            nodeType: 'ReActGraphExecution',
            error: state.error,
            output: (state.actionResult?.toolName === 'respond' && state.actionResult.success) ? state.actionResult.result?.message : undefined
            // duration: /* calcular tiempo total del grafo */
        });
    }

    return state;
  }

  private timeout(ms: number): Promise<void> {
    // Reducir todos los timeouts para acelerar las pruebas de flujo
    return new Promise(resolve => setTimeout(resolve, ms / 10)); // Dividido por 10 para acelerar
  }
}