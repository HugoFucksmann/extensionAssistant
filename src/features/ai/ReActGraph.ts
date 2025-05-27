// src/features/ai/ReActGraph.ts

import { ModelManager } from './ModelManager'; // No se usa en el mock, pero se mantiene para la estructura
import { PromptManager } from './promptManager'; // No se usa en el mock, pero se mantiene
import {
  ActionResult,
  Insight,
  PlanStep,
  // ReasoningResult, // No se usa directamente en el mock de esta forma
  // ReflectionResult, // No se usa directamente en el mock de esta forma
  WindsurfState,
  HistoryEntry,
  NextAction,
  ToolExecution,
  PerformanceMetrics,
} from '@shared/types';
import { ToolRegistry } from '@features/tools/ToolRegistry'; // No se usa en el mock, pero se mantiene
import { InternalEventDispatcher } from '../../core/events/InternalEventDispatcher';
import { EventType } from '../events/eventTypes';

export class WindsurfGraph {
  private dispatcher: InternalEventDispatcher;

  constructor(
    modelManager: ModelManager, // No usado en este mock
    toolRegistry: ToolRegistry, // No usado en este mock
    promptManager: PromptManager, // No usado en este mock
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
      // Permitir que el status sea opcional o uno de los tipos válidos para HistoryEntry.metadata.status
      metadataStatus?: HistoryEntry['metadata']['status'],
      additionalMetadata?: Omit<HistoryEntry['metadata'], 'status'>
    ): void => {
      state.history.push({
        // id y sender no son parte de HistoryEntry según la definición actual
        content,
        timestamp: Date.now(),
        phase,
        iteration,
        metadata: {
          status: metadataStatus, // Puede ser undefined si no se provee
          ...additionalMetadata,
        },
      });
    };

