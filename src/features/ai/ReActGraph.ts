/* // src/features/ai/ReActGraph.ts

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
import { ToolRegistry } from '@features/tools/ToolRegistry'; // Now used
import { ToolResult } from '../tools/types'; // Added import for ToolResult
import { InternalEventDispatcher } from '../../core/events/InternalEventDispatcher';
import { EventType } from '../events/eventTypes';

export class WindsurfGraph {
  private dispatcher: InternalEventDispatcher;
  private toolRegistry: ToolRegistry; // Added

  constructor(
    modelManager: ModelManager, // No usado en este mock
    toolRegistry: ToolRegistry, // Now used
    promptManager: PromptManager, // No usado en este mock
    dispatcher: InternalEventDispatcher
  ) {
    this.dispatcher = dispatcher;
    this.toolRegistry = toolRegistry; // Added
    console.log('[WindsurfGraph] Initialized with MOCKED implementation, Event Dispatcher, and ToolRegistry.');
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

      // --- Simulación Iteración 2: Acción (getActiveEditorInfo) ---
      state.nextAction = {
        toolName: 'getActiveEditorInfo',
        toolParams: {}, // No params for getActiveEditorInfo
        reasoning: 'Decided to get active editor info to understand current context.',
      };
      addHistoryEntry('action_planning', `Selected action: ${state.nextAction.toolName}`, state.iterationCount, undefined, {
        tool_name: state.nextAction.toolName,
        tool_parameters: state.nextAction.toolParams
      });

      this.dispatcher.dispatch(EventType.TOOL_EXECUTION_STARTED, {
        chatId,
        toolName: state.nextAction.toolName,
        parameters: state.nextAction.toolParams,
        source: 'ToolRegistry', // Source is now ToolRegistry via ReActGraph
        uiOperationId: state.currentOperationId
      });
      addHistoryEntry('action', `Executing tool: ${state.nextAction.toolName}...`, state.iterationCount, undefined, {
        tool_executions: [{ name: state.nextAction.toolName, status: 'started', parameters: state.nextAction.toolParams }]
      });
      
      // Actual tool call
      const toolResult: ToolResult<any> = await this.toolRegistry.executeTool(
        state.nextAction.toolName,
        state.nextAction.toolParams,
        { chatId, uiOperationId: state.currentOperationId } // Pass chatId and uiOperationId
      );
      
      const toolExecutionEntry: ToolExecution = {
        name: state.nextAction.toolName,
        status: toolResult.success ? 'completed' : 'error',
        parameters: state.nextAction.toolParams,
        result: toolResult.success ? toolResult.data : { error: toolResult.error },
        startTime: Date.now() - (toolResult.executionTime || 0), // executionTime might be undefined if tool fails early
        endTime: Date.now(),
        duration: toolResult.executionTime || 0
      };

      if (toolResult.success) {
        this.dispatcher.dispatch(EventType.TOOL_EXECUTION_COMPLETED, {
          chatId,
          toolName: toolExecutionEntry.name,
          parameters: toolExecutionEntry.parameters,
          result: toolExecutionEntry.result,
          duration: toolExecutionEntry.duration,
          source: 'ToolRegistry',
          uiOperationId: state.currentOperationId
        });
      } else {
        this.dispatcher.dispatch(EventType.TOOL_EXECUTION_ERROR, {
          chatId,
          toolName: toolExecutionEntry.name,
          parameters: toolExecutionEntry.parameters,
          error: toolResult.error || 'Unknown tool error',
          duration: toolExecutionEntry.duration,
          source: 'ToolRegistry',
          uiOperationId: state.currentOperationId
        });
      }

      state.actionResult = {
        toolName: state.nextAction.toolName,
        params: state.nextAction.toolParams,
        success: toolResult.success,
        result: toolResult.data,
        error: toolResult.error,
        timestamp: Date.now(),
      };
      addHistoryEntry('action', `Tool ${state.nextAction.toolName} executed. Result: ${toolResult.success ? 'Success' : 'Failure'}`, state.iterationCount, toolResult.success ? 'success' : 'error', {
        tool_executions: [toolExecutionEntry],
        action_result_summary: toolResult.success && toolResult.data ? `Active editor info retrieved. Path: ${(toolResult.data as any).filePath}` : `Failed to get active editor info: ${toolResult.error}`
      });

      // --- Simulación Fase Final: Generar Respuesta ---
      // En esta fase, se construye la respuesta final basada en el historial y los resultados.
      // El evento RESPONSE_GENERATED se encargará de notificar a la UI.

      const finalResponsePhaseIteration = state.iterationCount + 1; 
      addHistoryEntry('responseGeneration', 'Formulating final response...', finalResponsePhaseIteration);
      await this.timeout(100);

      // Construct the final response message
      let finalResponseMessage = `## Mocked Solution (Iteration ${state.iterationCount})\n\nBased on the analysis and tool executions, here's a summary:\n- Initial context: ${JSON.stringify(state.projectContext || {})}\n`;
      if (state.actionResult) {
        finalResponseMessage += `- Action taken: ${state.actionResult.toolName}\n`;
        finalResponseMessage += `- Action result: ${state.actionResult.success ? 'Successful' : 'Failed'}\n`;
        if (state.actionResult.success && state.actionResult.result) {
          const resultString = JSON.stringify(state.actionResult.result);
          finalResponseMessage += `- Tool Output: ${resultString.substring(0, 200)}${resultString.length > 200 ? '...' : ''}\n`;
        } else if (state.actionResult.error) {
          finalResponseMessage += `- Tool Error: ${state.actionResult.error}\n`;
        }
      }
      finalResponseMessage += `- Observation: ${state.observation?.summary || 'N/A'}\n\nThis is a **mocked response** from WindsurfGraph, now using a real tool.`;
      
      state.finalOutput = finalResponseMessage; // Guardar la respuesta final en el estado

      addHistoryEntry('responseGeneration', `Final response formulated.`, finalResponsePhaseIteration, 'success', {
        final_response_preview: finalResponseMessage.substring(0, 100) + "..."
      });

      // El evento RESPONSE_GENERATED es el mecanismo para la respuesta final al usuario.
      // Lo emite el ReActGraph cuando considera que tiene la respuesta final.
      // El 'duration' aquí podría ser el tiempo que tomó esta fase de "formulación".
      const responseFormulationDuration = 100; // El timeout usado arriba
      this.dispatcher.dispatch(EventType.RESPONSE_GENERATED, {
        chatId,
        responseContent: finalResponseMessage,
        isFinal: true,
        duration: responseFormulationDuration, 
        source: 'ReActGraph.Mock'
        // operationId: state.currentOperationId // Temporarily removed to fix lint. Consider adding to EventType.RESPONSE_GENERATED payload later.
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
    // En entorno real, usar el timeout solicitado. Solo acelerar en test.
    return new Promise(resolve => setTimeout(resolve, process.env.NODE_ENV === 'test' ? ms / 100 : ms));
  }
} */