// src/core/LangGraphAdapter.ts

import { LangGraphEngine } from './LangGraphEngine';
import { OptimizedReActEngine } from './OptimizedReActEngine';
import { WindsurfState } from '@core/types';
import { ModelManager } from '../ModelManager';
import { ToolRegistry } from '../tools/ToolRegistry';
import { InternalEventDispatcher } from '../../core/events/InternalEventDispatcher';
import { MemoryManager } from '../../memory/MemoryManager';
import { getConfig } from '../../shared/config';

export class LangGraphAdapter {
  private langGraphEngine: LangGraphEngine;
  private fallbackEngine: OptimizedReActEngine;
  private useLangGraph: boolean;

  constructor(
    modelManager: ModelManager,
    toolRegistry: ToolRegistry,
    dispatcher: InternalEventDispatcher,
    memoryManager: MemoryManager
  ) {
    // Initialize both engines
    this.langGraphEngine = new LangGraphEngine(modelManager, toolRegistry, dispatcher, memoryManager);
    this.fallbackEngine = new OptimizedReActEngine(modelManager, toolRegistry, dispatcher, memoryManager);
    
    // Check if LangGraph is enabled in config
    const config = getConfig(process.env.NODE_ENV === 'production' ? 'production' : 'development');
    this.useLangGraph = config.backend?.langgraph?.enabled ?? false;
    
    dispatcher.systemInfo(
      `LangGraphAdapter initialized. LangGraph enabled: ${this.useLangGraph}`,
      { useLangGraph: this.useLangGraph },
      'LangGraphAdapter'
    );
  }

  public async run(state: WindsurfState): Promise<WindsurfState> {
    if (!this.useLangGraph) {
      return this.fallbackEngine.run(state);
    }

    try {
      console.log('[LangGraphAdapter] Using LangGraph engine');
      return await this.langGraphEngine.run(state);
    } catch (error: any) {
      console.warn('[LangGraphAdapter] LangGraph failed, falling back to OptimizedReActEngine:', error.message);
      
      // Add fallback information to state
      const fallbackState = {
        ...state,
        history: [
          ...(state.history || []),
          {
            timestamp: Date.now(),
            phase: 'system_message' as const,
            content: `LangGraph execution failed, using fallback engine: ${error.message}`,
            metadata: {
              status: 'warning' as const,
              iteration: state.iterationCount || 0,
              fallback: true
            }
          }
        ]
      };

      return this.fallbackEngine.run(fallbackState);
    }
  }

  public dispose(): void {
    this.langGraphEngine.dispose();
    this.fallbackEngine.dispose();
  }
}

// src/core/PerformanceMonitor.ts

export interface NodePerformance {
  nodeName: string;
  averageDuration: number;
  callCount: number;
  errorRate: number;
  lastError?: string;
}

export class PerformanceMonitor {
  private nodeMetrics: Map<string, {
    durations: number[];
    errors: number;
    totalCalls: number;
    lastError?: string;
  }> = new Map();

  public trackNodeExecution(nodeName: string, duration: number, error?: string): void {
    if (!this.nodeMetrics.has(nodeName)) {
      this.nodeMetrics.set(nodeName, {
        durations: [],
        errors: 0,
        totalCalls: 0
      });
    }

    const metrics = this.nodeMetrics.get(nodeName)!;
    metrics.durations.push(duration);
    metrics.totalCalls++;
    
    if (error) {
      metrics.errors++;
      metrics.lastError = error;
    }

    // Keep only last 100 measurements
    if (metrics.durations.length > 100) {
      metrics.durations.shift();
    }
  }

  public identifyBottlenecks(): NodePerformance[] {
    const performances: NodePerformance[] = [];

    for (const [nodeName, metrics] of this.nodeMetrics) {
      const averageDuration = metrics.durations.reduce((a, b) => a + b, 0) / metrics.durations.length;
      const errorRate = metrics.errors / metrics.totalCalls;

      performances.push({
        nodeName,
        averageDuration,
        callCount: metrics.totalCalls,
        errorRate,
        lastError: metrics.lastError
      });
    }

    return performances.sort((a, b) => b.averageDuration - a.averageDuration);
  }

  public getNodeMetrics(nodeName: string): NodePerformance | undefined {
    const metrics = this.nodeMetrics.get(nodeName);
    if (!metrics) return undefined;

    const averageDuration = metrics.durations.reduce((a, b) => a + b, 0) / metrics.durations.length;
    const errorRate = metrics.errors / metrics.totalCalls;

    return {
      nodeName,
      averageDuration,
      callCount: metrics.totalCalls,
      errorRate,
      lastError: metrics.lastError
    };
  }

  public reset(): void {
    this.nodeMetrics.clear();
  }
}

// src/core/StreamingLangGraphEngine.ts

import { AsyncIterator } from '@langchain/core/utils/async_iterator';

