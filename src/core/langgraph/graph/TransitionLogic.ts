// src/core/langgraph/graph/TransitionLogic.ts
import { GraphPhase, SimplifiedOptimizedGraphState } from "../state/GraphState";

export class TransitionLogic {
    /**
     * Determines the next node based on the current phase and state.
     * This acts as the main router for the graph's conditional edges.
     */
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
            default:
                // If in an unexpected or terminal state, end the graph.
                return GraphPhase.COMPLETED;
        }
    }

    private static routeFromAnalysis(state: SimplifiedOptimizedGraphState): GraphPhase {
        if (state.error) return GraphPhase.ERROR;
        // After analysis, always proceed to execution, even with an empty plan.
        // The execution node will decide if it can respond directly.
        return GraphPhase.EXECUTION;
    }

    private static routeFromExecution(state: SimplifiedOptimizedGraphState): GraphPhase {
        if (state.error) return GraphPhase.ERROR;
        if (state.isCompleted) return GraphPhase.RESPONSE;
        if (state.requiresValidation) return GraphPhase.VALIDATION;

        const hasMoreTasks = state.currentTask || (state.currentPlan && state.currentPlan.length > 0);
        const nodeIterationLimit = state.maxNodeIterations[GraphPhase.EXECUTION] || 5;
        const withinIterationLimit = state.nodeIterations[GraphPhase.EXECUTION] < nodeIterationLimit;

        if (hasMoreTasks && withinIterationLimit) {
            // Loop back to execution if there are more steps in the plan and we haven't hit the limit.
            return GraphPhase.EXECUTION;
        }

        // If the plan is finished or iteration limit is reached, move to generate a response.
        return GraphPhase.RESPONSE;
    }

    private static routeFromValidation(state: SimplifiedOptimizedGraphState): GraphPhase {
        if (state.error) return GraphPhase.ERROR;
        if (state.isCompleted) return GraphPhase.RESPONSE;

        // After validation, always attempt to re-execute with the corrected state.
        return GraphPhase.EXECUTION;
    }

    private static routeFromResponse(state: SimplifiedOptimizedGraphState): GraphPhase {
        // The response node is the final step before completion.
        return GraphPhase.COMPLETED;
    }
}