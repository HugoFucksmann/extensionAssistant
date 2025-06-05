// src/core/langgraph/nodes/analyzeNode.ts
import { OptimizedGraphState } from '../LangGraphState';
import { ModelManager } from '../../../features/ai/ModelManager';
import { InternalEventDispatcher } from '../../events/InternalEventDispatcher';
import { HybridMemorySystem } from '../HybridMemorySystem';
import { PerformanceMonitor } from '../../monitoring/PerformanceMonitor';
import { runOptimizedAnalysisChain } from '../../../features/ai/lcel/OptimizedAnalysisChain';
import { AnalysisOutput } from '../../../features/ai/prompts/optimized/analysisPrompt';
import { EventType, AgentPhaseEventPayload } from '@features/events/eventTypes';
import { AIMessage, HumanMessage } from '@langchain/core/messages'; // <-- AÑADIDO HumanMessage
import { ToolRegistry } from '../../../features/tools/ToolRegistry';

export interface NodeDependencies {
    modelManager: ModelManager;
    toolRegistry: ToolRegistry;
    dispatcher: InternalEventDispatcher;
    hybridMemory: HybridMemorySystem;
    performanceMonitor: PerformanceMonitor;
}

export async function analyzeNodeFunc(
    state: OptimizedGraphState,
    dependencies: Pick<NodeDependencies, 'modelManager' | 'dispatcher' | 'hybridMemory' | 'performanceMonitor' | 'toolRegistry'>
): Promise<Partial<OptimizedGraphState>> {
    const { modelManager, dispatcher, hybridMemory, performanceMonitor, toolRegistry } = dependencies;
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
        // --- CAMBIO CRÍTICO AQUÍ ---
        // Obtener el ÚLTIMO mensaje humano como la consulta actual
        const humanMessages = state.messages.filter((m): m is HumanMessage => m._getType() === 'human');
        const userQuery = humanMessages.length > 0
            ? humanMessages[humanMessages.length - 1].content as string
            : state.context.working; // Fallback si no hay mensajes humanos (poco probable aquí)

        if (!userQuery && !state.context.working) { // Condición de error más robusta
            throw new Error("No user query or working context found in state for analysis.");
        }

        const queryForAnalysis = userQuery || state.context.working;

        // Logging detallado para depuración
        console.log(`[analyzeNodeFunc] Chat ID: ${state.metadata.chatId}, Iteration: ${state.context.iteration}`);
        console.log(`[analyzeNodeFunc] state.messages:`, JSON.stringify(state.messages.map(m => ({
            type: m.getType?.() || m._getType?.(),
            content: m.content,
            name: (m as any).name || undefined
        })), null, 2));
        console.log(`[analyzeNodeFunc] Extracted userQuery: ${queryForAnalysis}`);
        console.log(`[analyzeNodeFunc] Context working: ${state.context.working}`);


        const memoryContext = await hybridMemory.getRelevantContext(
            state.metadata.chatId,
            queryForAnalysis, // Usar la consulta correcta
            state.context.working,
            state.messages
        );

        const model = modelManager.getActiveModel();

        const analysisResult: AnalysisOutput = await runOptimizedAnalysisChain({
            userQuery: queryForAnalysis, // Usar la consulta correcta
            availableTools: toolRegistry.getToolNames(),
            codeContext: "",
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
                memory: memoryContext,
            },
            execution: {
                ...state.execution,
                plan: analysisResult.initialPlan,
            },
            messages: [...(state.messages || []), ...newMessages],
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

        return {
            messages: [...(state.messages || []), new AIMessage(`Error during analysis: ${error.message}`)],
            metadata: { ...state.metadata, isCompleted: true, finalOutput: `Analysis failed: ${error.message}` },
            validation: { ...(state.validation || { corrections: [] }), errors: [...(state.validation?.errors || []), `Analysis error: ${error.message}`] }
        };
    }
}