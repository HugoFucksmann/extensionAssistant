import { WindsurfState } from '../types';
import { HistoryEntry } from '../../features/chat/types';

/**
 * Adds an error entry to the state's history with proper metadata.
 * @param state The WindsurfState to modify
 * @param message The error message
 * @param metadata Optional additional metadata
 */
export function addErrorToHistory(state: WindsurfState, message: string, metadata: Record<string, any> = {}): void {
  if (!state.history) {
    state.history = [];
  }

  state.history.push({
    phase: 'system_message',
    content: message,
    timestamp: Date.now(),
    iteration: state.iterationCount || 0,
    metadata: {
      status: 'error',
      ...metadata
    }
  });
}

/**
 * Adds a system message entry to the state's history.
 * @param state The WindsurfState to modify
 * @param message The system message content
 * @param metadata Optional additional metadata
 */
export function addSystemMessageToHistory(state: WindsurfState, message: string, metadata: Record<string, any> = {}): void {
  if (!state.history) {
    state.history = [];
  }

  state.history.push({
    phase: 'system_message',
    content: message,
    timestamp: Date.now(),
    iteration: state.iterationCount || 0,
    metadata: {
      ...metadata
    }
  });
}
