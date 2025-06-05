// src/shared/config.ts

type Environment = 'development' | 'production';

interface ReactConfig {
    maxIterations: number;
    temperature: number;
    maxTokens: number;
}

interface MemoryConfig {
    persistenceEnabled: boolean;
    storageLocation: string;
    shortTermExpiry: number;
    mediumTermExpiry: number;
    maxShortTermReActItems: number;
}

interface GitToolsConfig {
    pushTimeoutMs: number;
    defaultTimeoutMs: number;
    fetchTimeoutMs: number;
    pullTimeoutMs: number;
}

interface ToolsConfig {
    maxConcurrentTools: number;
    timeoutMs: number;
    git: GitToolsConfig;
}

interface LoggingConfig {
    level: 'debug' | 'info';
    logToConsole: boolean;
    logToFile: boolean;
}

// NUEVA INTERFAZ PARA CONFIGURACIÓN DE LANGGRAPH
interface LangGraphConfig {
    enabled: boolean;
    maxIterations: number;
    streaming: boolean; // Aunque no lo implementemos de inmediato, es bueno tenerlo
    performanceMonitoring: boolean;
}

interface BackendConfig {
    react: ReactConfig;
    memory: MemoryConfig;
    tools: ToolsConfig;
    logging: LoggingConfig;
    langgraph: LangGraphConfig; // AÑADIR langgraph a BackendConfig
}

export const getConfig = (env: Environment): { backend: BackendConfig } => {
    const baseBackendConfig: BackendConfig = {
        react: {
            maxIterations: 10,
            temperature: 0.2,
            maxTokens: 4096
        },
        memory: {
            persistenceEnabled: true,
            storageLocation: 'user',
            shortTermExpiry: 24 * 60 * 60 * 1000,
            mediumTermExpiry: 7 * 24 * 60 * 60 * 1000,
            maxShortTermReActItems: 20,
        },
        tools: {
            maxConcurrentTools: 3,
            timeoutMs: 30000,
            git: {
                pushTimeoutMs: 60000,
                defaultTimeoutMs: 30000,
                fetchTimeoutMs: 45000,
                pullTimeoutMs: 90000
            }
        },
        logging: {
            level: env === 'development' ? 'debug' : 'info',
            logToConsole: true,
            logToFile: true
        },
        // VALORES POR DEFECTO PARA LANGGRAPH
        langgraph: {
            enabled: true, // LangGraph desactivado por defecto
            maxIterations: 8, // Un poco menos que ReAct para empezar
            streaming: false,
            performanceMonitoring: true,
        }
    };

    return {
        backend: baseBackendConfig,
    };
};