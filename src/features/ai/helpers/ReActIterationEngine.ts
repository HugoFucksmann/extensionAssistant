// src/core/helpers/ReActIterationEngine.ts

import { InternalEventDispatcher } from "@core/events/InternalEventDispatcher";
import { ModelManager } from "@features/ai/ModelManager";
import { MemoryManager } from "@features/memory/MemoryManager";
import { ToolDescriptionHelper } from "./ToolDescriptionHelper";
import { HistoryHelper } from "./HistoryHelper";
import { EventDispatchHelper } from "./EventDispatchHelper";
import { DeduplicationHelper } from "./DeduplicationHelper";
import { ToolRegistry } from "@features/tools/ToolRegistry";
import { WindsurfState } from "@core/types";
import { runOptimizedAnalysisChain } from "@features/ai/lcel/OptimizedAnalysisChain";
import { runOptimizedReasoningChain } from "@features/ai/lcel/OptimizedReasoningChain";
import { ReasoningOutput } from "@features/ai/prompts/optimized/reasoningPrompt";
import { runOptimizedActionChain } from "@features/ai/lcel/OptimizedActionChain";
import { ActionOutput } from "@features/ai/prompts/optimized/actionPrompt";
import { runOptimizedResponseChain } from "@features/ai/lcel/OptimizedResponseChain";
import { ResponseOutput } from "@features/ai/prompts/optimized/responsePrompt";
import { ToolResult as InternalToolResult } from '@features/tools/types';
import { AnalysisOutput } from "../prompts/optimized/analysisPrompt";

export interface SingleIterationResult {
    isCompleted: boolean;
    toolResult?: { tool: string, toolCallResult: InternalToolResult };
    finalOutput?: string;
    stopLoop?: boolean;
    reasonForStop?: 'deduplication' | string; // NUEVO: Para dar contexto a por qué se detuvo
}

export class ReActIterationEngine {
    constructor(
        private modelManager: ModelManager,
        private toolRegistry: ToolRegistry, // Necesario para EventDispatchHelper
        private dispatcher: InternalEventDispatcher,
        private memoryManager: MemoryManager,
        private toolDescriptionHelper: ToolDescriptionHelper,
        private historyHelper: HistoryHelper,
        private eventDispatchHelper: EventDispatchHelper
    ) { }

    async runInitialAnalysis(
        currentState: WindsurfState,
        memoryContext: string
    ): Promise<AnalysisOutput> { // MODIFICADO: Tipar retorno
        this.eventDispatchHelper.dispatchAgentPhase(
            'initialAnalysis',
            'started',
            currentState.chatId,
            currentState.iterationCount
        );

        const model = this.modelManager.getActiveModel();
        console.log('[ReActIterationEngine] --- Fase de análisis inicial ---');

        const analysisResult = await runOptimizedAnalysisChain({
            userQuery: currentState.userMessage || '',
            availableTools: this.toolRegistry.getToolNames(),
            codeContext: JSON.stringify(currentState.editorContext || currentState.projectContext || {}),
            memoryContext,
            model
        });

        console.log('[ReActIterationEngine] Resultado de análisis:', JSON.stringify(analysisResult, null, 2));
        this.historyHelper.addHistoryEntry(currentState, 'reasoning', analysisResult, { phase_details: 'initial_analysis' });

        this.eventDispatchHelper.dispatchAgentPhase(
            'initialAnalysis',
            'completed',
            currentState.chatId,
            currentState.iterationCount,
            { analysis: analysisResult }
        );

        this.memoryManager.setRuntime(currentState.chatId, 'currentAnalysis', analysisResult);
        return analysisResult;
    }

