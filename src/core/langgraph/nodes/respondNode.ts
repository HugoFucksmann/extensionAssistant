// src/core/langgraph/nodes/respondNode.ts
import { OptimizedGraphState } from '../LangGraphState';
import { NodeDependencies } from './analyzeNode'; // Usar la base
import { runOptimizedResponseChain } from '../../../features/ai/lcel/OptimizedResponseChain';
import { ResponseOutput } from '../../../features/ai/prompts/optimized/responsePrompt';
import { EventType, AgentPhaseEventPayload } from '@features/events/eventTypes';
import { AIMessage, HumanMessage } from '@langchain/core/messages'; // Asegúrate que HumanMessage esté

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
        if (!finalResponseContent) {
            // --- CAMBIO CRÍTICO AQUÍ ---
            const humanMessages = state.messages.filter((m): m is HumanMessage => m.getType() === 'human' || m._getType?.() === 'human');
            const userQuery = humanMessages.length > 0 
                ? humanMessages[humanMessages.length - 1].content as string 
                : state.context.working;

            const queryForResponse = userQuery || state.context.working;
            
            // Logging detallado para depuración
            console.log(`[respondNodeFunc] Chat ID: ${state.metadata.chatId}, Iteration: ${state.context.iteration}`);
            console.log(`[respondNodeFunc] state.messages:`, JSON.stringify(state.messages.map(m => ({
                type: m.getType?.() || m._getType?.(),
                content: m.content,
                name: (m as any).name || undefined
            })), null, 2));
            console.log(`[respondNodeFunc] Extracted userQuery: ${queryForResponse}`);
            console.log(`[respondNodeFunc] Context working: ${state.context.working}`);
            
            if (!queryForResponse) {
                finalResponseContent = "No specific query found to generate a response.";
            } else {
                const model = modelManager.getActiveModel();
                const memoryForResponse = await hybridMemory.getRelevantContext(
                    state.metadata.chatId,
                    queryForResponse, // Usar queryForResponse
                    state.context.working,
                    state.messages
                );

                const responseResult: ResponseOutput = await runOptimizedResponseChain({
                    userQuery: queryForResponse, // Usar queryForResponse
                    toolResults: state.messages
                        .filter(m => (m.getType?.() || m._getType?.()) === 'tool')
                        .map(tm => ({ tool: (tm as any).name || 'unknown_tool', result: tm.content })),
                    analysisResult: { understanding: state.context.working, initialPlan: state.execution.plan },
                    memoryContext: memoryForResponse,
                    model
                });
                finalResponseContent = responseResult.response;
            }
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