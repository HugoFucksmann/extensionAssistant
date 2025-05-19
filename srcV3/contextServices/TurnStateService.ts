// src/contextServices/TurnStateService.ts
// TODO: Implement logic to manage the FlowContextState (LangGraph state) for the current turn
import { IFlowContextState } from "../orchestrator/context/flowContext"; // LangGraph State structure
import { IGlobalContextState } from "../orchestrator/context/globalContext";
import { ISessionContextState } from "../orchestrator/context/sessionContext";
import { IConversationContextState } from "../orchestrator/context/conversationContext";
import { ContextResolver } from "./ContextResolver"; // Utility
import { ExecutionStepEntity } from "../store/interfaces/IStepRepository"; // To update state based on step results
import { IStepRepository } from "../store/interfaces/IStepRepository"; // Dependency to potentially load history? Or is it passed in? Let's assume state holds history.
import { StepPersistenceService } from "../store/services/StepPersistenceService"; // To save steps
import { GlobalContextService } from "./GlobalContextService";
import { SessionContextService } from "./SessionContextService";
import { ConversationService } from "./ConversationService";

/**
 * Service to manage the ephemeral state (LangGraph State) for a single turn of execution.
 * It initializes the state, updates it based on step results, and can build the consolidated
 * context snapshot using the ContextResolver.
 */
// Implementación de la clase FlowContextState
class FlowContextState implements IFlowContextState {
    userMessage?: string;
    referencedFiles?: string[];
    analysisResult?: any; // Importar InputAnalysisResult si es necesario
    planningIteration?: number;
    planningHistory?: Array<any>;
    [key: string]: any;
    chatHistoryString?: string;
    chatId?: string;
    traceId?: string;

    constructor(initialState: Partial<FlowContextState> = {}) {
        Object.assign(this, {
            planningIteration: 1,
            planningHistory: [],
            chatHistoryString: undefined,
            ...initialState
        });
    }
}

export class TurnStateService {
    private currentTurnState: IFlowContextState | null = null;
    private traceId: string | null = null; // Trace ID for the current turn
    private chatId: string | null = null; // Chat ID for the current turn

    private globalContextService: GlobalContextService;
    private sessionContextService: SessionContextService;
    private conversationService: ConversationService;
    private stepPersistenceService: StepPersistenceService; // Dependency to save execution steps
    // ContextResolver is a utility, not a service dependency, call its static methods

    constructor(
         globalContextService: GlobalContextService,
         sessionContextService: SessionContextService,
         conversationService: ConversationService,
         stepPersistenceService: StepPersistenceService // Inject step persistence
    ) {
        this.globalContextService = globalContextService;
        this.sessionContextService = sessionContextService;
        this.conversationService = conversationService;
        this.stepPersistenceService = stepPersistenceService;
        console.log('[TurnStateService] Initialized.');
    }

    /**
     * Initializes the state for a new turn.
     * @param chatId The ID of the conversation for this turn.
     * @param userMessage The initial user message.
     * @param referencedFiles Files referenced by the user.
     * @param traceId The trace ID for this turn (provided by OrchestratorService).
     * @returns The initial state object (LangGraph State).
     */
    async initializeTurn(chatId: string, userMessage: string, referencedFiles: string[] = [], traceId: string): Promise<IFlowContextState> {
        console.log(`[TurnStateService] Initializing turn for chat ${chatId}, trace ${traceId}`);
        this.chatId = chatId;
        this.traceId = traceId;

        // Ensure conversation is loaded/available in ConversationService's memory
        const conversationState = await this.conversationService.getConversation(chatId);
         if (!conversationState) {
             // This should not happen if ConversationManager coordinates correctly
              throw new Error(`Conversation state not available for ID: ${chatId}`);
         }


        // Prepare the initial state based on user input and core contexts
        const initialState: IFlowContextState = new FlowContextState({
            userMessage,
            referencedFiles,
            chatId: chatId, // Store chat ID in flow state for easy access in nodes/resolver
            traceId: traceId, // Store trace ID
            planningIteration: 1, // Start iteration count
            planningHistory: [], // Initialize empty history
            // Add formatted chat history string here
            chatHistoryString: this.conversationService.getChatHistoryForModel(chatId, 20), // Get last 20 messages? Limit TBD.
             // Add other potentially useful initial data from core contexts if needed in flow state
        });

         // The initial state might also benefit from some resolved context upfront,
         // but ContextResolver is typically used *during* execution to build
         // context for prompts/tools. Let's keep it simple and populate flow state
         // with direct inputs and key identifiers.

        this.currentTurnState = initialState;
        return this.currentTurnState;
    }

