
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

}

interface ToolsConfig {
  maxConcurrentTools: number;
  timeoutMs: number;
}


interface LoggingConfig {
  level: 'debug' | 'info'; // Nivel global para la consola
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
      maxIterations: 15,
      temperature: 0.2,
      maxTokens: 4096
    },
    memory: {
      persistenceEnabled: true,
      storageLocation: 'user',
      shortTermExpiry: 24 * 60 * 60 * 1000,
      mediumTermExpiry: 7 * 24 * 60 * 60 * 1000,

    },
    tools: {
      maxConcurrentTools: 3,
      timeoutMs: 30000
    },
    logging: {
      level: env === 'development' ? 'debug' : 'info',
      logToConsole: true,
      logToFile: true
    }
  };


  return {
    backend: baseBackendConfig,
  };
};


