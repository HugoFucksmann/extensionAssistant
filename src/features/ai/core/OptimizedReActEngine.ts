// src/core/OptimizedReActEngine.ts

// HistoryEntry is not directly used here anymore, but might be in helpers
// import { HistoryEntry } from '../features/chat/types';
import { ToolRegistry } from '../../tools/ToolRegistry';
import { InternalEventDispatcher } from '../../../core/events/InternalEventDispatcher';

import { ModelManager } from '../ModelManager';
import { MemoryManager } from '../../memory/MemoryManager';
import { getConfig } from '../../../shared/config';

// Helper imports
import { ToolDescriptionHelper } from '../helpers/ToolDescriptionHelper';
import { HistoryHelper } from '../helpers/HistoryHelper';
import { MemoryContextHelper } from '../helpers/MemoryContextHelper';
import { EventDispatchHelper } from '../helpers/EventDispatchHelper';
import { ReActIterationEngine, SingleIterationResult } from '../helpers/ReActIterationEngine';
import { DeduplicationHelper } from '../helpers/DeduplicationHelper';
import { ToolResult as InternalToolResult } from '../../tools/types';
import { WindsurfState } from '@core/types';
import { EventType, ResponseEventPayload } from '@features/events/eventTypes';
import { AnalysisOutput } from '../prompts/optimized/analysisPrompt';


const reactConfig = getConfig(process.env.NODE_ENV === 'production' ? 'production' : 'development').backend.react;

export class OptimizedReActEngine {
    private readonly MAX_ITERATIONS: number;
    private toolDescriptionHelper: ToolDescriptionHelper;
    private historyHelper: HistoryHelper;
    private memoryContextHelper: MemoryContextHelper;
    private eventDispatchHelper: EventDispatchHelper;
    private iterationEngine: ReActIterationEngine;
    private deduplicationHelper: DeduplicationHelper;

    constructor(
        private modelManager: ModelManager,
        private toolRegistry: ToolRegistry,
        private dispatcher: InternalEventDispatcher,
        private memoryManager: MemoryManager
    ) {
        this.dispatcher.systemInfo('OptimizedReActEngine initialized.', { source: 'OptimizedReActEngine' }, 'OptimizedReActEngine');
        this.MAX_ITERATIONS = reactConfig.maxIterations;

        this.toolDescriptionHelper = new ToolDescriptionHelper(toolRegistry);
        this.historyHelper = new HistoryHelper();
        this.memoryContextHelper = new MemoryContextHelper(memoryManager);
        this.eventDispatchHelper = new EventDispatchHelper(dispatcher);
        this.deduplicationHelper = new DeduplicationHelper();
        this.iterationEngine = new ReActIterationEngine(
            modelManager,
            toolRegistry, // MODIFICADO: Pasar toolRegistry a ReActIterationEngine (ya estaba, pero para EventDispatchHelper dentro de él)
            dispatcher,
            memoryManager,
            this.toolDescriptionHelper,
            this.historyHelper,
            this.eventDispatchHelper
        );
    }

    public async run(initialState: WindsurfState): Promise<WindsurfState> {
        const currentState = { ...initialState };
        currentState.iterationCount = currentState.iterationCount || 0;
        currentState.history = currentState.history || [];
        if (!currentState._executedTools) {
            currentState._executedTools = new Set<string>();
        }
        this.deduplicationHelper.initializeForState(currentState);

        const startTime = Date.now();

        try {
            const memoryContext = await this.memoryContextHelper.getMemoryContext(
                currentState.chatId,
                currentState.userMessage || ''
            );

            const analysisResult: AnalysisOutput = await this.iterationEngine.runInitialAnalysis( // MODIFICADO: Tipar analysisResult
                currentState,
                memoryContext
            );

            const { isCompleted, toolResultsAccumulator } = await this.runMainIterationLoop(
                currentState,
                analysisResult,
                memoryContext
            );

            // MODIFICADO: Solo generar respuesta final si no hay ya una y no se completó por 'respond'
            // y si el bucle no se detuvo por una razón que ya debería tener un finalOutput (como deduplicación manejada abajo)
            if (!currentState.finalOutput && !isCompleted) {
                await this.iterationEngine.generateFinalResponse(
                    currentState,
                    toolResultsAccumulator,
                    analysisResult,
                    memoryContext
                );
            }

            await this.memoryManager.storeConversation(currentState.chatId, currentState);
            // Solo marcar como 'completed' si no falló o ya tiene un estado de completitud.
            if (currentState.completionStatus !== 'failed' && !currentState.finalOutput) {
                currentState.finalOutput = "Proceso finalizado, pero no se generó una respuesta explícita.";
            }
            if (!currentState.completionStatus || currentState.completionStatus === 'in_progress') {
                currentState.completionStatus = 'completed';
            }


        } catch (error: any) {
            this.handleEngineError(currentState, error);
        }

        this.dispatchFinalResponseEvent(currentState, startTime);

        return currentState;
    }

