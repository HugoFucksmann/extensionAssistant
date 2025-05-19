// src/orchestrator/context/sessionContext.ts
// Corrected: Exporting only the interface with I prefix and removing the class export.

import { IGlobalContextState } from './globalContext'; // Keep import if needed for type references within interface

export interface SessionContextState {
    [key: string]: any;
    workspacePath?: string;
    activeEditorInfo?: {
        fileName: string;
        languageId: string;
    };
}

// Remove the export of the class with the same name as the interface
/*
export class SessionContextState { // Use a different name for the implementation class if needed internally
     constructor(initialState: Partial<SessionContextState> = {}) {
         Object.assign(this, {
             workspacePath: undefined,
             activeEditorInfo: undefined,
             ...initialState
         });
     }
}
*/

export { SessionContextState as ISessionContextState }; // Export interface
// Remove: export { SessionContextState }; // REMOVED EXPORT OF CLASS WITH SAME NAME