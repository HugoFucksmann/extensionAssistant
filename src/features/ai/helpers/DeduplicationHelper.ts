// src/core/helpers/DeduplicationHelper.ts

import { WindsurfState } from "@core/types";


export class DeduplicationHelper {
    private executedToolsSet: Set<string> = new Set<string>();

    private toolParamsHash(tool: string, params: any): string {
        // Ensure consistent ordering of keys for params object
        const ordered = (obj: any): any => {
            if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
                return obj;
            }
            return Object.keys(obj).sort().reduce((acc, key) => {
                acc[key] = ordered(obj[key]);
                return acc;
            }, {} as any);
        };
        return `${tool}::${JSON.stringify(ordered(params || {}))}`;
    }

    /**
     * Initializes or updates the helper's internal set of executed tools
     * based on the provided WindsurfState. This should be called at the
     * beginning of processing a state if the state might already contain
     * information about previously executed tools in the current ReAct cycle.
     */
    public initializeForState(state: WindsurfState): void {
        if (state._executedTools) {
            this.executedToolsSet = state._executedTools;
        } else {
            state._executedTools = new Set<string>();
            this.executedToolsSet = state._executedTools;
        }
    }

    public isToolExecutionDuplicate(tool: string, params: any): boolean {
        const execKey = this.toolParamsHash(tool, params);
        return this.executedToolsSet.has(execKey);
    }

    public markToolAsExecuted(tool: string, params: any): void {
        const execKey = this.toolParamsHash(tool, params);
        this.executedToolsSet.add(execKey);
        // Note: The WindsurfState._executedTools is updated by reference
        // because this.executedToolsSet points to state._executedTools
        // after initializeForState is called.
    }

    /**
     * Clears the set of executed tools. Useful if the helper instance is reused
     * across different ReAct runs that should not share deduplication state.
     * However, for the current design, initializeForState handles this per-run.
     */
    public reset(): void {
        this.executedToolsSet.clear();
    }
}