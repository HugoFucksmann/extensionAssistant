// src/core/langgraph/observability/ObservabilityManager.ts
import { InternalEventDispatcher } from "../../events/InternalEventDispatcher";
import { PerformanceMonitor } from "../../monitoring/PerformanceMonitor";
import { GraphPhase, SimplifiedOptimizedGraphState } from "../state/GraphState";
import { EventType, AgentPhaseEventPayload, SystemEventPayload } from "../../../features/events/eventTypes";
import { Disposable } from "../../interfaces/Disposable";

export class ObservabilityManager implements Disposable {
    private timers = new Map<string, number>();

    constructor(
        private dispatcher: InternalEventDispatcher,
        private performanceMonitor: PerformanceMonitor
    ) { }

    public logPhaseStart(phase: GraphPhase, state: SimplifiedOptimizedGraphState): void {
        const timerId = `${state.chatId}:${phase}:${state.iteration}`;
        this.timers.set(timerId, Date.now());

        const payload: AgentPhaseEventPayload = {
            phase,
            chatId: state.chatId,
            iteration: state.iteration,
            timestamp: Date.now(),
            source: `LangGraphEngine.${phase}Node`,
        };
        this.dispatcher.dispatch(EventType.AGENT_PHASE_STARTED, payload);
        console.log(`[OBSERVABILITY][${phase}] Phase started for chat ${state.chatId}.`);
    }

    public logPhaseComplete(
        phase: GraphPhase,
        state: SimplifiedOptimizedGraphState,
        result: Partial<SimplifiedOptimizedGraphState>
    ): void {
        const timerId = `${state.chatId}:${phase}:${state.iteration}`;
        const startTime = this.timers.get(timerId);
        const duration = startTime ? Date.now() - startTime : 0;
        this.timers.delete(timerId);

        const error = result.error;
        this.performanceMonitor.trackNodeExecution(phase, duration, error);

        const payload: AgentPhaseEventPayload = {
            phase,
            chatId: state.chatId,
            iteration: state.iteration,
            timestamp: Date.now(),
            duration,
            error,
            source: `LangGraphEngine.${phase}Node`,
            data: {
                isCompleted: result.isCompleted,
                requiresValidation: result.requiresValidation,
            },
        };
        this.dispatcher.dispatch(EventType.AGENT_PHASE_COMPLETED, payload);
        console.log(`[OBSERVABILITY][${phase}] Phase completed in ${duration}ms for chat ${state.chatId}.`);
    }

    public trackError(source: string, error: Error, state: SimplifiedOptimizedGraphState): void {
        const payload: SystemEventPayload = {
            level: 'error',
            message: error.message,
            source: `LangGraphEngine.${source}`,
            chatId: state.chatId,
            details: {
                stack: error.stack,
                phase: state.currentPhase,
                iteration: state.iteration,
            },
        };
        this.dispatcher.dispatch(EventType.SYSTEM_ERROR, payload);
        console.error(`[OBSERVABILITY][ERROR] Source: ${source}, Message: ${error.message}`);
    }

    public logEngineStart(chatId: string): void {
        this.dispatcher.systemInfo(`LangGraphEngine run started.`, { chatId }, 'LangGraphEngine');
    }

    public logEngineEnd(chatId: string, finalState: SimplifiedOptimizedGraphState): void {
        const duration = Date.now() - finalState.startTime;
        this.dispatcher.systemInfo(`LangGraphEngine run finished.`, {
            chatId,
            status: finalState.error ? 'failed' : 'completed',
            duration,
            totalIterations: finalState.iteration
        }, 'LangGraphEngine');
    }

    public dispose(): void {
        this.timers.clear();
        // El dispatcher y el monitor se gestionan externamente, no se disponen aquí.
    }
}