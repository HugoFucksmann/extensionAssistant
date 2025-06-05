// src/shared/config2.ts (example changes needed)
// Remove or comment out ReAct engine configurations

export interface BackendConfig {
    langgraph: {
        maxIterations: number;
        performanceMonitoring: boolean;
        // Remove: enabled: boolean; // Since it's now the only engine
    };
    // Remove any ReAct engine specific configs
}

const developmentConfig: BackendConfig = {
    langgraph: {
        maxIterations: 10,
        performanceMonitoring: true,
    }
};

const productionConfig: BackendConfig = {
    langgraph: {
        maxIterations: 8,
        performanceMonitoring: false,
    }
};

export function getConfig(env: 'development' | 'production'): { backend: BackendConfig } {
    return {
        backend: env === 'production' ? productionConfig : developmentConfig
    };
}