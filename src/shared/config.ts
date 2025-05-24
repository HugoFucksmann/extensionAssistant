/**
 * Configuración para la arquitectura Windsurf
 */

type Environment = 'development' | 'production';

interface ReactConfig {
  maxIterations: number;
  defaultModelProvider: string;
  defaultModelName: string;
  temperature: number;
  maxTokens: number;
}

interface UIConfig {
  openPanelOnStartup: boolean;
  darkThemeByDefault: boolean;
  showToolExecution: boolean;
}

interface MemoryConfig {
  persistenceEnabled: boolean;
  storageLocation: string;
  shortTermExpiry: number;
  mediumTermExpiry: number;
  vectorDbPath: string;
}

interface ToolsConfig {
  enabledTools: string[];
  maxConcurrentTools: number;
  timeoutMs: number;
}

interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  logToFile: boolean;
  logFilePath: string;
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
      defaultModelProvider: env === 'production' ? 'gemini' : 'mock',
      defaultModelName: env === 'production' ? 'gemini-pro' : 'mock',
      temperature: 0.7,
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
      enabledTools: [
        'getFileContents',
        'writeToFile',
        'listFiles',
        'getActiveEditorContent',
        'applyTextEdit',
        'searchWorkspace',
        'getProjectInfo',
        'respond'
      ],
      maxConcurrentTools: 3,
      timeoutMs: 30000
    },
    logging: {
      level: env === 'development' ? 'debug' : 'info',
      logToFile: true,
      logFilePath: 'windsurf.log'
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

/**
 * Tipos de nodos en el grafo ReAct
 */
export enum ReActNodeType {
  INITIAL_ANALYSIS = 'initialAnalysis',
  REASONING = 'reasoning',
  ACTION = 'action',
  REFLECTION = 'reflection',
  CORRECTION = 'correction',
  RESPONSE_GENERATION = 'responseGeneration'
}

/**
 * Tipos de transiciones en el grafo ReAct
 */
export enum ReActTransitionType {
  TO_REASONING = 'toReasoning',
  TO_ACTION = 'toAction',
  TO_REFLECTION = 'toReflection',
  TO_CORRECTION = 'toCorrection',
  TO_RESPONSE = 'toResponse',
  TO_END = 'toEnd'
}

