// src/core/helpers/HistoryHelper.ts

import { HistoryEntry } from "@features/chat/types";
import { WindsurfState } from "@core/types";

export class HistoryHelper {
    addHistoryEntry(
        state: WindsurfState,
        phase: HistoryEntry['phase'],
        content: string | Record<string, any>,
        metadata: Partial<HistoryEntry['metadata']> = {}
    ): void {
        const entry: HistoryEntry = {
            timestamp: Date.now(),
            phase: phase,
            content: typeof content === 'string' ? content : JSON.stringify(content),
            metadata: {
                status: 'success',
                ...metadata,
                iteration: state.iterationCount,
            }
        };
        if (!state.history) {
            state.history = [];
        }
        state.history.push(entry);
    }

    addErrorToHistory(state: WindsurfState, errorMessage: string, metadata: Record<string, any> = {}): void {
        if (!state.history) {
            state.history = [];
        }

        state.history.push({
            phase: 'system_message',
            content: errorMessage,
            timestamp: Date.now(),
            iteration: state.iterationCount || 0,
            metadata: {
                status: 'error',
                ...metadata
            }
        });
    }
}