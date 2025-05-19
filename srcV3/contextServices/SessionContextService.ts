// src/contextServices/SessionContextService.ts
// TODO: Implement logic to manage SessionContextState using vscode.ExtensionContext
import * as vscode from 'vscode';
import { ISessionContextState } from "../orchestrator/context/sessionContext";
// import { getProjectInfo as fetchProjectInfo } from '../tools/project/getProjectInfo'; // Moved project info logic out
import { GlobalContextService } from './GlobalContextService'; // Need GlobalContextService to fetch project info (or delegate fetch logic)
import { IGlobalContextState } from '../orchestrator';

// Implementación de la clase SessionContextState
class SessionContextState implements ISessionContextState {
    [key: string]: any;
    workspacePath?: string;
    activeEditorInfo?: {
        fileName: string;
        languageId: string;
    };

    constructor(initialState: Partial<SessionContextState> = {}) {
        Object.assign(this, {
            workspacePath: undefined,
            activeEditorInfo: undefined,
            ...initialState
        });
    }
}

export class SessionContextService {
    private state: ISessionContextState;
    private context: vscode.ExtensionContext;
    private globalContextService: GlobalContextService; // Need reference to manage global state aspects
    private projectInfoFetchPromise: Promise<ISessionContextState['projectInfo']> | null = null; // Use promise for async fetch

    constructor(context: vscode.ExtensionContext, globalContextService: GlobalContextService) {
        this.context = context;
        this.globalContextService = globalContextService;
        this.state = new SessionContextState(); // Session state starts fresh each session

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            this.state.workspacePath = workspaceFolders[0].uri.fsPath;
        }

         // Setup listeners for VS Code events
         // These listeners should be added to context.subscriptions in extension.ts
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
                  // console.debug('[SessionContextService] Active editor changed:', this.state.activeEditorInfo);
             })
         );

         // Initialize active editor info on startup
         const activeEditor = vscode.window.activeTextEditor;
         if (activeEditor) {
              this.state.activeEditorInfo = {
                  fileName: activeEditor.document.fileName,
                  languageId: activeEditor.document.languageId
              };
         }

        console.log('[SessionContextService] Initialized.', this.state);
    }

     getState(): ISessionContextState {
         return JSON.parse(JSON.stringify(this.state));
     }

    setValue<K extends keyof ISessionContextState>(key: K, value: ISessionContextState[K]): void {
        this.state[key] = value;
    }

    getValue<K extends keyof ISessionContextState>(key: K): ISessionContextState[K] | undefined {
        return this.state[key];
    }

    getWorkspacePath(): string | undefined {
        return this.state.workspacePath;
    }

    getActiveEditorInfo(): ISessionContextState['activeEditorInfo'] {
         return this.state.activeEditorInfo;
    }

    /**
     * Fetches project info (languages, dependencies) and stores it in GlobalContext
     * via GlobalContextService if not already there. Returns the project info.
     * Uses a Promise to avoid redundant fetches.
     * Note: The actual fetching logic (e.g. using a tool) should be elsewhere,
     * this service coordinates storing it in context.
     * For now, we'll simulate or call the existing tool function directly.
     */
     async getOrFetchProjectInfo(): Promise<IGlobalContextState['projectInfo']> {
        const existingInfo = this.globalContextService.getProjectInfo();
        if (existingInfo) {
            return existingInfo;
        }

        if (!this.projectInfoFetchPromise) {
            // Call the actual tool function or a dedicated ProjectInfoFetcher service
            // For now, calling the existing function from src/tools/project/getProjectInfo
            // In a later phase, this might call a tool via LangChainToolAdapter or a dedicated service.
            this.projectInfoFetchPromise = (async () => {
                try {
                    // Import inside async function to avoid circular dependency issues if tools import context services
                     const { getProjectInfo: fetchProjectInfoTool } = await import('../tools/project/getProjectInfo');
                    const info = await fetchProjectInfoTool(); // Call the tool function directly for now
                     this.globalContextService.setProjectInfo(info);
                     await this.globalContextService.saveState(); // Save to global state via service
                    return info;
                } catch (err) {
                    console.error('[SessionContextService] Error fetching project info:', err);
                     this.projectInfoFetchPromise = null; // Allow retry
                    return undefined;
                }
            })();
        }

        return this.projectInfoFetchPromise;
    }


     dispose(): void {
         // VS Code listeners added via context.subscriptions are auto-disposed.
         // No other resources to dispose here.
         console.log('[SessionContextService] Disposed.');
     }
}