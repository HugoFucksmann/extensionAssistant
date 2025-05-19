// src/models/prompts/builders/baseVariables.ts
// Helper function to map the resolution context snapshot to BasePromptVariables


import { IGlobalContextState, ISessionContextState, IConversationContextState, IFlowContextState } from '../../../orchestrator/context'; // Import state interfaces
import { BasePromptVariables } from '../../../orchestrator/types';
// ContextResolver utility is not needed here directly, the caller (PromptService) provides the snapshot

/**
 * Maps a consolidated context snapshot (from ContextResolver) to the BasePromptVariables structure.
 * This is a common builder used by most specific prompt builders.
 */
export function mapContextToBaseVariables(resolutionContextData: Record<string, any>): BasePromptVariables {
   const baseVariables: BasePromptVariables = {
     // Map direct keys from the resolution context snapshot
     userMessage: resolutionContextData.userMessage || '',
     chatHistory: resolutionContextData.chatHistoryString || '', // Assuming chatHistoryString is in the snapshot
     objective: resolutionContextData.analysisResult?.objective,
     extractedEntities: resolutionContextData.analysisResult?.extractedEntities,
     projectContext: resolutionContextData.projectInfo, // Assuming projectInfo is in the snapshot
     activeEditorContent: resolutionContextData.activeEditorInfo?.content, // Assuming active editor content/info is in the snapshot

     // Map dynamic variables (e.g., fileContent:*, searchResults:*)
     // These should already be present in the resolutionContextData if added by tools
     ...Object.keys(resolutionContextData)
       .filter(key => key.includes(':')) // Identify keys with colon (heuristic for dynamic keys)
       .reduce<Record<string, any>>((acc, key) => {
         acc[key] = resolutionContextData[key];
         return acc;
       }, {}),
   };

   // Filter out undefined values if desired, though Object.assign usually handles this
   return baseVariables;
}