    try {
      // --- Simulación del Análisis Inicial / Preparación ---
      state.iterationCount = 0; // Iteración 0 para pasos preparatorios
      this.dispatcher.dispatch(EventType.NODE_START, { chatId, nodeType: 'InitialAnalysis', source: 'ReActGraph.Mock' });
      
      addHistoryEntry('system_message', 'Starting initial analysis...', state.iterationCount);
      await this.timeout(100);
      
      addHistoryEntry('system_message', 'Analyzing project context...', state.iterationCount);
      await this.timeout(200);
      
      state.projectContext = { name: 'MockProject', path: '/mock/path' }; // Simular obtención de contexto
      addHistoryEntry('system_message', 'Initial analysis completed successfully.', state.iterationCount, 'success', {
        project_context_summary: state.projectContext // Ejemplo de metadato adicional
      });
      this.dispatcher.dispatch(EventType.NODE_COMPLETE, { chatId, nodeType: 'InitialAnalysis', duration: 300, source: 'ReActGraph.Mock' });


      // --- Simulación Iteración 1: Razonamiento ---
      state.iterationCount++; // Ahora es la iteración 1 del ciclo ReAct
      this.dispatcher.dispatch(EventType.REASONING_STARTED, {
        chatId,
        phase: `Reasoning-${state.iterationCount}`, // Usar phase para el nombre del paso/nodo
        nodeType: 'ReasoningNode', // Usar nodeType para el tipo de nodo en el grafo
        source: 'ReActGraph.Mock'
      });

      addHistoryEntry('reasoning', 'Starting reasoning process...', state.iterationCount);
      await this.timeout(150);

      addHistoryEntry('reasoning', 'Generating action plan...', state.iterationCount);
      await this.timeout(200);

      // Paso 1: Obtener resumen del proyecto (herramienta sin parámetros)
const mockPlanStep1: PlanStep = {
        id: 'plan-step-1',
        stepDescription: '1. Use getProjectSummary to get project information.',
        toolToUse: 'getProjectSummary',
        expectedOutcome: 'Get project structure and context.',
        status: 'pending',
      };
      const mockNextAction: NextAction = {
        toolName: 'getProjectSummary',
        params: {}, // Sin parámetros
        thought: 'Need to understand the project structure before proceeding.',
      };

      state.reasoningResult = { // Este campo podría no ser necesario si la info va al historial
        reasoning: 'The agent decided to use mockTool based on the objective (mocked).',
        plan: [mockPlanStep1],
        nextAction: mockNextAction,
        metrics: { reasoningTime: 350 } as PerformanceMetrics,
      };
      addHistoryEntry('reasoning', `Action plan generated. Next action: ${mockNextAction.toolName}`, state.iterationCount, 'success', {
        plan: state.reasoningResult.plan,
        next_action: state.reasoningResult.nextAction
      });
      this.dispatcher.dispatch(EventType.REASONING_COMPLETED, {
        chatId,
        phase: `Reasoning-${state.iterationCount}`,
        nodeType: 'ReasoningNode',
        output: { plan: state.reasoningResult.plan, nextAction: state.reasoningResult.nextAction }, // Usar 'output' para el resultado del nodo
        duration: 350,
        source: 'ReActGraph.Mock'
      });

      // --- Simulación Iteración 1: Acción (mockTool) ---
      // El evento TOOL_EXECUTION_STARTED lo emite ToolRegistry.
      // Aquí podríamos emitir un evento ACTION_STARTED si es una abstracción diferente.
      this.dispatcher.dispatch(EventType.ACTION_STARTED, { // O NODE_START para un 'ActionNode'
          chatId,
          phase: `Action-${mockNextAction.toolName}-${state.iterationCount}`,
          nodeType: 'ActionNode',
          input: { toolName: mockNextAction.toolName, params: mockNextAction.params },
          source: 'ReActGraph.Mock'
      });
      
      // Simular la llamada a ToolRegistry.executeTool
      // En un caso real, esto sería:
      // const toolResult = await this.toolRegistry.executeTool(mockNextAction.toolName, mockNextAction.params, { chatId });
      // Aquí simulamos el resultado que ToolRegistry devolvería y los eventos que emitiría.

      // Evento que ToolRegistry emitiría:
      this.dispatcher.dispatch(EventType.TOOL_EXECUTION_STARTED, {
        chatId,
        toolName: mockNextAction.toolName,
        parameters: mockNextAction.params,
        source: 'ToolRegistry' // Simulando que viene del ToolRegistry
      });
      addHistoryEntry('action', `Executing tool: ${mockNextAction.toolName}...`, state.iterationCount, undefined, {
        tool_executions: [{ name: mockNextAction.toolName, status: 'started', parameters: mockNextAction.params }]
      });
      await this.timeout(150); // Simulación de ejecución

      const mockToolExecutionResult: ToolExecution = { // Esto sería parte del payload del evento TOOL_EXECUTION_COMPLETED
        name: mockNextAction.toolName,
        status: 'completed',
        parameters: mockNextAction.params,
        result: { 
          projectName: 'extensionAssistant',
          rootPath: '/path/to/project',
          fileCount: 42,
          directoryStructure: {
            src: ['core', 'features', 'shared', 'vscode'],
            'package.json': null,
            'tsconfig.json': null
          },
          mainLanguages: ['TypeScript', 'JavaScript', 'JSON']
        },
        startTime: Date.now() - 150,
        endTime: Date.now(),
        duration: 150,
      };
      // Evento que ToolRegistry emitiría:
      this.dispatcher.dispatch(EventType.TOOL_EXECUTION_COMPLETED, {
        chatId,
        toolName: mockToolExecutionResult.name,
        parameters: mockToolExecutionResult.parameters,
        result: mockToolExecutionResult.result,
        duration: mockToolExecutionResult.duration,
        source: 'ToolRegistry'
      });

      state.actionResult = { // El estado del grafo se actualiza con el resultado de la acción
        toolName: mockNextAction.toolName,
        params: mockNextAction.params,
        success: true,
        result: mockToolExecutionResult.result, // El `data` de la herramienta
        timestamp: Date.now(),
        metrics: { actionTime: 150 } as PerformanceMetrics,
      };
      mockPlanStep1.status = 'completed';
      mockPlanStep1.resultSummary = JSON.stringify(mockToolExecutionResult.result);

      addHistoryEntry('action', `Tool '${mockNextAction.toolName}' executed.`, state.iterationCount, 'success', {
        tool_executions: [mockToolExecutionResult], // Guardar la ejecución completa
        action_result_summary: state.actionResult.result
      });
      this.dispatcher.dispatch(EventType.ACTION_COMPLETED, { // O NODE_COMPLETE para 'ActionNode'
        chatId,
        phase: `Action-${mockNextAction.toolName}-${state.iterationCount}`,
        nodeType: 'ActionNode',
        output: state.actionResult,
        duration: 150,
        source: 'ReActGraph.Mock'
      });

      // --- Simulación Iteración 1: Reflexión ---
      this.dispatcher.dispatch(EventType.REFLECTION_STARTED, {
        chatId,
        phase: `Reflection-${state.iterationCount}`,
        nodeType: 'ReflectionNode',
        source: 'ReActGraph.Mock'
      });

      addHistoryEntry('reflection', 'Starting reflection process...', state.iterationCount);
      await this.timeout(150);
      addHistoryEntry('reflection', 'Analyzing results of mockTool...', state.iterationCount);
      await this.timeout(200);

      // const mockInsight: Insight = { ... }; // Insight no está en WindsurfState.ReflectionResult
      state.reflectionResult = {
        reflection: 'The action was successful. The plan is proceeding as expected.',
        isSuccessfulSoFar: true,
        confidence: 0.95,
        needsCorrection: false,
        metrics: { reflectionTime: 350 } as PerformanceMetrics,
      };
      addHistoryEntry('reflection', `Reflection complete. Confidence: ${state.reflectionResult.confidence}`, state.iterationCount, 'success', {
        reflection_summary: state.reflectionResult.reflection,
        needs_correction: state.reflectionResult.needsCorrection
      });
      this.dispatcher.dispatch(EventType.REFLECTION_COMPLETED, {
        chatId,
        phase: `Reflection-${state.iterationCount}`,
        nodeType: 'ReflectionNode',
        output: { reflection: state.reflectionResult.reflection, needsCorrection: state.reflectionResult.needsCorrection },
        duration: 350,
        source: 'ReActGraph.Mock'
      });

      // --- Simulación Iteración 2: Razonamiento ---
      state.iterationCount++; // Ahora es la iteración 2 del ciclo ReAct
      this.dispatcher.dispatch(EventType.REASONING_STARTED, {
        chatId,
        phase: `Reasoning-${state.iterationCount}`,
        nodeType: 'ReasoningNode',
        source: 'ReActGraph.Mock'
      });

      addHistoryEntry('reasoning', 'Starting second reasoning process...', state.iterationCount);
      await this.timeout(150);

      // Planificar el uso de otra herramienta sin parámetros
      const mockPlanStep2: PlanStep = {
        id: 'plan-step-2',
        stepDescription: '2. Use getOpenEditors to see what files the user is working on.',
        toolToUse: 'getOpenEditors',
        expectedOutcome: 'Get list of currently open editors.',
        status: 'pending',
      };
      const mockNextAction2: NextAction = {
        toolName: 'getOpenEditors',
        params: {}, // Sin parámetros
        thought: 'Need to check what files the user is currently working on.',
      };

      state.reasoningResult = {
        reasoning: 'After analyzing the project structure, we need to see what files the user is currently working with.',
        plan: [mockPlanStep2],
        nextAction: mockNextAction2,
        metrics: { reasoningTime: 300 } as PerformanceMetrics,
      };
      
      addHistoryEntry('reasoning', `Second action plan generated. Next action: ${mockNextAction2.toolName}`, state.iterationCount, 'success', {
        plan: state.reasoningResult.plan,
        next_action: state.reasoningResult.nextAction
      });
      
      this.dispatcher.dispatch(EventType.REASONING_COMPLETED, {
        chatId,
        phase: `Reasoning-${state.iterationCount}`,
        nodeType: 'ReasoningNode',
        output: { plan: state.reasoningResult.plan, nextAction: state.reasoningResult.nextAction },
        duration: 300,
        source: 'ReActGraph.Mock'
      });

      // --- Simulación Iteración 2: Acción (getOpenEditors) ---
      this.dispatcher.dispatch(EventType.ACTION_STARTED, {
        chatId,
        phase: `Action-${mockNextAction2.toolName}-${state.iterationCount}`,
        nodeType: 'ActionNode',
        input: { toolName: mockNextAction2.toolName, params: mockNextAction2.params },
        source: 'ReActGraph.Mock'
      });
      
      this.dispatcher.dispatch(EventType.TOOL_EXECUTION_STARTED, {
        chatId,
        toolName: mockNextAction2.toolName,
        parameters: mockNextAction2.params,
        source: 'ToolRegistry'
      });
      
      addHistoryEntry('action', `Executing tool: ${mockNextAction2.toolName}...`, state.iterationCount, undefined, {
        tool_executions: [{ name: mockNextAction2.toolName, status: 'started', parameters: {} }]
      });
      
      await this.timeout(120);

      const mockToolExecutionResult2: ToolExecution = {
        name: mockNextAction2.toolName,
        status: 'completed',
        parameters: mockNextAction2.params,
        result: [
          { fileName: 'ReActGraph.ts', path: 'src/features/ai/ReActGraph.ts', language: 'typescript', isActive: true },
          { fileName: 'ConversationManager.ts', path: 'src/core/ConversationManager.ts', language: 'typescript', isActive: false },
          { fileName: 'ComponentFactory.ts', path: 'src/core/ComponentFactory.ts', language: 'typescript', isActive: false }
        ],
        startTime: Date.now() - 120,
        endTime: Date.now(),
        duration: 120,
      };
      
      this.dispatcher.dispatch(EventType.TOOL_EXECUTION_COMPLETED, {
        chatId,
        toolName: mockToolExecutionResult2.name,
        parameters: mockToolExecutionResult2.parameters,
        result: mockToolExecutionResult2.result,
        duration: mockToolExecutionResult2.duration,
        source: 'ToolRegistry'
      });

      state.actionResult = {
        toolName: mockNextAction2.toolName,
        params: mockNextAction2.params,
        success: true,
        result: mockToolExecutionResult2.result,
        timestamp: Date.now(),
        metrics: { actionTime: 120 } as PerformanceMetrics,
      };
      
      mockPlanStep2.status = 'completed';
      mockPlanStep2.resultSummary = JSON.stringify(mockToolExecutionResult2.result);

      addHistoryEntry('action', `Tool '${mockNextAction2.toolName}' executed.`, state.iterationCount, 'success', {
        tool_executions: [mockToolExecutionResult2],
        action_result_summary: state.actionResult.result
      });
      
      this.dispatcher.dispatch(EventType.ACTION_COMPLETED, {
        chatId,
        phase: `Action-${mockNextAction2.toolName}-${state.iterationCount}`,
        nodeType: 'ActionNode',
        output: state.actionResult,
        duration: 120,
        source: 'ReActGraph.Mock'
      });

      // --- Simulación: Generación de Respuesta (usando una herramienta 'sendResponseToUser' o similar) ---
      // Asumimos que la reflexión indica que la tarea está completa y se debe generar una respuesta.
      // Esto podría ser otra acción decidida por un paso de razonamiento.
      // Por simplicidad, lo hacemos directamente aquí.

      const finalResponsePhaseIteration = state.iterationCount; // Puede ser la misma iteración o una nueva
      const respondActionToolName = 'sendResponseToUser'; // Usar la herramienta real
      const finalResponseMessage = `## Mocked Solution\n\nHe analizado (mock) y esta es la respuesta:\n\n\`\`\`javascript\n// Mocked code snippet\nfunction hello() { console.log("World!"); }\n\`\`\`\n\nEsto es un ejemplo de respuesta mockeada.`;

      // Simular la llamada a ToolRegistry.executeTool para 'sendResponseToUser'
      this.dispatcher.dispatch(EventType.TOOL_EXECUTION_STARTED, {
        chatId,
        toolName: respondActionToolName,
        parameters: { message: finalResponseMessage }, // Parámetro real de sendResponseToUser
        source: 'ToolRegistry'
      });
      addHistoryEntry('responseGeneration', `Generating final response with ${respondActionToolName}...`, finalResponsePhaseIteration, undefined, {
        tool_executions: [{ name: respondActionToolName, status: 'started', parameters: { message: "..." } }]
      });
      await this.timeout(170);

      const respondToolExecutionResult: ToolExecution = {
        name: respondActionToolName, status: 'completed',
        parameters: { message: finalResponseMessage },
        result: { messageSentToChat: true, notificationShown: false, contentPreview: "## Mocked Solution..." }, // Resultado de sendResponseToUser
        startTime: Date.now() - 170, endTime: Date.now(), duration: 170
      };
      this.dispatcher.dispatch(EventType.TOOL_EXECUTION_COMPLETED, {
        chatId,
        toolName: respondToolExecutionResult.name,
        parameters: respondToolExecutionResult.parameters,
        result: respondToolExecutionResult.result,
        duration: respondToolExecutionResult.duration,
        source: 'ToolRegistry'
      });

      // Actualizar el estado del grafo. El `actionResult` es importante si ApplicationLogicService lo usa.
      state.actionResult = { // Este actionResult es el de la última acción (sendResponseToUser)
        toolName: respondActionToolName, params: { message: finalResponseMessage },
        success: true, result: respondToolExecutionResult.result,
        timestamp: Date.now(),
      };
      state.finalOutput = finalResponseMessage; // Guardar la respuesta final en el estado

      addHistoryEntry('responseGeneration', `Final response sent via ${respondActionToolName}.`, finalResponsePhaseIteration, 'success', {
        tool_executions: [respondToolExecutionResult],
        final_response_preview: finalResponseMessage.substring(0, 50) + "..."
      });

      // El evento RESPONSE_GENERATED es más semántico para la respuesta final al usuario.
      // Lo emite el ReActGraph cuando considera que tiene la respuesta final.
      this.dispatcher.dispatch(EventType.RESPONSE_GENERATED, {
        chatId,
        responseContent: finalResponseMessage,
        isFinal: true,
        duration: 170, // Tiempo que tomó generar/enviar esta respuesta específica
        source: 'ReActGraph.Mock'
      });

      state.completionStatus = 'completed';
      console.log(`[WindsurfGraph:${chatId}] Completed mocked ReAct flow successfully.`);

    } catch (error: any) {
      console.error(`[WindsurfGraph:${chatId}] Error in mocked ReAct flow:`, error);
      state.completionStatus = 'failed';
      state.error = error.message;
      addHistoryEntry('system_message', `Error in ReAct flow: ${error.message}`, state.iterationCount, 'error', { error_message: error.message });

      this.dispatcher.dispatch(EventType.ERROR_OCCURRED, {
        chatId,
        errorMessage: error.message,
        errorStack: error.stack,
        source: 'ReActGraph.Mock',
        details: { phase: `ReActGraphExecution-Iteration${state.iterationCount}` }
      });
    } finally {
      const totalGraphDuration = Date.now() - (state.history[0]?.timestamp || Date.now());
      this.dispatcher.dispatch(state.completionStatus === 'completed' ? EventType.CONVERSATION_ENDED : EventType.ERROR_OCCURRED, { // Usar CONVERSATION_ENDED
        chatId,
        // nodeType: 'ReActGraphExecution', // No es un nodo, es el fin de la conversación
        finalStatus: state.completionStatus === 'completed' ? 'completed' : (state.error ? 'failed' : 'cancelled'),
        duration: totalGraphDuration,
        // Para ERROR_OCCURRED
        errorMessage: state.error,
        // Para CONVERSATION_ENDED
        // stateSummary: { finalOutput: state.finalOutput, historyLength: state.history.length },
        source: 'ReActGraph.Mock'
      });
    }

    return state;
  }

  private timeout(ms: number): Promise<void> {
    // Reducir todos los timeouts para acelerar las pruebas de flujo
    // En un entorno real, esto no se dividiría.
    return new Promise(resolve => setTimeout(resolve, ms / (process.env.NODE_ENV === 'test' ? 100 : 10)));
  }
}