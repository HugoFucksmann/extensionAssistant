// src/core/langgraph/nodes/analyzeNode.ts
import { OptimizedGraphState } from '../LangGraphState';
import { ModelManager } from '../../../features/ai/ModelManager';
import { InternalEventDispatcher } from '../../events/InternalEventDispatcher';
import { HybridMemorySystem } from '../HybridMemorySystem';
import { PerformanceMonitor } from '../../monitoring/PerformanceMonitor';
import { runOptimizedAnalysisChain } from '../../../features/ai/lcel/OptimizedAnalysisChain';
import { AnalysisOutput } from '../../../features/ai/prompts/optimized/analysisPrompt';
import { EventType, AgentPhaseEventPayload } from '@features/events/eventTypes';
import { AIMessage, SystemMessage } from '@langchain/core/messages';

export interface NodeDependencies {
    modelManager: ModelManager;
    dispatcher: InternalEventDispatcher;
    hybridMemory: HybridMemorySystem;
    performanceMonitor: PerformanceMonitor;
    // No necesitamos toolRegistry ni executedToolsInSession aquí
}

export async function analyzeNodeFunc(
    state: OptimizedGraphState,
    dependencies: Pick<NodeDependencies, 'modelManager' | 'dispatcher' | 'hybridMemory' | 'performanceMonitor'>
): Promise<Partial<OptimizedGraphState>> {
    const { modelManager, dispatcher, hybridMemory, performanceMonitor } = dependencies;
    const startTime = Date.now();
    const phaseName = 'initialAnalysis';

    dispatcher.dispatch(EventType.AGENT_PHASE_STARTED, {
        phase: phaseName,
        chatId: state.metadata.chatId,
        iteration: state.context.iteration,
        timestamp: Date.now(),
        source: 'LangGraphEngine.analyzeNode'
    } as AgentPhaseEventPayload);

    try {
        const userQuery = state.messages.find(m => m._getType() === 'human')?.content as string || state.context.working;
        if (!userQuery) {
            throw new Error("No user query found in state for analysis.");
        }

        const memoryContext = await hybridMemory.getRelevantContext(
            state.metadata.chatId,
            userQuery,
            state.context.working, // Pasar el 'objective' actual
            state.messages // Pasar todos los mensajes actuales del grafo
        );

        const model = modelManager.getActiveModel();
        // Las herramientas disponibles se obtendrían de ToolRegistry, pero analyzeNode no las usa directamente,
        // sino que runOptimizedAnalysisChain las necesita. Esto es un pequeño desajuste.
        // Idealmente, ToolRegistry sería una dependencia aquí para pasar los nombres.
        // Por ahora, lo simulamos o asumimos que runOptimizedAnalysisChain puede obtenerlas.
        // SOLUCIÓN TEMPORAL: Dejar que runOptimizedAnalysisChain falle si no puede obtenerlas, o pasar un array vacío.
        // Para una solución real, ToolRegistry debería ser una dependencia.

        const analysisResult: AnalysisOutput = await runOptimizedAnalysisChain({
            userQuery,
            availableTools: [], // Placeholder: ToolRegistry debería proveer esto
            codeContext: "", // Placeholder: obtener de editor/project context si está en WindsurfState
            memoryContext,
            model
        });

        const newMessages: AIMessage[] = [new AIMessage({
            content: `Analysis complete. Understanding: ${analysisResult.understanding}. Plan: ${analysisResult.initialPlan.join(', ')}`
        })];

        const partialUpdate: Partial<OptimizedGraphState> = {
            context: {
                ...state.context,
                working: analysisResult.understanding || state.context.working,
                memory: memoryContext, // Guardar el contexto de memoria usado
            },
            execution: {
                ...state.execution,
                plan: analysisResult.initialPlan,
            },
            messages: newMessages, // Añadir mensaje de IA con el resultado del análisis
        };

        dispatcher.dispatch(EventType.AGENT_PHASE_COMPLETED, {
            phase: phaseName,
            chatId: state.metadata.chatId,
            iteration: state.context.iteration,
            timestamp: Date.now(),
            duration: Date.now() - startTime,
            source: 'LangGraphEngine.analyzeNode',
            data: { analysis: analysisResult }
        } as AgentPhaseEventPayload);
        performanceMonitor.trackNodeExecution('analyzeNode', Date.now() - startTime);
        return partialUpdate;

    } catch (error: any) {
        dispatcher.dispatch(EventType.AGENT_PHASE_COMPLETED, {
            phase: phaseName,
            chatId: state.metadata.chatId,
            iteration: state.context.iteration,
            timestamp: Date.now(),
            duration: Date.now() - startTime,
            source: 'LangGraphEngine.analyzeNode',
            error: error.message
        } as AgentPhaseEventPayload);
        performanceMonitor.trackNodeExecution('analyzeNode', Date.now() - startTime, error.message);

        // Marcar como completado con error para que el grafo pueda terminar
        return {
            messages: [new AIMessage(`Error during analysis: ${error.message}`)],
            metadata: { ...state.metadata, isCompleted: true, finalOutput: `Analysis failed: ${error.message}` },
            validation: { errors: [`Analysis error: ${error.message}`], corrections: [] }
        };
    }
}