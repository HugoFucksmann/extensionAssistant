/**
 * Configuración para la arquitectura Windsurf
 */
export const WindsurfConfig = {
    // Configuración del ciclo ReAct
    react: {
      maxIterations: 15,
      defaultModelProvider: 'gemini',
      defaultModelName: 'gemini-pro',
      temperature: 0.7,
      maxTokens: 4096
    },
    
    // Configuración de la UI
    ui: {
      openPanelOnStartup: false,
      darkThemeByDefault: true,
      showToolExecution: true
    },
    
    // Configuración de memoria
    memory: {
      persistenceEnabled: true,
      storageLocation: 'user',
      shortTermExpiry: 24 * 60 * 60 * 1000, // 24 horas
      mediumTermExpiry: 7 * 24 * 60 * 60 * 1000, // 7 días
      vectorDbPath: 'windsurf-memory'
    },
    
    // Configuración de herramientas
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
      timeoutMs: 30000 // 30 segundos
    },
    
    // Configuración de logging
    logging: {
      level: 'info', // 'debug' | 'info' | 'warn' | 'error'
      logToFile: true,
      logFilePath: 'windsurf.log'
    }
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
  
  /**
   * Configuración de comandos de la extensión
   */
  export const CommandIds = {
    OPEN_PANEL: 'extensionAssistant.openPanel',
    PROCESS_MESSAGE: 'extensionAssistant.processMessage',
    CLEAR_CONVERSATION: 'extensionAssistant.clearConversation',
    SWITCH_MODEL: 'extensionAssistant.switchModel',
    EXPORT_CONVERSATION: 'extensionAssistant.exportConversation',
    IMPORT_CONVERSATION: 'extensionAssistant.importConversation'
  };
  