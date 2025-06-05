import { WindsurfState } from '../types';
import { HistoryEntry } from '../../features/chat/types';


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
