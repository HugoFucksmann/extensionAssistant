// src/orchestrator/context/globalContext.ts
import * as vscode from 'vscode';
import { ConfigurationManager } from '../../config/ConfigurationManager'; // Assuming this exists

export interface GlobalContextState {
    [key: string]: any;
    projectInfo?: {
        mainLanguage: string;
        secondaryLanguage?: string;
        dependencies: string[];
    };
}

/**
 * Manages context that persists across VS Code sessions and workspaces.
 * Stores global project information, user preferences not tied to specific settings, etc.
 * Persisted using VS Code's globalState.
 */
export class GlobalContext {
    private state: GlobalContextState;
    private context: vscode.ExtensionContext;


    constructor(context: vscode.ExtensionContext) {
        this.context = context;
      
        this.state = this.loadState() || {};
         console.log('[GlobalContext] Initialized.', this.state); // Reduced logging
    }

    private loadState(): GlobalContextState | undefined {
        return this.context.globalState.get<GlobalContextState>('extensionAssistant.globalContext');
    }

    async saveState(): Promise<void> {
        await this.context.globalState.update('extensionAssistant.globalContext', this.state);
     
    }

    getState(): GlobalContextState {
        return JSON.parse(JSON.stringify(this.state));
    }

    setValue<K extends keyof GlobalContextState>(key: K, value: GlobalContextState[K]): void {
        this.state[key] = value;
    }

    getValue<K extends keyof GlobalContextState>(key: K): GlobalContextState[K] | undefined {
        return this.state[key];
    }

    getProjectInfo(): GlobalContextState['projectInfo'] {
        return this.state.projectInfo;
    }

    setProjectInfo(info: GlobalContextState['projectInfo']): void {
        this.setValue('projectInfo', info);
    }

    dispose(): void {
        // No specific disposal needed beyond saving state on deactivate (handled externally)
    }
}