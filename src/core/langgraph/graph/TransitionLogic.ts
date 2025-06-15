// src/core/langgraph/graph/TransitionLogic.ts
import { GraphPhase, SimplifiedOptimizedGraphState } from "../state/GraphState";

export class TransitionLogic {
    public static afterPlanner(state: SimplifiedOptimizedGraphState): string {
        console.log(`[TransitionLogic] Routing from phase: ${state.currentPhase}`);

        // MODIFICAR: Esta es ahora la condición de máxima prioridad.
        // Si cualquier nodo anterior (incluido el propio Planner) ha establecido un error,
        // se debe ir al manejador de errores inmediatamente.
        if (state.error) {
            console.log(`[TransitionLogic] Error detected. Routing to ${GraphPhase.ERROR_HANDLER}.`);
            return GraphPhase.ERROR_HANDLER;
        }

        // La lógica original se mantiene, pero ahora es la segunda prioridad.
        if (state.isCompleted) {
            console.log(`[TransitionLogic] Plan is complete. Routing to ${GraphPhase.RESPONSE}.`);
            return GraphPhase.RESPONSE;
        }

        // Si no hay errores y el plan no está completo, vamos al ejecutor.
        console.log(`[TransitionLogic] Plan has next step. Routing to ${GraphPhase.EXECUTOR}.`);
        return GraphPhase.EXECUTOR;
    }
}