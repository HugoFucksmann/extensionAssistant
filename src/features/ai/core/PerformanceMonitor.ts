// src/core/PerformanceMonitor.ts

export interface PerformanceMetrics {
    // Timing metrics
    totalExecutionTime: number;
    averageIterationTime: number;
    toolExecutionTimes: Record<string, number[]>;
    chainExecutionTimes: {
      analysis: number[];
      reasoning: number[];
      action: number[];
      response: number[];
    };
    
    // Success metrics
    successRate: number;
    toolSuccessRates: Record<string, number>;
    iterationCompletionRate: number;
    
    // Resource metrics
    memoryUsage: number[];
    peakMemoryUsage: number;
    
    // Error metrics
    errorCount: number;
    errorTypes: Record<string, number>;
    consecutiveErrors: number;
    
    // Throughput metrics
    requestsProcessed: number;
    averageResponseTime: number;
    
    // Quality metrics
    averageConfidence: number;
    fallbackResponseRate: number;
  }
  
  export interface SessionMetrics {
    sessionId: string;
    startTime: number;
    endTime?: number;
    metrics: PerformanceMetrics;
    chatId?: string;
  }

  export interface ChainTimingData {
    chainType: 'analysis' | 'reasoning' | 'action' | 'response';
    duration: number;
    success: boolean;
    timestamp: number;
  }

  export interface ToolTimingData {
    toolName: string;
    duration: number;
    success: boolean;
    timestamp: number;
  }
  
  export class PerformanceMonitor {
    private sessions: Map<string, SessionMetrics> = new Map();
    private globalMetrics: PerformanceMetrics;
    private isEnabled: boolean = true;
    private memoryCheckInterval?: NodeJS.Timeout;
  
    constructor() {
      this.globalMetrics = this.createEmptyMetrics();
      this.startMemoryMonitoring();
    }
  
    /**
     * Create empty metrics structure
     */
    private createEmptyMetrics(): PerformanceMetrics {
      return {
        totalExecutionTime: 0,
        averageIterationTime: 0,
        toolExecutionTimes: {},
        chainExecutionTimes: {
          analysis: [],
          reasoning: [],
          action: [],
          response: []
        },
        successRate: 1.0,
        toolSuccessRates: {},
        iterationCompletionRate: 1.0,
        memoryUsage: [],
        peakMemoryUsage: 0,
        errorCount: 0,
        errorTypes: {},
        consecutiveErrors: 0,
        requestsProcessed: 0,
        averageResponseTime: 0,
        averageConfidence: 0,
        fallbackResponseRate: 0
      };
    }

    /**
     * Start monitoring a session
     */
    startSession(sessionId: string, chatId?: string): void {
      if (!this.isEnabled) return;
  
      const session: SessionMetrics = {
        sessionId,
        startTime: Date.now(),
        metrics: this.createEmptyMetrics(),
        chatId
      };
  
      this.sessions.set(sessionId, session);
    }
  
    /**
     * End monitoring a session
     */
    endSession(sessionId: string): SessionMetrics | null {
      if (!this.isEnabled) return null;
  
      const session = this.sessions.get(sessionId);
      if (!session) return null;
  
      session.endTime = Date.now();
      session.metrics.totalExecutionTime = session.endTime - session.startTime;
  
      // Calculate final success rate
      this.calculateSuccessRate(session);
      
      // Update global metrics
      this.updateGlobalMetrics(session.metrics);
  
      return session;
    }
  
    /**
     * Record iteration timing
     */
    recordIteration(sessionId: string, duration: number, success: boolean): void {
      if (!this.isEnabled) return;
  
      const session = this.sessions.get(sessionId);
      if (!session) return;
  
      // Update iteration metrics
      session.metrics.requestsProcessed++;
      
      if (success) {
        session.metrics.consecutiveErrors = 0;
      } else {
        session.metrics.consecutiveErrors++;
        session.metrics.errorCount++;
      }
  
      // Calculate average iteration time
      const prevTotal = session.metrics.averageIterationTime * (session.metrics.requestsProcessed - 1);
      session.metrics.averageIterationTime = (prevTotal + duration) / session.metrics.requestsProcessed;
      
      // Update average response time
      session.metrics.averageResponseTime = session.metrics.averageIterationTime;
    }
  
    /**
     * Record tool execution
     */
    recordToolExecution(
      sessionId: string, 
      toolName: string, 
      duration: number, 
      success: boolean
    ): void {
      if (!this.isEnabled) return;
  
      const session = this.sessions.get(sessionId);
      if (!session) return;
  
      // Record timing
      if (!session.metrics.toolExecutionTimes[toolName]) {
        session.metrics.toolExecutionTimes[toolName] = [];
      }
      session.metrics.toolExecutionTimes[toolName].push(duration);
      
      // Record success rate
      if (!session.metrics.toolSuccessRates[toolName]) {
        session.metrics.toolSuccessRates[toolName] = 0;
      }
      
      const currentRate = session.metrics.toolSuccessRates[toolName];
      const currentCount = session.metrics.toolExecutionTimes[toolName].length;
      const newRate = ((currentRate * (currentCount - 1)) + (success ? 1 : 0)) / currentCount;
      session.metrics.toolSuccessRates[toolName] = newRate;
    }

    /**
     * Record chain execution timing
     */
    recordChainExecution(sessionId: string, chainData: ChainTimingData): void {
      if (!this.isEnabled) return;

      const session = this.sessions.get(sessionId);
      if (!session) return;

      session.metrics.chainExecutionTimes[chainData.chainType].push(chainData.duration);
      
      if (!chainData.success) {
        session.metrics.errorCount++;
        session.metrics.consecutiveErrors++;
      } else {
        session.metrics.consecutiveErrors = 0;
      }
    }

    /**
     * Record error occurrence
     */
    recordError(sessionId: string, errorType: string): void {
      if (!this.isEnabled) return;

      const session = this.sessions.get(sessionId);
      if (!session) return;

      session.metrics.errorCount++;
      session.metrics.consecutiveErrors++;
      
      if (!session.metrics.errorTypes[errorType]) {
        session.metrics.errorTypes[errorType] = 0;
      }
      session.metrics.errorTypes[errorType]++;
    }

    /**
     * Record confidence score
     */
    recordConfidence(sessionId: string, confidence: number): void {
      if (!this.isEnabled) return;

      const session = this.sessions.get(sessionId);
      if (!session) return;

      const currentAvg = session.metrics.averageConfidence;
      const count = session.metrics.requestsProcessed;
      
      if (count === 0) {
        session.metrics.averageConfidence = confidence;
      } else {
        session.metrics.averageConfidence = ((currentAvg * count) + confidence) / (count + 1);
      }
    }

    /**
     * Record fallback response usage
     */
    recordFallbackResponse(sessionId: string): void {
      if (!this.isEnabled) return;

      const session = this.sessions.get(sessionId);
      if (!session) return;

      const currentRate = session.metrics.fallbackResponseRate;
      const count = session.metrics.requestsProcessed;
      
      session.metrics.fallbackResponseRate = ((currentRate * count) + 1) / (count + 1);
    }

    /**
     * Get session metrics
     */
    getSessionMetrics(sessionId: string): SessionMetrics | null {
      return this.sessions.get(sessionId) || null;
    }

    /**
     * Get global metrics
     */
    getGlobalMetrics(): PerformanceMetrics {
      return { ...this.globalMetrics };
    }

    /**
     * Get performance summary
     */
    getPerformanceSummary(sessionId?: string): {
      totalSessions: number;
      activeSessions: number;
      averageSessionDuration: number;
      overallSuccessRate: number;
      mostUsedTools: Array<{ tool: string; usage: number }>;
      commonErrors: Array<{ error: string; count: number }>;
      performanceScore: number;
    } {
      const metrics = sessionId ? 
        this.getSessionMetrics(sessionId)?.metrics || this.createEmptyMetrics() :
        this.globalMetrics;

      const activeSessions = Array.from(this.sessions.values())
        .filter(s => !s.endTime).length;

      const completedSessions = Array.from(this.sessions.values())
        .filter(s => s.endTime);

      const averageSessionDuration = completedSessions.length > 0 ?
        completedSessions.reduce((sum, s) => sum + (s.metrics.totalExecutionTime || 0), 0) / completedSessions.length :
        0;

      const mostUsedTools = Object.entries(metrics.toolExecutionTimes)
        .map(([tool, times]) => ({ tool, usage: times.length }))
        .sort((a, b) => b.usage - a.usage)
        .slice(0, 5);

      const commonErrors = Object.entries(metrics.errorTypes)
        .map(([error, count]) => ({ error, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculate performance score (0-100)
      const performanceScore = this.calculatePerformanceScore(metrics);

      return {
        totalSessions: this.sessions.size,
        activeSessions,
        averageSessionDuration,
        overallSuccessRate: metrics.successRate,
        mostUsedTools,
        commonErrors,
        performanceScore
      };
    }

    /**
     * Calculate performance score
     */
    private calculatePerformanceScore(metrics: PerformanceMetrics): number {
      const successWeight = 0.4;
      const speedWeight = 0.3;
      const reliabilityWeight = 0.3;

      const successScore = metrics.successRate * 100;
      
      // Speed score based on average response time (lower is better)
      const targetResponseTime = 5000; // 5 seconds
      const speedRatio = Math.min(1, targetResponseTime / Math.max(metrics.averageResponseTime, 1));
      const speedScore = speedRatio * 100;
      
      // Reliability score based on error rate
      const errorRate = metrics.errorCount / Math.max(metrics.requestsProcessed, 1);
      const reliabilityScore = Math.max(0, (1 - errorRate)) * 100;

      return Math.round(
        (successScore * successWeight) + 
        (speedScore * speedWeight) + 
        (reliabilityScore * reliabilityWeight)
      );
    }

    /**
     * Start memory monitoring
     */
    private startMemoryMonitoring(): void {
      if (typeof process !== 'undefined' && process.memoryUsage) {
        this.memoryCheckInterval = setInterval(() => {
          if (!this.isEnabled) return;
          
          const memUsage = process.memoryUsage();
          const usageInMB = memUsage.heapUsed / 1024 / 1024;
          
          this.globalMetrics.memoryUsage.push(usageInMB);
          this.globalMetrics.peakMemoryUsage = Math.max(
            this.globalMetrics.peakMemoryUsage, 
            usageInMB
          );
          
          // Keep only last 100 memory readings
          if (this.globalMetrics.memoryUsage.length > 100) {
            this.globalMetrics.memoryUsage = this.globalMetrics.memoryUsage.slice(-100);
          }
        }, 10000); // Check every 10 seconds
      }
    }

    /**
     * Calculate success rate for session
     */
    private calculateSuccessRate(session: SessionMetrics): void {
      const metrics = session.metrics;
      if (metrics.requestsProcessed === 0) {
        metrics.successRate = 1.0;
        return;
      }
      
      const successfulRequests = metrics.requestsProcessed - metrics.errorCount;
      metrics.successRate = successfulRequests / metrics.requestsProcessed;
      
      // Calculate iteration completion rate
      metrics.iterationCompletionRate = metrics.successRate; // Simplified calculation
    }

    /**
     * Update global metrics with session data
     */
    private updateGlobalMetrics(sessionMetrics: PerformanceMetrics): void {
      // Aggregate timing data
      this.globalMetrics.totalExecutionTime += sessionMetrics.totalExecutionTime;
      
      // Update tool execution times
      for (const [tool, times] of Object.entries(sessionMetrics.toolExecutionTimes)) {
        if (!this.globalMetrics.toolExecutionTimes[tool]) {
          this.globalMetrics.toolExecutionTimes[tool] = [];
        }
        this.globalMetrics.toolExecutionTimes[tool].push(...times);
      }
      
      // Update chain execution times
      for (const [chain, times] of Object.entries(sessionMetrics.chainExecutionTimes)) {
        this.globalMetrics.chainExecutionTimes[chain as keyof typeof this.globalMetrics.chainExecutionTimes].push(...times);
      }
      
      // Update error data
      this.globalMetrics.errorCount += sessionMetrics.errorCount;
      for (const [errorType, count] of Object.entries(sessionMetrics.errorTypes)) {
        this.globalMetrics.errorTypes[errorType] = (this.globalMetrics.errorTypes[errorType] || 0) + count;
      }
      
      // Update request count
      this.globalMetrics.requestsProcessed += sessionMetrics.requestsProcessed;
      
      // Recalculate averages
      this.recalculateGlobalAverages();
    }

    /**
     * Recalculate global averages
     */
    private recalculateGlobalAverages(): void {
      const completedSessions = Array.from(this.sessions.values()).filter(s => s.endTime);
      
      if (completedSessions.length === 0) return;
      
      // Calculate average iteration time
      const totalIterationTime = completedSessions.reduce(
        (sum, s) => sum + (s.metrics.averageIterationTime * s.metrics.requestsProcessed), 
        0
      );
      const totalRequests = completedSessions.reduce(
        (sum, s) => sum + s.metrics.requestsProcessed, 
        0
      );
      
      this.globalMetrics.averageIterationTime = totalRequests > 0 ? 
        totalIterationTime / totalRequests : 0;
      
      // Calculate overall success rate
      const totalErrors = completedSessions.reduce((sum, s) => sum + s.metrics.errorCount, 0);
      this.globalMetrics.successRate = totalRequests > 0 ? 
        (totalRequests - totalErrors) / totalRequests : 1.0;
      
      // Calculate average confidence
      const totalConfidence = completedSessions.reduce(
        (sum, s) => sum + (s.metrics.averageConfidence * s.metrics.requestsProcessed), 
        0
      );
      this.globalMetrics.averageConfidence = totalRequests > 0 ? 
        totalConfidence / totalRequests : 0;
    }

    /**
     * Export metrics to JSON
     */
    exportMetrics(sessionId?: string): string {
      const data = sessionId ? 
        this.getSessionMetrics(sessionId) : 
        { global: this.globalMetrics, sessions: Array.from(this.sessions.values()) };
      
      return JSON.stringify(data, null, 2);
    }

    /**
     * Clear old sessions and reset metrics
     */
    cleanup(maxAge: number = 24 * 60 * 60 * 1000): void { // 24 hours default
      const cutoff = Date.now() - maxAge;
      
      for (const [sessionId, session] of this.sessions.entries()) {
        if (session.endTime && session.endTime < cutoff) {
          this.sessions.delete(sessionId);
        }
      }
    }

    /**
     * Enable/disable monitoring
     */
    setEnabled(enabled: boolean): void {
      this.isEnabled = enabled;
      
      if (!enabled && this.memoryCheckInterval) {
        clearInterval(this.memoryCheckInterval);
        this.memoryCheckInterval = undefined;
      } else if (enabled && !this.memoryCheckInterval) {
        this.startMemoryMonitoring();
      }
    }

    /**
     * Reset all metrics
     */
    reset(): void {
      this.sessions.clear();
      this.globalMetrics = this.createEmptyMetrics();
    }

    /**
     * Destroy monitor and cleanup resources
     */
    destroy(): void {
      this.setEnabled(false);
      this.reset();
    }
  }