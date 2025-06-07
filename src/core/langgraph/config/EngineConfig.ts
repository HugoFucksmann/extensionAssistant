// src/core/langgraph/config/EngineConfig.ts
import { GraphPhase } from "../state/GraphState";

export interface EngineConfig {
    maxGraphIterations: number;
    maxNodeIterations: Partial<Record<GraphPhase, number>>;
}

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
    maxGraphIterations: 20,
    maxNodeIterations: {
        [GraphPhase.EXECUTION]: 8,
        [GraphPhase.VALIDATION]: 3,
    }
};