export class StreamingLangGraphEngine extends LangGraphEngine {
  public async *streamResponse(initialState: WindsurfState): AsyncGenerator<string, WindsurfState> {
    const startTime = Date.now();
    let finalState = initialState;
    
    try {
      // Convert to graph state
      const graphState = this.convertToGraphState(initialState);
      
      // Stream the graph execution
      for await (const chunk of this.graph.stream(graphState, {
        configurable: { thread_id: initialState.chatId }
      })) {
        // Extract streaming content from different nodes
        if (chunk.analyze) {
          yield `🔍 Analyzing: ${chunk.analyze.context?.working || 'Processing your request...'}\n`;
        }
        
        if (chunk.execute) {
          const toolName = chunk.execute.execution?.current_tool;
          if (toolName) {
            yield `🔧 Using tool: ${toolName}\n`;
          }
        }
        
        if (chunk.validate) {
          const errors = chunk.validate.validation?.errors;
          if (errors && errors.length > 0) {
            yield `⚠️ Validating and correcting issues...\n`;
          }
        }
        
        if (chunk.respond) {
          const response = chunk.respond.metadata?.finalOutput;
          if (response) {
            yield response;
            finalState = this.convertFromGraphState(chunk.respond, initialState);
          }
        }
      }
      
      return finalState;
      
    } catch (error: any) {
      yield `❌ Error: ${error.message}\n`;
      return {
        ...initialState,
        error: error.message,
        completionStatus: 'failed' as const,
        finalOutput: 'Error occurred during streaming execution'
      };
    }
  }

  private convertToGraphState(state: WindsurfState): any {
    // Implementation similar to main LangGraphEngine
    return {
      messages: [{ content: state.userMessage || '', type: 'human' }],
      context: {
        working: '',
        memory: '',
        iteration: state.iterationCount || 0
      },
      execution: {
        plan: [],
        tools_used: []
      },
      metadata: {
        chatId: state.chatId,
        startTime: Date.now(),
        isCompleted: false
      }
    };
  }

  private convertFromGraphState(graphState: any, originalState: WindsurfState): WindsurfState {
    return {
      ...originalState,
      iterationCount: graphState.context?.iteration || 0,
      finalOutput: graphState.metadata?.finalOutput || "Process completed",
      completionStatus: graphState.metadata?.isCompleted ? 'completed' : 'in_progress'
    };
  }
}

// src/shared/config/langgraph.ts

export interface LangGraphConfig {
  enabled: boolean;
  maxIterations: number;
  validationThreshold: number;
  memoryWindowSize: number;
  autoAdjust: boolean;
  streaming: boolean;
  performance: {
    monitoring: boolean;
    bottleneckThreshold: number; // ms
  };
}

export const defaultLangGraphConfig: LangGraphConfig = {
  enabled: false, // Start disabled for gradual rollout
  maxIterations: 10,
  validationThreshold: 0.8,
  memoryWindowSize: 5,
  autoAdjust: true,
  streaming: false,
  performance: {
    monitoring: true,
    bottleneckThreshold: 1000
  }
};

// src/core/LangGraphFactory.ts

export class LangGraphFactory {
  public static createEngine(
    modelManager: ModelManager,
    toolRegistry: ToolRegistry,
    dispatcher: InternalEventDispatcher,
    memoryManager: MemoryManager,
    config?: Partial<LangGraphConfig>
  ): LangGraphAdapter {
    // Update config with LangGraph-specific settings
    const langGraphConfig = { ...defaultLangGraphConfig, ...config };
    
    // Set runtime config
    if (config) {
      const currentConfig = getConfig(process.env.NODE_ENV === 'production' ? 'production' : 'development');
      currentConfig.backend = {
        ...currentConfig.backend,
        langgraph: langGraphConfig
      };
    }

    const adapter = new LangGraphAdapter(modelManager, toolRegistry, dispatcher, memoryManager);
    
    dispatcher.systemInfo(
      'LangGraphFactory created engine',
      { config: langGraphConfig },
      'LangGraphFactory'
    );

    return adapter;
  }

  public static createStreamingEngine(
    modelManager: ModelManager,
    toolRegistry: ToolRegistry,
    dispatcher: InternalEventDispatcher,
    memoryManager: MemoryManager,
    config?: Partial<LangGraphConfig>
  ): StreamingLangGraphEngine {
    const streamingConfig = { ...defaultLangGraphConfig, ...config, streaming: true };
    
    return new StreamingLangGraphEngine(modelManager, toolRegistry, dispatcher, memoryManager);
  }
}

// Integration example for existing code
// src/core/EngineManager.ts

export class EngineManager {
  private currentEngine: LangGraphAdapter;
  private performanceMonitor: PerformanceMonitor;

  constructor(
    private modelManager: ModelManager,
    private toolRegistry: ToolRegistry,
    private dispatcher: InternalEventDispatcher,
    private memoryManager: MemoryManager
  ) {
    this.performanceMonitor = new PerformanceMonitor();
    this.currentEngine = LangGraphFactory.createEngine(
      modelManager,
      toolRegistry,
      dispatcher,
      memoryManager
    );
  }

  public async execute(state: WindsurfState): Promise<WindsurfState> {
    const startTime = Date.now();
    
    try {
      const result = await this.currentEngine.run(state);
      
      this.performanceMonitor.trackNodeExecution(
        'full_execution',
        Date.now() - startTime
      );
      
      return result;
    } catch (error: any) {
      this.performanceMonitor.trackNodeExecution(
        'full_execution',
        Date.now() - startTime,
        error.message
      );
      throw error;
    }
  }

  public getPerformanceMetrics(): NodePerformance[] {
    return this.performanceMonitor.identifyBottlenecks();
  }

  public switchToLangGraph(enable: boolean): void {
    // Recreate engine with new configuration
    this.currentEngine.dispose();
    this.currentEngine = LangGraphFactory.createEngine(
      this.modelManager,
      this.toolRegistry,
      this.dispatcher,
      this.memoryManager,
      { enabled: enable }
    );
  }

  public dispose(): void {
    this.currentEngine.dispose();
    this.performanceMonitor.reset();
  }
}