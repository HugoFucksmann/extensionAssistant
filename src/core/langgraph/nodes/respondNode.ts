// src/core/langgraph/nodes/respondNode.ts
import { OptimizedGraphState } from '../LangGraphState';
import { NodeDependencies } from './analyzeNode'; // Usar la base
import { runOptimizedResponseChain } from '../../../features/ai/lcel/OptimizedResponseChain';
import { ResponseOutput } from '../../../features/ai/prompts/optimized/responsePrompt';
import { EventType, AgentPhaseEventPayload } from '@features/events/eventTypes';
import { AIMessage } from '@langchain/core/messages';

export async function respondNodeFunc(
    state: OptimizedGraphState,
    dependencies: Pick<NodeDependencies, 'modelManager' | 'dispatcher' | 'performanceMonitor' | 'hybridMemory'>
): Promise<Partial<OptimizedGraphState>> {
    const { modelManager, dispatcher, performanceMonitor, hybridMemory } = dependencies;
    const startTime = Date.now();
    const phaseName = 'finalResponseGeneration';

    dispatcher.dispatch(EventType.AGENT_PHASE_STARTED, {
        phase: phaseName,
        chatId: state.metadata.chatId,
        iteration: state.context.iteration,
        timestamp: Date.now(),
        source: 'LangGraphEngine.respondNode'
    } as AgentPhaseEventPayload);

    let finalResponseContent = state.metadata.finalOutput; // Usar si ya fue establecido por un nodo anterior

    try {
        if (!finalResponseContent) { // Solo generar si no hay ya una respuesta final
            const userQuery = state.messages.find(m => m._getType() === 'human')?.content as string || state.context.working;
            const model = modelManager.getActiveModel();

            // Re-obtener memoria por si el contexto de trabajo cambió mucho
            const memoryForResponse = await hybridMemory.getRelevantContext(
                state.metadata.chatId,
                userQuery,
                state.context.working,
                state.messages // Mensajes actuales del grafo
            );

            const responseResult: ResponseOutput = await runOptimizedResponseChain({
                userQuery,
                toolResults: state.messages.filter(m => m._getType() === 'tool').map(tm => ({ tool: (tm as any).name || 'unknown_tool', result: tm.content })),
                analysisResult: { understanding: state.context.working, initialPlan: state.execution.plan }, // Simular
                memoryContext: memoryForResponse,
                model
            });
            finalResponseContent = responseResult.response;
        }

        if (!finalResponseContent) {
            finalResponseContent = "I've completed the process, but I don't have a specific message to share at this time.";
        }

        const partialUpdate: Partial<OptimizedGraphState> = {
            messages: [new AIMessage(finalResponseContent)], // La respuesta final como un mensaje de IA
            metadata: {
                ...state.metadata,
                isCompleted: true,
                finalOutput: finalResponseContent,
            }
        };

        dispatcher.dispatch(EventType.AGENT_PHASE_COMPLETED, {
            phase: phaseName,
            chatId: state.metadata.chatId,
            iteration: state.context.iteration,
            timestamp: Date.now(),
            duration: Date.now() - startTime,
            source: 'LangGraphEngine.respondNode',
            data: { response: finalResponseContent }
        } as AgentPhaseEventPayload);
        performanceMonitor.trackNodeExecution('respondNode', Date.now() - startTime);
        return partialUpdate;

    } catch (error: any) {
        const errorMessage = `Error generating final response: ${error.message}`;
        dispatcher.dispatch(EventType.AGENT_PHASE_COMPLETED, {
            phase: phaseName,
            chatId: state.metadata.chatId,
            iteration: state.context.iteration,
            timestamp: Date.now(),
            duration: Date.now() - startTime,
            source: 'LangGraphEngine.respondNode',
            error: error.message
        } as AgentPhaseEventPayload);
        performanceMonitor.trackNodeExecution('respondNode', Date.now() - startTime, error.message);

        return {
            messages: [new AIMessage(errorMessage)],
            metadata: { ...state.metadata, isCompleted: true, finalOutput: errorMessage },
            validation: { ...(state.validation || { corrections: [] }), errors: [...(state.validation?.errors || []), errorMessage] }
        };
    }
}