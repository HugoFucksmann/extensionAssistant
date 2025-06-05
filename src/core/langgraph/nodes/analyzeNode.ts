// src/core/langgraph/nodes/analyzeNode.ts
import { OptimizedGraphState } from '../LangGraphState';
import { ModelManager } from '../../../features/ai/ModelManager';
import { InternalEventDispatcher } from '../../events/InternalEventDispatcher';
import { HybridMemorySystem } from '../HybridMemorySystem';
import { PerformanceMonitor } from '../../monitoring/PerformanceMonitor';
import { EventType, AgentPhaseEventPayload } from '@features/events/eventTypes';
import { AIMessage, HumanMessage, BaseMessage } from '@langchain/core/messages';
import { ToolRegistry } from '../../../features/tools/ToolRegistry';

// NUEVAS IMPORTACIONES DIRECTAS
import { analysisOutputSchema, analysisPromptLC, AnalysisOutput } from "../../../features/ai/prompts/optimized/analysisPrompt";
import { createAutoCorrectStep } from "../../../shared/utils/aiResponseParser";
import { invokeModelWithLogging } from '../ModelInvokeLogger';

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
        const humanMessages = state.messages.filter((m): m is HumanMessage => m._getType() === 'human');
        const userQuery = humanMessages.length > 0
            ? humanMessages[humanMessages.length - 1].content as string
            : state.context.working;

        if (!userQuery && !state.context.working) {
            throw new Error("No user query or working context found in state for analysis.");
        }
        const queryForAnalysis = userQuery || state.context.working;

        const memoryContext = await hybridMemory.getRelevantContext(
            state.metadata.chatId,
            queryForAnalysis,
            state.context.working,
            state.messages
        );

        const model = modelManager.getActiveModel();
        const availableTools = toolRegistry.getToolNames();

        // LÓGICA DE OptimizedAnalysisChain INTEGRADA AQUÍ
        const promptInput = {
            userQuery: queryForAnalysis,
            availableTools: availableTools.join(', '),
            codeContext: "", // Asumiendo que no se usa o se obtiene de otra forma si es necesario
            memoryContext: memoryContext || ''
        };

        const parseStep = createAutoCorrectStep(analysisOutputSchema, model, {
            maxAttempts: 2,
            verbose: process.env.NODE_ENV === 'development',
        });

        const chain = analysisPromptLC.pipe(model).pipe(parseStep);

        const analysisResult: AnalysisOutput = await invokeModelWithLogging(
            chain,
            promptInput,
            {
                caller: 'analyzeNodeFunc',
                responseFormatter: (r: unknown) => JSON.stringify(r, null, 2)
            }
        );
        // FIN LÓGICA INTEGRADA

        const newMessages: BaseMessage[] = [...(state.messages || []), new AIMessage({
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
            messages: newMessages,
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