// src/core/langgraph/state/StateValidator.ts
import { GraphPhase, SimplifiedOptimizedGraphState } from "./GraphState";

export interface ValidationResult {
    valid: boolean;
    error?: string;
}

export class StateValidator {
    static validateTransition(
        from: GraphPhase,
        to: GraphPhase,
        state: SimplifiedOptimizedGraphState
    ): ValidationResult {
        const validTransitions: Partial<Record<GraphPhase, GraphPhase[]>> = {
            [GraphPhase.ANALYSIS]: [GraphPhase.EXECUTION, GraphPhase.RESPONSE, GraphPhase.ERROR],
            [GraphPhase.EXECUTION]: [GraphPhase.EXECUTION, GraphPhase.VALIDATION, GraphPhase.RESPONSE, GraphPhase.ERROR],
            [GraphPhase.VALIDATION]: [GraphPhase.EXECUTION, GraphPhase.RESPONSE, GraphPhase.ERROR],
            [GraphPhase.RESPONSE]: [GraphPhase.COMPLETED, GraphPhase.ERROR]
        };

        if (!validTransitions[from]?.includes(to)) {
            return { valid: false, error: `Invalid transition from ${from} to ${to}` };
        }

        // Aquí se podrían añadir más validaciones de consistencia del estado si fuera necesario.

        return { valid: true };
    }
}