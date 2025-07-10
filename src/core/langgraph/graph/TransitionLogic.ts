// src/core/langgraph/graph/TransitionLogic.ts
import { GraphPhase, SimplifiedOptimizedGraphState } from "../state/GraphState";

export class TransitionLogic {
    public static route(state: SimplifiedOptimizedGraphState): string {
        const { currentPhase, error, isCompleted, debugInfo } = state;

        // 1. Handle errors first
        if (error) {
            console.log(`[TransitionLogic] Error detected. Routing to ${GraphPhase.ERROR_HANDLER}.`);
            return GraphPhase.ERROR_HANDLER;
        }

        // 2. Check if the planner has marked the process as complete
        if (isCompleted) {
            console.log(`[TransitionLogic] Planner marked as complete. Routing to ${GraphPhase.RESPONSE}.`);
            return GraphPhase.RESPONSE;
        }

        // 3. Main routing logic based on the current phase
        switch (currentPhase) {
            case GraphPhase.PLANNER:
                // If the planner created a plan, go to executor. Otherwise, it should have set isCompleted=true.
                console.log(`[TransitionLogic] After PLANNER. Routing to ${GraphPhase.EXECUTOR}.`);
                return GraphPhase.EXECUTOR;

            case GraphPhase.EXECUTOR:
                // The executor's job is to prepare a tool call.
                if (debugInfo?.pendingToolCall) {
                    console.log(`[TransitionLogic] After EXECUTOR. Tool call prepared. Routing to ${GraphPhase.TOOL_RUNNER}.`);
                    return GraphPhase.TOOL_RUNNER;
                } else {
                    // If executor decides no tool is needed, it should re-route to planner.
                    console.log(`[TransitionLogic] After EXECUTOR. No tool call. Routing back to ${GraphPhase.PLANNER}.`);
                    return GraphPhase.PLANNER;
                }

            case GraphPhase.TOOL_RUNNER:
                // After a tool runs, ALWAYS go back to the planner to evaluate the result.
                console.log(`[TransitionLogic] After TOOL_RUNNER. Routing back to ${GraphPhase.PLANNER}.`);
                return GraphPhase.PLANNER;

            case GraphPhase.ERROR_HANDLER:
                // After handling an error, we re-plan.
                console.log(`[TransitionLogic] After ERROR_HANDLER. Routing back to ${GraphPhase.PLANNER}.`);
                return GraphPhase.PLANNER;

            default:
                console.log(`[TransitionLogic] Unhandled phase: ${currentPhase}. Routing to ${GraphPhase.ERROR}.`);
                return GraphPhase.ERROR;
        }
    }
}
