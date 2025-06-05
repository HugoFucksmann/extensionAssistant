// src/core/langgraph/nodes/respondNode.ts
import { OptimizedGraphState } from '../LangGraphState';
import { NodeDependencies } from './analyzeNode';
import { EventType, AgentPhaseEventPayload } from '@features/events/eventTypes';
import { AIMessage, HumanMessage, BaseMessage } from '@langchain/core/messages';

// NUEVAS IMPORTACIONES DIRECTAS
import { responsePromptLC, responseOutputSchema, ResponseOutput } from "../../../features/ai/prompts/optimized/responsePrompt";
import { createAutoCorrectStep } from "../../../shared/utils/aiResponseParser";
import { invokeModelWithLogging } from "../ModelInvokeLogger";


function formatForPrompt(obj: unknown): string {
    return typeof obj === 'string' ? obj : JSON.stringify(obj);
}


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

    let finalResponseContent = state.metadata.finalOutput;

    try {
        if (!finalResponseContent) {
            const humanMessages = state.messages.filter((m): m is HumanMessage => m.getType() === 'human' || m._getType?.() === 'human');
            const userQuery = humanMessages.length > 0
                ? humanMessages[humanMessages.length - 1].content as string
                : state.context.working;

            const queryForResponse = userQuery || state.context.working;

            if (!queryForResponse) {
                finalResponseContent = "No specific query found to generate a response.";
            } else {
                const model = modelManager.getActiveModel();
                const memoryForResponse = await hybridMemory.getRelevantContext(
                    state.metadata.chatId,
                    queryForResponse,
                    state.context.working,
                    state.messages
                );

                // LÓGICA DE OptimizedResponseChain INTEGRADA AQUÍ
                const promptInput = {
                    userQuery: queryForResponse,
                    toolResults: formatForPrompt(state.messages
                        .filter(m => (m.getType?.() || m._getType?.()) === 'tool')
                        .map(tm => ({ tool: (tm as any).name || 'unknown_tool', result: tm.content })) || []),
                    analysisResult: formatForPrompt({ understanding: state.context.working, initialPlan: state.execution.plan }),
                    memoryContext: memoryForResponse || ''
                };

                const parseStep = createAutoCorrectStep(responseOutputSchema, model, {
                    maxAttempts: 2,
                    verbose: process.env.NODE_ENV === 'development',
                });

                const chain = responsePromptLC.pipe(model).pipe(parseStep);
                const responseResult: ResponseOutput = await invokeModelWithLogging(
                    chain,
                    promptInput,
                    { caller: 'respondNodeFunc' }
                );
                // FIN LÓGICA INTEGRADA
                finalResponseContent = responseResult.response;
            }
        }

        if (!finalResponseContent) {
            finalResponseContent = "I've completed the process, but I don't have a specific message to share at this time.";
        }

        // Asegurarse de que messages sea un array antes de hacer spread
        const currentMessages = Array.isArray(state.messages) ? state.messages : [];
        const updatedMessages: BaseMessage[] = [...currentMessages, new AIMessage(finalResponseContent)];


        const partialUpdate: Partial<OptimizedGraphState> = {
            messages: updatedMessages, // Usar el array actualizado
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

        const currentMessages = Array.isArray(state.messages) ? state.messages : [];
        const updatedMessagesOnError: BaseMessage[] = [...currentMessages, new AIMessage(errorMessage)];

        return {
            messages: updatedMessagesOnError,
            metadata: { ...state.metadata, isCompleted: true, finalOutput: errorMessage },
            validation: { ...(state.validation || { corrections: [] }), errors: [...(state.validation?.errors || []), errorMessage] }
        };
    }
}