    async runSingleIteration(
        currentState: WindsurfState,
        analysisResult: AnalysisOutput, // MODIFICADO: Tipar
        memoryContext: string,
        toolResultsAccumulator: Array<{ tool: string, toolCallResult: InternalToolResult }>,
        deduplicationHelper: DeduplicationHelper
    ): Promise<SingleIterationResult> {
        const iterationStartTime = Date.now();
        console.log(`[ReActIterationEngine] --- Iteración ${currentState.iterationCount} ---`);

        const reasoningResult: ReasoningOutput = await this.runReasoningPhase(
            currentState,
            analysisResult,
            memoryContext,
            toolResultsAccumulator
        );

        if (reasoningResult.nextAction === 'respond') {
            console.log('[ReActIterationEngine] El modelo decidió responder al usuario.');
            const finalOutput = reasoningResult.response || 'No specific response content provided by model.';
            return { isCompleted: true, finalOutput };
        }

        if (reasoningResult.nextAction === 'use_tool' && reasoningResult.tool) {
            if (deduplicationHelper.isToolExecutionDuplicate(reasoningResult.tool, reasoningResult.parameters)) {
                console.warn(`[ReActIterationEngine] Tool deduplicada: ${reasoningResult.tool} con mismos parámetros ya ejecutada en este ciclo.`);
                this.historyHelper.addHistoryEntry(currentState, 'system_message',
                    `Tool execution skipped due to deduplication: ${reasoningResult.tool}`,
                    { tool: reasoningResult.tool, params: reasoningResult.parameters, status: 'skipped' }
                );
                return { isCompleted: false, stopLoop: true, reasonForStop: 'deduplication' }; // MODIFICADO: Añadir reasonForStop
            }
            deduplicationHelper.markToolAsExecuted(reasoningResult.tool, reasoningResult.parameters);

            const toolExecutionOutcome = await this.executeToolAndAnalyze(
                currentState,
                reasoningResult,
                memoryContext,
                toolResultsAccumulator
            );

            console.log(`[ReActIterationEngine] Iteración ${currentState.iterationCount} completada en ${Date.now() - iterationStartTime}ms`);
            return toolExecutionOutcome;
        } else if (reasoningResult.nextAction === 'use_tool' && !reasoningResult.tool) {
            const errorMsg = "Model decided to use a tool but did not specify which tool.";
            console.warn(`[ReActIterationEngine] ${errorMsg}`);
            this.historyHelper.addErrorToHistory(currentState, errorMsg);
            return { isCompleted: true, finalOutput: "I tried to use a tool, but I'm unsure which one. Can you clarify?" };
        }

        return { isCompleted: false };
    }

    private async runReasoningPhase(
        currentState: WindsurfState,
        analysisResult: AnalysisOutput, // MODIFICADO: Tipar
        memoryContext: string,
        toolResultsAccumulator: Array<{ tool: string, toolCallResult: InternalToolResult }>
    ): Promise<ReasoningOutput> {
        this.eventDispatchHelper.dispatchAgentPhase(
            'reasoning',
            'started',
            currentState.chatId,
            currentState.iterationCount
        );

        const model = this.modelManager.getActiveModel();
        const reasoningResult = await runOptimizedReasoningChain({
            userQuery: currentState.userMessage || '',
            analysisResult,
            toolsDescription: this.toolDescriptionHelper.getToolsDescription(),
            previousToolResults: toolResultsAccumulator.map(tr => ({
                name: tr.tool,
                result: tr.toolCallResult.data ?? tr.toolCallResult.error ?? "No data/error from tool"
            })),
            memoryContext,
            model
        });

        console.log('[ReActIterationEngine] Resultado de razonamiento:', JSON.stringify(reasoningResult, null, 2));
        this.historyHelper.addHistoryEntry(currentState, 'reasoning', reasoningResult);

        this.eventDispatchHelper.dispatchAgentPhase(
            'reasoning',
            'completed',
            currentState.chatId,
            currentState.iterationCount,
            { reasoning: reasoningResult }
        );

        this.memoryManager.setRuntime(currentState.chatId, 'lastReasoning', reasoningResult);
        return reasoningResult;
    }

    private async executeToolAndAnalyze(
        currentState: WindsurfState,
        reasoningResult: ReasoningOutput,
        memoryContext: string,
        toolResultsAccumulator: Array<{ tool: string, toolCallResult: InternalToolResult }>
    ): Promise<SingleIterationResult> {
        const toolExecutionStartTime = Date.now();
        const toolName = reasoningResult.tool!;
        const operationId = `${currentState.chatId || 'nochat'}-${Date.now()}-${toolName}`;

        console.log(`[ReActIterationEngine] Ejecutando herramienta: ${toolName} con parámetros:`, reasoningResult.parameters);

        try {
            const internalToolResult: InternalToolResult = await this.toolRegistry.executeTool(
                toolName,
                reasoningResult.parameters ?? {},
                { chatId: currentState.chatId, operationId }
            );

            console.log(`[ReActIterationEngine] Resultado de herramienta (${toolName}):`, JSON.stringify(internalToolResult, null, 2));

            const toolExecParams = reasoningResult.parameters === null ? undefined : reasoningResult.parameters;

            this.historyHelper.addHistoryEntry(currentState, 'action', {
                tool: toolName,
                parameters: toolExecParams,
                result_summary: internalToolResult.success ? "Success" : `Error: ${internalToolResult.error}`
            }, {
                tool_executions: [{
                    name: toolName,
                    parameters: toolExecParams,
                    status: internalToolResult.success ? 'completed' : 'error',
                    result: internalToolResult.data,
                    error: internalToolResult.error,
                    startTime: toolExecutionStartTime,
                    endTime: Date.now(),
                    duration: Date.now() - toolExecutionStartTime,
                }]
            });

            const currentToolExecutionResult = {
                tool: toolName,
                toolCallResult: internalToolResult
            };

            this.memoryManager.setRuntime(currentState.chatId, `toolResult_${toolName}`, {
                tool: toolName,
                success: internalToolResult.success,
                data: internalToolResult.data,
                error: internalToolResult.error,
                timestamp: Date.now()
            });

            // MODIFICADO: Pasar el toolResultsAccumulator *actual* para previousActions,
            // ya que la herramienta actual aún no se ha añadido al acumulador en el bucle principal.
            const actionResult: ActionOutput = await this.runPostToolAnalysis(
                currentState,
                toolName,
                internalToolResult,
                toolResultsAccumulator,
                memoryContext
            );

            this.eventDispatchHelper.dispatchToolExecutionEvent(
                this.toolRegistry,
                toolName,
                reasoningResult.parameters,
                internalToolResult,
                actionResult,
                currentState.chatId,
                operationId,
                Date.now() - toolExecutionStartTime
            );

            const isCompleted = actionResult.nextAction === 'respond';
            let finalOutput: string | undefined;
            if (isCompleted) {
                finalOutput = actionResult.response || 'No specific response content provided by model after tool use.';
            }

            return { isCompleted, toolResult: currentToolExecutionResult, finalOutput };

        } catch (error: any) {
            const errorMessage = error.message || 'Error desconocido ejecutando herramienta.';
            this.historyHelper.addErrorToHistory(currentState, `Error executing tool ${toolName}: ${errorMessage}`);
            return { isCompleted: false, finalOutput: `Error al ejecutar la herramienta ${toolName}.` }; // Indicar que falló pero podría continuar
        }
    }