     /**
      * Gets the current state of the turn.
      * @returns The current state object (LangGraph State).
      * @throws Error if no turn is currently initialized.
      */
     getCurrentState(): IFlowContextState {
         if (!this.currentTurnState) {
             throw new Error('TurnStateService: No turn state initialized.');
         }
         return this.currentTurnState;
     }

     /**
      * Updates the current turn state. Used by LangGraph nodes to update the state.
      * This method will also handle saving the step execution to persistence.
      *
      * @param stepEntityData The data for the execution step that just completed/failed.
      * @param updates Optional updates to the state object itself (e.g., adding a step result by 'storeAs' key).
      * @returns The updated state object.
      * @throws Error if no turn is currently initialized.
      */
     async updateTurnState(stepEntityData: Partial<ExecutionStepEntity>, updates: Partial<IFlowContextState> = {}): Promise<IFlowContextState> {
         const currentState = this.getCurrentState();

         // 1. Save/Update Execution Step in Persistence
         if (this.traceId && this.chatId) {
             const stepToSave: ExecutionStepEntity = {
                 // Default values / fill missing ones
                 id: stepEntityData.id || '', // Will be generated if empty
                 traceId: stepEntityData.traceId || this.traceId,
                 chatId: stepEntityData.chatId || this.chatId,
                 stepName: stepEntityData.stepName || 'unknown_step', // Should be provided
                 stepType: stepEntityData.stepType || 'tool', // Should be provided
                 stepExecute: stepEntityData.stepExecute || 'unknown_execute', // Should be provided
                 stepParams: stepEntityData.stepParams || {}, // Should be provided (resolved params)
                 startTime: stepEntityData.startTime || Date.now(), // Should be provided by caller
                 endTime: stepEntityData.endTime || Date.now(),
                 status: stepEntityData.status || 'completed', // Should be provided
                 result: stepEntityData.result,
                 error: stepEntityData.error,
                 planningIteration: stepEntityData.planningIteration || currentState.planningIteration,
             };
              await this.stepPersistenceService.saveExecutionStep(stepToSave);
         } else {
              console.warn('[TurnStateService] Cannot save step, traceId or chatId is null.');
         }


         // 2. Apply updates to the in-memory state
         Object.assign(currentState, updates);

         // 3. Update Planning History in state
         // Find the step entity that corresponds to the update or use provided step data
         const historyEntry = {
             action: `${stepEntityData.stepType || 'step'}:${stepEntityData.stepExecute || stepEntityData.stepName}`,
             stepName: stepEntityData.stepName,
             result: stepEntityData.result,
             error: stepEntityData.error,
             status: stepEntityData.status,
             timestamp: stepEntityData.endTime || Date.now(),
         };
         if (currentState.planningHistory) {
             currentState.planningHistory.push(historyEntry);
         } else {
              currentState.planningHistory = [historyEntry];
         }


         // console.debug('[TurnStateService] State updated:', currentState);
         return currentState;
     }

     /**
      * Builds the consolidated context snapshot for parameter resolution/prompt building
      * using the ContextResolver utility.
      * @returns A consolidated Record<string, any>.
      * @throws Error if no turn is currently initialized.
      */
     async buildResolutionContextSnapshot(): Promise<Record<string, any>> {
         const currentState = this.getCurrentState();
         const globalState = this.globalContextService.getState();
         const sessionState = this.sessionContextService.getState();
         // Need the conversation state instance specific to this turn's chat ID
         // Usar el método público getConversation en lugar de acceder directamente a la propiedad privada activeConversations
        const conversationState = await this.conversationService.getConversation(this.chatId!); // Assuming chatId is set and state is active

          if (!conversationState) {
              // This indicates a critical flow error if a turn is active but conv state isn't
               throw new Error(`TurnStateService: Conversation state not found in memory for active turn chat ID ${this.chatId}`);
          }


         // Use the static ContextResolver utility
         return ContextResolver.resolveContextSnapshot(
             globalState,
             sessionState,
             conversationState,
             currentState // Pass the LangGraph state
         );
     }


    /**
     * Cleans up the state after a turn is completed or failed.
     */
    endTurn(): void {
        console.log(`[TurnStateService] Ending turn for chat ${this.chatId}, trace ${this.traceId}`);
        this.currentTurnState = null;
        this.traceId = null;
        this.chatId = null;
    }

    dispose(): void {
        this.currentTurnState = null;
        this.traceId = null;
        this.chatId = null;
        console.log('[TurnStateService] Disposed.');
    }
}