// src/core/langgraph/config/EnvironmentConfig.ts
import { DEFAULT_ENGINE_CONFIG, EngineConfig } from "./EngineConfig";
import { GraphPhase } from "../state/GraphState";

export class EnvironmentConfig {
    static getConfig(environment: 'development' | 'production'): EngineConfig {
        const baseConfig = DEFAULT_ENGINE_CONFIG;

        switch (environment) {
            case 'development':
                return {
                    ...baseConfig,
                    maxGraphIterations: 50,
                    maxNodeIterations: {
                        ...baseConfig.maxNodeIterations,
                        [GraphPhase.EXECUTION]: 15,
                    },

                };

            case 'production':
                return {
                    ...baseConfig,
                    maxGraphIterations: 15,
                    maxNodeIterations: {
                        ...baseConfig.maxNodeIterations,
                        [GraphPhase.EXECUTION]: 5,
                    },
                };

            default:
                return baseConfig;
        }
    }
}