    private async runPostToolAnalysis(
        currentState: WindsurfState,
        toolName: string,
        toolResult: InternalToolResult,
        // MODIFICADO: El acumulador aquí representa las herramientas *antes* de la actual
        previousToolResultsAccumulator: Array<{ tool: string, toolCallResult: InternalToolResult }>,
        memoryContext: string
    ): Promise<ActionOutput> {
        const model = this.modelManager.getActiveModel();
        const actionResult = await runOptimizedActionChain({
            userQuery: currentState.userMessage || '',
            lastToolName: toolName,
            lastToolResult: toolResult.data ?? toolResult.error ?? "No data/error from tool",
            previousActions: previousToolResultsAccumulator.map(tr => ({
                tool: tr.tool,
                result: tr.toolCallResult.data ?? tr.toolCallResult.error ?? "No data/error from tool"
            })),
            memoryContext,
            model
        });

        console.log('[ReActIterationEngine] Resultado de acción:', JSON.stringify(actionResult, null, 2));
        this.historyHelper.addHistoryEntry(currentState, 'action', actionResult, { phase_details: 'action_interpretation' });

        return actionResult;
    }

    async generateFinalResponse(
        currentState: WindsurfState,
        toolResultsAccumulator: Array<{ tool: string, toolCallResult: InternalToolResult }>,
        analysisResult: AnalysisOutput, // MODIFICADO: Tipar
        memoryContext: string
    ): Promise<void> {
        // Evitar generar respuesta si ya hay un error grave o un output por deduplicación
        if (currentState.error || (currentState.finalOutput && currentState.finalOutput.includes("repetidamente"))) {
            console.log("[ReActIterationEngine] Omitiendo generateFinalResponse debido a error previo o salida por deduplicación.");
            return;
        }

        this.eventDispatchHelper.dispatchAgentPhase(
            'finalResponseGeneration',
            'started',
            currentState.chatId,
            currentState.iterationCount
        );

        const model = this.modelManager.getActiveModel();
        try {
            const responseResult = await runOptimizedResponseChain({
                userQuery: currentState.userMessage || '',
                toolResults: toolResultsAccumulator.map(tr => ({
                    tool: tr.tool,
                    result: tr.toolCallResult.data ?? tr.toolCallResult.error ?? "No data/error from tool"
                })),
                analysisResult,
                memoryContext,
                model
            }) as ResponseOutput;

            currentState.finalOutput = responseResult.response || "The process completed, but no specific final response was generated.";
            this.historyHelper.addHistoryEntry(currentState, 'responseGeneration', responseResult);

            this.eventDispatchHelper.dispatchAgentPhase(
                'finalResponseGeneration',
                'completed',
                currentState.chatId,
                currentState.iterationCount,
                { response: responseResult }
            );
        } catch (error: any) {
            const errorMsg = `Error en generateFinalResponse: ${error.message}`;
            console.error(`[ReActIterationEngine] ${errorMsg}`);
            this.historyHelper.addErrorToHistory(currentState, errorMsg);
            currentState.finalOutput = "Tuve problemas al generar la respuesta final.";
            currentState.error = errorMsg; // Registrar el error en el estado
            this.eventDispatchHelper.dispatchAgentPhase(
                'finalResponseGeneration',
                'completed', // Se considera 'completed' con error
                currentState.chatId,
                currentState.iterationCount,
                undefined,
                errorMsg
            );
        }
    }
}