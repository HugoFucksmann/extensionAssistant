// src/core/HistoryManager.ts
import { WindsurfState } from './types';
import { HistoryEntry } from '../features/chat/types';

export class HistoryManager {
  /**
   * Add entry to state history
   */
  static addEntry(
    state: WindsurfState,
    phase: HistoryEntry['phase'],
    content: string | Record<string, any>,
    metadata: Partial<HistoryEntry['metadata']> = {}
  ): void {
    if (!state.history) {
      state.history = [];
    }

    const entry: HistoryEntry = {
      timestamp: Date.now(),
      phase,
      content: typeof content === 'string' ? content : JSON.stringify(content),
      metadata: {
        status: 'success',
        ...metadata,
        iteration: state.iterationCount || 0,
      }
    };

    state.history.push(entry);
  }

  /**
   * Add tool execution entry with detailed metadata
   */
  static addToolExecutionEntry(
    state: WindsurfState,
    toolName: string,
    parameters: any,
    result: any,
    success: boolean,
    error?: string,
    duration?: number
  ): void {
    const toolExecMetadata = {
      tool_executions: [{
        name: toolName,
        parameters: parameters === null ? undefined : parameters,
        status: success ? 'completed' as const : 'error' as const,
        result,
        error,
        startTime: Date.now() - (duration || 0),
        endTime: Date.now(),
        duration: duration || 0,
      }]
    };

    this.addEntry(state, 'action', {
      tool: toolName,
      parameters: parameters === null ? undefined : parameters,
      result_summary: success ? "Success" : `Error: ${error}`
    }, toolExecMetadata);
  }

  /**
   * Add system message entry
   */
  static addSystemMessage(
    state: WindsurfState,
    message: string,
    level: 'info' | 'warning' | 'error' = 'info'
  ): void {
    this.addEntry(state, 'system_message', message, { 
      status: level === 'error' ? 'error' : 'success',
      level 
    });
  }

  /**
   * Get entries by phase
   */
  static getEntriesByPhase(
    state: WindsurfState,
    phase: HistoryEntry['phase']
  ): HistoryEntry[] {
    return (state.history || []).filter(entry => entry.phase === phase);
  }

  /**
   * Get latest entry
   */
  static getLatestEntry(state: WindsurfState): HistoryEntry | null {
    const history = state.history || [];
    return history.length > 0 ? history[history.length - 1] : null;
  }

  /**
   * Get history summary for context
   */
  static getSummary(state: WindsurfState): string {
    const history = state.history || [];
    if (history.length === 0) return 'No history available';

    const phases = history.reduce((acc, entry) => {
      acc[entry.phase] = (acc[entry.phase] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const summary = Object.entries(phases)
      .map(([phase, count]) => `${phase}: ${count}`)
      .join(', ');

    return `History: ${summary} (${history.length} total entries)`;
  }
}