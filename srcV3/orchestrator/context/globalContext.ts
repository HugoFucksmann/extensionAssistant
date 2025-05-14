// src/orchestrator/context/globalContext.ts
import * as vscode from 'vscode';
import { ConfigurationManager } from '../../config/ConfigurationManager';

export interface GlobalContextState {
    [key: string]: any;  // Add this line
    // Add global/project-wide data here
    projectInfo?: {
        mainLanguage: string;
        secondaryLanguage?: string;
        dependencies: string[];
    };
    // Add other global state relevant across sessions/workspaces
}

/**
 * Manages context that persists across VS Code sessions and workspaces.
 * Stores global project information, user preferences not tied to specific settings, etc.
 * Persisted using VS Code's globalState.
 */
export class GlobalContext {
    private state: GlobalContextState;
    private context: vscode.ExtensionContext;
    private configManager: ConfigurationManager;

    constructor(context: vscode.ExtensionContext, configManager: ConfigurationManager) {
        this.context = context;
        this.configManager = configManager;
        this.state = this.loadState() || {}; // Load state on creation
        console.log('[GlobalContext] Initialized.', this.state);
    }

    private loadState(): GlobalContextState | undefined {
        // Use a consistent key for global state
        const savedState = this.context.globalState.get<GlobalContextState>('extensionAssistant.globalContext');
        return savedState;
    }

    async saveState(): Promise<void> {
        // Save the current state
        await this.context.globalState.update('extensionAssistant.globalContext', this.state);
        console.log('[GlobalContext] State saved.');
    }

    /**
     * Gets the current global context state.
     */
    getState(): GlobalContextState {
        return JSON.parse(JSON.stringify(this.state)); // Return a copy
    }

    /**
     * Sets a specific value in the global context state.
     * @param key The key to set.
     * @param value The value to store.
     */
    setValue<K extends keyof GlobalContextState>(key: K, value: GlobalContextState[K]): void {
        this.state[key] = value;
        // Optional: save state immediately on change or rely on deactivate save
        // this.saveState();
    }

    /**
     * Gets a specific value from the global context state.
     * @param key The key to get.
     * @returns The value associated with the key, or undefined.
     */
    getValue<K extends keyof GlobalContextState>(key: K): GlobalContextState[K] | undefined {
        return this.state[key];
    }

    // Add specific getters for common global data
    getProjectInfo(): GlobalContextState['projectInfo'] {
        return this.state.projectInfo;
    }

    setProjectInfo(info: GlobalContextState['projectInfo']): void {
        this.setValue('projectInfo', info);
    }

    // Add disposal logic if needed (e.g., clearing state on uninstall)
    dispose(): void {
        // In this simple model, saving on deactivate is handled externally.
        // For complex scenarios, you might want more elaborate lifecycle management.
    }
}