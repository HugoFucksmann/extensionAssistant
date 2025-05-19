// src/orchestrator/context/globalContext.ts
// Corrected: Exporting only the interface with I prefix and removing the class export.

export interface GlobalContextState {
    [key: string]: any;
    projectInfo?: {
        mainLanguage: string;
        secondaryLanguage?: string;
        dependencies: string[];
    };
    _version?: number;
}

// Remove the export of the class with the same name as the interface
/*
export class GlobalContextState { // Use a different name for the implementation class if needed internally
     [key: string]: any; // Need index signature if using [key: string]: any in interface
     projectInfo?: { mainLanguage: string; secondaryLanguage?: string; dependencies: string[]; };
     _version?: number;

     constructor(initialState: Partial<GlobalContextState> = {}) {
         Object.assign(this, {
             _version: 1,
             projectInfo: undefined,
             ...initialState
         });
     }
}
*/

// Option 1 (Simplest): Only export the interface with I prefix.
// Services will work with plain objects conforming to this interface.
export { GlobalContextState as IGlobalContextState }; // Export interface

// Remove: export { GlobalContextState }; // REMOVED EXPORT OF CLASS WITH SAME NAME