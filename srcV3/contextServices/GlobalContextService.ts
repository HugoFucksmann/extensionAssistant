// src/contextServices/GlobalContextService.ts
// TODO: Implement logic to load/save GlobalContextState using ConfigurationManager
import { IGlobalContextState } from "../orchestrator/context/globalContext";
import { ConfigurationManager } from "../config/ConfigurationManager"; // Dependency

export class GlobalContextService {
     private state: IGlobalContextState;
     private configManager: ConfigurationManager;

     constructor(configManager: ConfigurationManager) {
         this.configManager = configManager;
         this.state = this.loadState(); // Load state on initialization
         console.log('[GlobalContextService] Initialized.', this.state);
     }

     private loadState(): IGlobalContextState {
         // Use ConfigurationManager to get state from globalState
         return this.configManager.getValue<IGlobalContextState>('extensionAssistant.globalContext', {
             _version: 1,
             projectInfo: undefined
         });
     }

     async saveState(): Promise<void> {
         // Use ConfigurationManager to save state to globalState
         await this.configManager.setValue('extensionAssistant.globalContext', this.state);
         console.log('[GlobalContextService] State saved.');
     }

     getState(): IGlobalContextState {
         // Return a copy to prevent external modification
         return JSON.parse(JSON.stringify(this.state));
     }

     setValue<K extends keyof IGlobalContextState>(key: K, value: IGlobalContextState[K]): void {
         this.state[key] = value;
     }

     getValue<K extends keyof IGlobalContextState>(key: K): IGlobalContextState[K] | undefined {
         return this.state[key];
     }

     getProjectInfo(): IGlobalContextState['projectInfo'] {
         return this.getValue('projectInfo');
     }

     setProjectInfo(info: IGlobalContextState['projectInfo']): void {
         this.setValue('projectInfo', info);
     }

     dispose(): void {
          // Save state on dispose is a good practice if not already handled by extension.ts deactivate
          // This service is likely disposed when the ServiceFactory is disposed
          this.saveState(); // Await is not possible in dispose, handle in extension.ts deactivate
          console.log('[GlobalContextService] Disposed.');
     }
}