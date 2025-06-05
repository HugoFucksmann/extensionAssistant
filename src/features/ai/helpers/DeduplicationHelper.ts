// src/core/helpers/DeduplicationHelper.ts

import { WindsurfState } from "@core/types";


export class DeduplicationHelper {
    private executedToolsSet: Set<string> = new Set<string>();

    private toolParamsHash(tool: string, params: any): string {

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

    }


    public reset(): void {
        this.executedToolsSet.clear();
    }
}