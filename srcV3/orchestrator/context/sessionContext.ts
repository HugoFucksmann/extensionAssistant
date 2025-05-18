// src/orchestrator/context/sessionContext.ts
import * as vscode from 'vscode';
import { GlobalContext, GlobalContextState } from './globalContext';
import { getProjectInfo as fetchProjectInfo } from '../../tools/project/getProjectInfo'; // Assuming this exists

interface SessionContextState {
    [key: string]: any;
    workspacePath?: string;
    activeEditorInfo?: {
        fileName: string;
        languageId: string;
    };
}

/**
 * Manages context that is specific to the current VS Code session/workspace.
 * Does NOT typically persist across sessions in its entirety.
 * Linked to the GlobalContext.
 */
export class SessionContext {
    private state: SessionContextState;
    private context: vscode.ExtensionContext;
    private globalContext: GlobalContext;
    private projectInfoPromise: Promise<GlobalContextState['projectInfo']> | null = null;

    constructor(context: vscode.ExtensionContext, globalContext: GlobalContext) {
        this.context = context;
        this.globalContext = globalContext;
        this.state = {};

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            this.state.workspacePath = workspaceFolders[0].uri.fsPath;
        }

        context.subscriptions.push(
            vscode.window.onDidChangeActiveTextEditor(editor => {
                if (editor) {
                    this.state.activeEditorInfo = {
                        fileName: editor.document.fileName,
                        languageId: editor.document.languageId
                    };
                } else {
                    this.state.activeEditorInfo = undefined;
                }
                
            })
        );

        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
             this.state.activeEditorInfo = {
                 fileName: activeEditor.document.fileName,
                 languageId: activeEditor.document.languageId
             };
        }

        
    }

    getState(): SessionContextState {
        return JSON.parse(JSON.stringify(this.state));
    }

    setValue<K extends keyof SessionContextState>(key: K, value: SessionContextState[K]): void {
        this.state[key] = value;
    }

    getValue<K extends keyof SessionContextState>(key: K): SessionContextState[K] | undefined {
        return this.state[key];
    }

    getWorkspacePath(): string | undefined {
        return this.state.workspacePath;
    }

    getActiveEditorInfo(): SessionContextState['activeEditorInfo'] {
         return this.state.activeEditorInfo;
    }

    getGlobalContext(): GlobalContext {
        return this.globalContext;
    }

    /**
     * Fetches project info (languages, dependencies) and stores it in GlobalContext if not already there.
     * Returns the project info.
     */
    async getOrFetchProjectInfo(): Promise<GlobalContextState['projectInfo']> {
        const existingInfo = this.globalContext.getProjectInfo();
        if (existingInfo) {
            return existingInfo;
        }

        if (!this.projectInfoPromise) {
            // ACTUALIZAR
            this.projectInfoPromise = fetchProjectInfo().catch(err => {
                 console.error('[SessionContext] Error fetching project info:', err);
                 this.projectInfoPromise = null;
                 return undefined;
            });
            this.projectInfoPromise.then(info => {
                 if (info) {
                      this.globalContext.setProjectInfo(info);
                      this.globalContext.saveState(); // Save to global state
                 }
            });
        }

        return this.projectInfoPromise;
    }

    dispose(): void {
        // Listeners added to context.subscriptions are disposed automatically
    }
}