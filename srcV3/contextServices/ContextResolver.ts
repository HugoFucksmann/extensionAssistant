// src/contextServices/ContextResolver.ts

// Import interfaces for context state structures
import { IGlobalContextState } from "../orchestrator/context/globalContext";
import { ISessionContextState } from "../orchestrator/context/sessionContext";
import { IConversationContextState } from "../orchestrator/context/conversationContext";
import { IFlowContextState } from "../orchestrator/context/flowContext";

// Import types from LangChain if needed for LangGraphState structure
// For now, IFlowContextState represents the LangGraph state structure.

/**
 * Utility class (or functions) to consolidate state data from various context sources
 * into a single flat object for parameter resolution or prompt variable building.
 * It does NOT manage state itself. It takes snapshots of existing state objects.
 */
export class ContextResolver {

    /**
     * Resolves and consolidates state data from different contexts into a single object.
     * This consolidated object is used for parameter resolution (e.g., {{placeholder}})
     * and building prompt variables.
     *
     * @param globalState The current GlobalContextState object.
     * @param sessionState The current SessionContextState object.
     * @param conversationState The current ConversationContextState object.
     * @param flowState The current FlowContextState object (LangGraph State).
     * @returns A consolidated Record<string, any> object.
     */
    public static resolveContextSnapshot(
        globalState: IGlobalContextState,
        sessionState: ISessionContextState,
        conversationState: IConversationContextState,
        flowState: IFlowContextState // This is the LangGraph State
    ): Record<string, any> {
        const resolutionContextData: Record<string, any> = {};

        // Note: Order matters for priority if keys overlap. Flow state is highest priority.

        // 1. Add FlowContext state (highest priority)
        // FlowState includes userMessage, analysisResult, planningIteration, planningHistory, and results from steps ('storeAs' keys)
        for (const key in flowState) {
            if (flowState[key] !== undefined) {
                resolutionContextData[key] = flowState[key];
            }
        }

        // 2. Add ConversationContext state
        // Exclude messages array itself, but provide chat history string
         for (const key in conversationState) {
             if (key !== 'messages' && (conversationState as any)[key] !== undefined && resolutionContextData[key] === undefined) {
                 resolutionContextData[key] = (conversationState as any)[key];
             }
         }
          // Add conversation history formatted for model (last N messages)
          // The ConversationService or a helper function should format this.
          // For now, let's assume the FlowState might contain something like 'chatHistoryString'
          // Or we need the ConversationService instance here to ask for formatted history.
          // Let's modify the plan slightly: ContextResolver receives STATE objects,
          // and services provide formatted data if needed (e.g., TurnStateService adds chatHistoryString).
          // For now, rely on flowState or direct state access where needed.
          // If flowState has 'chatHistoryString', add it. Otherwise, maybe add raw messages?
          // Adding raw messages can be large. Formatted history is better.
          // Let's assume the caller (TurnStateService) prepares 'chatHistoryString' based on conversationState.messages
          if (flowState.chatHistoryString !== undefined) {
               resolutionContextData.chatHistoryString = flowState.chatHistoryString;
          }


        // 3. Add SessionContext state
        for (const key in sessionState) {
            if ((sessionState as any)[key] !== undefined && resolutionContextData[key] === undefined) {
                resolutionContextData[key] = (sessionState as any)[key];
            }
        }

        // 4. Add GlobalContext state (lowest priority)
        for (const key in globalState) {
            if ((globalState as any)[key] !== undefined && resolutionContextData[key] === undefined) {
                resolutionContextData[key] = (globalState as any)[key];
            }
        }

         // Explicitly ensure 'userMessage' is present, perhaps the one that started the turn
         // This might already be in flowState from the initial analysis step input
         if (resolutionContextData.userMessage === undefined) {
              // Fallback: Try to get from flowState if analysis didn't set it
              resolutionContextData.userMessage = flowState.userMessage || '';
         }


        // Ensure specific expected keys are present with default values if needed
        resolutionContextData.extractedEntities = resolutionContextData.extractedEntities || {};
        resolutionContextData.projectInfo = resolutionContextData.projectInfo || {};


        // Note: This utility does not fetch data (like file contents).
        // Data fetching is done by tools and stored in flowState, then available here.

        // console.debug('[ContextResolver] Consolidated context snapshot:', resolutionContextData); // Use logger later
        return resolutionContextData;
    }

     // No dispose method needed for a static utility
}