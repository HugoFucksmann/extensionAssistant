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
  shortTermExpiry: number; // Ya existe
  mediumTermExpiry: number; // Ya existe
  maxShortTermReActItems: number; // <--- NUEVO para ReActCycleMemory
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

interface BackendConfig {
  react: ReactConfig;
  memory: MemoryConfig;
  tools: ToolsConfig;
  logging: LoggingConfig;
}

export const getConfig = (env: Environment): { backend: BackendConfig } => {
  const baseBackendConfig: BackendConfig = {
    react: {
      maxIterations: 10, // <--- VALOR POR DEFECTO (antes estaba en OptimizedReActEngine)
      temperature: 0.2,
      maxTokens: 4096
    },
    memory: {
      persistenceEnabled: true,
      storageLocation: 'user',
      shortTermExpiry: 24 * 60 * 60 * 1000,
      mediumTermExpiry: 7 * 24 * 60 * 60 * 1000,
      maxShortTermReActItems: 20, // <--- VALOR POR DEFECTO (antes estaba en ReActCycleMemory),
    },
    tools: {
      maxConcurrentTools: 3,
      timeoutMs: 30000,
      git: {
        pushTimeoutMs: 60000,    // 1 minuto para push
        defaultTimeoutMs: 30000,  // 30 segundos para operaciones generales
        fetchTimeoutMs: 45000,    // 45 segundos para fetch
        pullTimeoutMs: 90000      // 1.5 minutos para pull (puede ser lento con muchos cambios)
      }
    },
    logging: {
      level: env === 'development' ? 'debug' : 'info',
      logToConsole: true,
      logToFile: true // Asumiendo que quieres mantener esto configurable aquí
    }
  };

  return {
    backend: baseBackendConfig,
  };
};