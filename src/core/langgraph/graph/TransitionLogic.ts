// src/core/langgraph/graph/TransitionLogic.ts
import { GraphPhase, SimplifiedOptimizedGraphState } from "../state/GraphState";

export class TransitionLogic {
    public static afterPlanner(state: SimplifiedOptimizedGraphState): string {
        console.log(`[TransitionLogic] Routing from phase: ${state.currentPhase}`);


        if (state.error) {
            console.log(`[TransitionLogic] Error detected. Routing to ${GraphPhase.ERROR_HANDLER}.`);
            return GraphPhase.ERROR_HANDLER;
        }


        if (state.isCompleted) {
            console.log(`[TransitionLogic] Plan is complete. Routing to ${GraphPhase.RESPONSE}.`);
            return GraphPhase.RESPONSE;
        }


        console.log(`[TransitionLogic] Plan has next step. Routing to ${GraphPhase.EXECUTOR}.`);
        return GraphPhase.EXECUTOR;
    }
}