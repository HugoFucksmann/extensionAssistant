// src/core/langgraph/graph/TransitionLogic.ts
import { GraphPhase, SimplifiedOptimizedGraphState } from "../state/GraphState";

export class TransitionLogic {
    public static determineNextNode(state: SimplifiedOptimizedGraphState): GraphPhase {

        switch (state.currentPhase) {
            case GraphPhase.ANALYSIS:
                return this.routeFromAnalysis(state);
            case GraphPhase.EXECUTION:
                return this.routeFromExecution(state);
            case GraphPhase.VALIDATION:
                return this.routeFromValidation(state);
            case GraphPhase.RESPONSE:
                return this.routeFromResponse(state);
            case GraphPhase.ERROR_HANDLER:
                return GraphPhase.COMPLETED;
            default:
                return GraphPhase.COMPLETED;
        }
    }

    private static routeFromAnalysis(state: SimplifiedOptimizedGraphState): GraphPhase {
        if (state.error) return GraphPhase.ERROR_HANDLER;
        return GraphPhase.EXECUTION;
    }

    private static routeFromExecution(state: SimplifiedOptimizedGraphState): GraphPhase {
        if (state.requiresValidation) {
            return GraphPhase.VALIDATION;
        }

        if (state.error) {
            return GraphPhase.ERROR_HANDLER;
        }

        if (state.isCompleted) {
            return GraphPhase.RESPONSE;
        }

        const hasMoreTasks = state.currentTask || (state.currentPlan && state.currentPlan.length > 0);
        const nodeIterationLimit = state.maxNodeIterations[GraphPhase.EXECUTION] || 5;
        const withinIterationLimit = (state.nodeIterations[GraphPhase.EXECUTION] || 0) < nodeIterationLimit;

        if (hasMoreTasks && withinIterationLimit) {
            return GraphPhase.EXECUTION;
        }

        return GraphPhase.RESPONSE;
    }

    private static routeFromValidation(state: SimplifiedOptimizedGraphState): GraphPhase {
        if (state.error) {
            return GraphPhase.ERROR_HANDLER;
        }

        if (state.isCompleted) {
            return GraphPhase.RESPONSE;
        }

        return GraphPhase.EXECUTION;
    }

    private static routeFromResponse(state: SimplifiedOptimizedGraphState): GraphPhase {
        return GraphPhase.COMPLETED;
    }
}