    private async runMainIterationLoop(
        currentState: WindsurfState,
        analysisResult: AnalysisOutput, // MODIFICADO: Tipar analysisResult
        memoryContext: string
    ): Promise<{ isCompleted: boolean; toolResultsAccumulator: Array<{ tool: string, toolCallResult: InternalToolResult }> }> {
        const toolResultsAccumulator: Array<{ tool: string, toolCallResult: InternalToolResult }> = [];
        let isCompleted = false;

        while (!isCompleted && currentState.iterationCount < this.MAX_ITERATIONS) {
            currentState.iterationCount++;

            const iterationResult: SingleIterationResult = await this.iterationEngine.runSingleIteration(
                currentState,
                analysisResult,
                memoryContext,
                toolResultsAccumulator,
                this.deduplicationHelper
            );

            if (iterationResult.isCompleted) {
                isCompleted = true;
                if (iterationResult.finalOutput) {
                    currentState.finalOutput = iterationResult.finalOutput;
                }
            }

            if (iterationResult.toolResult) {
                toolResultsAccumulator.push(iterationResult.toolResult);
            }

            if (iterationResult.stopLoop) {
                // MODIFICADO: Si el bucle se detiene (ej. por deduplicación) y no hay una salida final,
                // establecer una aquí para evitar la llamada a generateFinalResponse o darle un contexto.
                if (!currentState.finalOutput && iterationResult.reasonForStop === 'deduplication') {
                    currentState.finalOutput = "La acción requerida ya se realizó o se intentó repetidamente. No se realizarán más intentos para esta acción específica.";
                    // Opcionalmente, podrías querer que isCompleted sea true aquí si consideras que la deduplicación es un tipo de finalización.
                    // isCompleted = true; // Esto evitaría la llamada a generateFinalResponse
                }
                break;
            }
        }

        return { isCompleted, toolResultsAccumulator };
    }

    private handleEngineError(currentState: WindsurfState, error: any): void {
        console.error('[OptimizedReActEngine] Error durante la ejecución:', error);
        const errorMessage = error.message || 'Error desconocido durante la ejecución del motor.';
        currentState.error = errorMessage;
        currentState.completionStatus = 'failed';
        // Asegurarse de que historyHelper esté disponible o usar la función directamente si es necesario
        this.historyHelper.addErrorToHistory(currentState, `Error en OptimizedReActEngine: ${errorMessage}`);


        this.dispatcher.dispatch(EventType.SYSTEM_ERROR, {
            message: `Error en OptimizedReActEngine: ${errorMessage}`,
            level: 'error',
            chatId: currentState.chatId,
            details: { error: error.stack || error.toString(), lc_error_code: (error as any).lc_error_code },
            source: 'OptimizedReActEngine',
            timestamp: Date.now()
        });
    }

    private dispatchFinalResponseEvent(currentState: WindsurfState, startTime: number): void {
        if (currentState.finalOutput) {
            const responseContentStr = typeof currentState.finalOutput === 'string'
                ? currentState.finalOutput
                : JSON.stringify(currentState.finalOutput, null, 2);

            const responsePayload: ResponseEventPayload = {
                responseContent: responseContentStr,
                isFinal: true,
                chatId: currentState.chatId,
                source: 'OptimizedReActEngine',
                timestamp: Date.now(),
                duration: Date.now() - startTime,
                metadata: { completionStatus: currentState.completionStatus }
            };
            this.dispatcher.dispatch(EventType.RESPONSE_GENERATED, responsePayload);
        }
    }

    public dispose(): void {
        this.toolDescriptionHelper.dispose();
    }
}