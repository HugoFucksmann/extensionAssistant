// src/core/langgraph/config/EngineConfig.ts
import { GraphPhase } from "../state/GraphState";

export interface EngineConfig {
    maxGraphIterations: number;
    maxNodeIterations: Partial<Record<GraphPhase, number>>;
}

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
    maxGraphIterations: 40,
    maxNodeIterations: {
        [GraphPhase.EXECUTOR]: 15,
        [GraphPhase.TOOL_RUNNER]: 5,
    }
};