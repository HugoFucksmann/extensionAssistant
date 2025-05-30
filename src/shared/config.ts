
type Environment = 'development' | 'production';

interface ReactConfig {
  maxIterations: number;
  temperature: number;
  maxTokens: number;
}

interface UIConfig {
  // (Eliminados campos no usados)
}

interface MemoryConfig {
  persistenceEnabled: boolean;
  storageLocation: string;
  shortTermExpiry: number;
  mediumTermExpiry: number;
  vectorDbPath: string;
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

interface FrontendConfig {
  ui: UIConfig;
}

export const getConfig = (env: Environment): {backend: BackendConfig; frontend: FrontendConfig} => {
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
      vectorDbPath: 'windsurf-memory'
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

  const baseFrontendConfig: FrontendConfig = {
    ui: {
      openPanelOnStartup: false,
      darkThemeByDefault: true,
      showToolExecution: true
    }
  };

  return {
    backend: baseBackendConfig,
    frontend: baseFrontendConfig
  };
};


