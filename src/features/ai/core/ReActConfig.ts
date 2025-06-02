// src/core/ReActConfig.ts

export interface ReActEngineConfig {
    // Cycle settings
    maxIterations: number;
    iterationTimeout: number; // milliseconds
    
    // Tool execution settings
    toolTimeout: number;
    enableToolDeduplication: boolean;
    maxToolRetries: number;
    
    // Memory settings
    enableShortTermMemory: boolean;
    enableLongTermMemory: boolean;
    memoryRetentionLimit: number;
    
    // Chain settings
    enableChainCaching: boolean;
    chainCacheTimeout: number;
    enableAutoCorrection: boolean;
    maxCorrectionAttempts: number;
    
    // Logging and debugging
    enableVerboseLogging: boolean;
    enablePerformanceMetrics: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    
    // Error handling
    enableGracefulDegradation: boolean;
    maxConsecutiveErrors: number;
    enableFallbackResponses: boolean;
    
    // Response generation
    enableResponseStreaming: boolean;
    responseTimeout: number;
    minResponseConfidence: number;
  }
  
  export const DEFAULT_REACT_CONFIG: ReActEngineConfig = {
    // Cycle settings
    maxIterations: 10,
    iterationTimeout: 30000, // 30 seconds
    
    // Tool execution settings
    toolTimeout: 15000, // 15 seconds
    enableToolDeduplication: true,
    maxToolRetries: 2,
    
    // Memory settings
    enableShortTermMemory: true,
    enableLongTermMemory: true,
    memoryRetentionLimit: 100,
    
    // Chain settings
    enableChainCaching: true,
    chainCacheTimeout: 300000, // 5 minutes
    enableAutoCorrection: true,
    maxCorrectionAttempts: 2,
    
    // Logging and debugging
    enableVerboseLogging: false,
    enablePerformanceMetrics: true,
    logLevel: 'info',
    
    // Error handling
    enableGracefulDegradation: true,
    maxConsecutiveErrors: 3,
    enableFallbackResponses: true,
    
    // Response generation
    enableResponseStreaming: false,
    responseTimeout: 20000, // 20 seconds
    minResponseConfidence: 0.3,
  };
  
  export class ReActConfigManager {
    private config: ReActEngineConfig;
    private configHistory: ReActEngineConfig[] = [];
    
    constructor(initialConfig: Partial<ReActEngineConfig> = {}) {
      this.config = { ...DEFAULT_REACT_CONFIG, ...initialConfig };
      this.configHistory.push({ ...this.config });
    }
  
    /**
     * Get current configuration
     */
    getConfig(): Readonly<ReActEngineConfig> {
      return Object.freeze({ ...this.config });
    }
  
    /**
     * Update configuration
     */
    updateConfig(updates: Partial<ReActEngineConfig>): void {
      const oldConfig = { ...this.config };
      this.config = { ...this.config, ...updates };
      
      // Validate configuration
      this.validateConfig();
      
      // Store in history
      this.configHistory.push({ ...this.config });
      
      // Keep only last 10 configurations
      if (this.configHistory.length > 10) {
        this.configHistory = this.configHistory.slice(-10);
      }
      
      console.log('[ReActConfig] Configuration updated:', {
        changes: this.getConfigDiff(oldConfig, this.config),
        timestamp: new Date().toISOString()
      });
    }
  
    /**
     * Reset to default configuration
     */
    resetToDefault(): void {
      this.updateConfig(DEFAULT_REACT_CONFIG);
    }
  
    /**
     * Get configuration for specific environment
     */
    static getEnvironmentConfig(env: 'development' | 'testing' | 'production'): Partial<ReActEngineConfig> {
      switch (env) {
        case 'development':
          return {
            enableVerboseLogging: true,
            logLevel: 'debug',
            maxIterations: 15,
            iterationTimeout: 60000,
            enablePerformanceMetrics: true
          };
        
        case 'testing':
          return {
            enableVerboseLogging: false,
            logLevel: 'warn',
            maxIterations: 5,
            iterationTimeout: 10000,
            enableChainCaching: false,
            toolTimeout: 5000
          };
        
        case 'production':
          return {
            enableVerboseLogging: false,
            logLevel: 'error',
            maxIterations: 8,
            iterationTimeout: 25000,
            enablePerformanceMetrics: false,
            enableGracefulDegradation: true
          };
        
        default:
          return {};
      }
    }
  
    /**
     * Get optimized configuration for specific use cases
     */
    static getOptimizedConfig(useCase: 'speed' | 'accuracy' | 'reliability'): Partial<ReActEngineConfig> {
      switch (useCase) {
        case 'speed':
          return {
            maxIterations: 5,
            iterationTimeout: 15000,
            toolTimeout: 8000,
            enableChainCaching: true,
            maxCorrectionAttempts: 1,
            responseTimeout: 10000
          };
        
        case 'accuracy':
          return {
            maxIterations: 15,
            iterationTimeout: 45000,
            toolTimeout: 25000,
            enableAutoCorrection: true,
            maxCorrectionAttempts: 3,
            minResponseConfidence: 0.7,
            maxToolRetries: 3
          };
        
        case 'reliability':
          return {
            maxIterations: 10,
            enableGracefulDegradation: true,
            enableFallbackResponses: true,
            maxConsecutiveErrors: 2,
            maxToolRetries: 3,
            responseTimeout: 30000
          };
        
        default:
          return {};
      }
    }
  
    /**
     * Validate configuration
     */
    private validateConfig(): void {
      const errors: string[] = [];
      
      if (this.config.maxIterations < 1 || this.config.maxIterations > 50) {
        errors.push('maxIterations must be between 1 and 50');
      }
      
      if (this.config.iterationTimeout < 1000) {
        errors.push('iterationTimeout must be at least 1000ms');
      }
      
      if (this.config.toolTimeout < 1000) {
        errors.push('toolTimeout must be at least 1000ms');
      }
      
      if (this.config.minResponseConfidence < 0 || this.config.minResponseConfidence > 1) {
        errors.push('minResponseConfidence must be between 0 and 1');
      }
      
      if (errors.length > 0) {
        throw new Error(`Invalid configuration: ${errors.join(', ')}`);
      }
    }
  
    /**
     * Get configuration differences
     */
    private getConfigDiff(oldConfig: ReActEngineConfig, newConfig: ReActEngineConfig): Record<string, { old: any; new: any }> {
      const diff: Record<string, { old: any; new: any }> = {};
      
      for (const [key, newValue] of Object.entries(newConfig)) {
        const oldValue = oldConfig[key as keyof ReActEngineConfig];
        if (oldValue !== newValue) {
          diff[key] = { old: oldValue, new: newValue };
        }
      }
      
      return diff;
    }
  
    /**
     * Get configuration history
     */
    getConfigHistory(): Readonly<ReActEngineConfig[]> {
      return Object.freeze([...this.configHistory]);
    }
  
    /**
     * Export configuration to JSON
     */
    exportConfig(): string {
      return JSON.stringify(this.config, null, 2);
    }
  
    /**
     * Import configuration from JSON
     */
    importConfig(jsonConfig: string): void {
      try {
        const config = JSON.parse(jsonConfig);
        this.updateConfig(config);
      } catch (error) {
        throw new Error(`Failed to import configuration: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
      }
    }
  
    /**
     * Get performance-optimized configuration based on system resources
     */
    static getResourceOptimizedConfig(resources: {
      memoryMB: number;
      cpuCores: number;
      networkSpeed: 'slow' | 'medium' | 'fast';
    }): Partial<ReActEngineConfig> {
      const config: Partial<ReActEngineConfig> = {};
      
      // Adjust based on memory
      if (resources.memoryMB < 2048) {
        config.enableChainCaching = false;
        config.memoryRetentionLimit = 50;
        config.maxIterations = 5;
      } else if (resources.memoryMB > 8192) {
        config.enableChainCaching = true;
        config.memoryRetentionLimit = 200;
        config.maxIterations = 15;
      }
      
      // Adjust based on CPU
      if (resources.cpuCores < 2) {
        config.iterationTimeout = 45000;
        config.toolTimeout = 20000;
      } else if (resources.cpuCores > 4) {
        config.iterationTimeout = 20000;
        config.toolTimeout = 10000;
      }
      
      // Adjust based on network
      switch (resources.networkSpeed) {
        case 'slow':
          config.responseTimeout = 45000;
          config.toolTimeout = 30000;
          break;
        case 'fast':
          config.responseTimeout = 15000;
          config.toolTimeout = 8000;
          break;
      }
      
      return config;
    }
  }