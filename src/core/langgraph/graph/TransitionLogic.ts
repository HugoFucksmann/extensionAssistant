// src/core/langgraph/graph/TransitionLogic.ts
import { GraphPhase, SimplifiedOptimizedGraphState } from "../state/GraphState";

export class TransitionLogic {
    public static afterPlanner(state: SimplifiedOptimizedGraphState): string {
        console.log(`[TransitionLogic] Routing from phase: ${state.currentPhase}`);

        // Prioridad 1: Si hay un error, ir al manejador de errores.
        if (state.error) {
            console.log(`[TransitionLogic] Error detected. Routing to ${GraphPhase.ERROR_HANDLER}.`);
            return GraphPhase.ERROR_HANDLER;
        }

        // Prioridad 2: Si el planificador marcó el plan como completo, ir a responder.
        if (state.isCompleted) {
            console.log(`[TransitionLogic] Plan is complete. Routing to ${GraphPhase.RESPONSE}.`);
            return GraphPhase.RESPONSE;
        }

        // Si no hay errores y el plan no está completo, significa que hay una nueva tarea.
        // Por lo tanto, vamos al ejecutor.
        console.log(`[TransitionLogic] Plan has next step. Routing to ${GraphPhase.EXECUTOR}.`);
        return GraphPhase.EXECUTOR;
    }
}