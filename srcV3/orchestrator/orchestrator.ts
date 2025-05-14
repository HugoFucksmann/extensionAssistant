// src/orchestrator/orchestrator.ts

import { FlowContext, GlobalContext, SessionContext, ConversationContext } from './context'; // Import all context types
import { StepExecutor } from './execution/stepExecutor';
import { ExecutionStep, InputAnalysisResult, StepResult } from './execution/types';
import { BaseHandler } from './handlers/baseHandler';
import { ConversationHandler, ExplainCodeHandler, FixCodeHandler } from './handlers';
import { ExecutorFactory } from './execution/executorFactory';


/**
 * Main orchestrator that manages conversations, analyzes input,
 * and delegates tasks to appropriate handlers using StepExecutor.
 * Manages interaction contexts per chat session.
 */
export class Orchestrator {
    // Orchestrator now holds references to higher-level contexts
    private globalContext: GlobalContext;
    private sessionContext: SessionContext;
    // It also manages active ConversationContexts in memory
    private activeConversations: Map<string, ConversationContext> = new Map();

    private stepExecutor: StepExecutor;

    constructor(globalContext: GlobalContext, sessionContext: SessionContext) {
        this.globalContext = globalContext;
        this.sessionContext = sessionContext;
        const registry = ExecutorFactory.createExecutorRegistry();
        this.stepExecutor = new StepExecutor(registry);
        console.log('[Orchestrator] Initialized with global and session contexts.');
    }

    /**
     * Adds a ConversationContext to the orchestrator's in-memory map.
     * Called by ChatService when a conversation is created or loaded.
     */
    addConversationContext(convContext: ConversationContext): void {
        this.activeConversations.set(convContext.getChatId(), convContext);
         console.log(`[Orchestrator] Added ConversationContext for chat ${convContext.getChatId()}.`);
    }

    /**
     * Clears a ConversationContext from the orchestrator's in-memory map.
     * Called by ChatService when a conversation is deleted.
     */
    clearConversationContext(chatId: string): void {
        if (this.activeConversations.has(chatId)) {
            // Note: Disposal should ideally happen in ChatService or where the context is "owned"
            // this.activeConversations.get(chatId)?.dispose(); // Assuming ChatService disposes
            this.activeConversations.delete(chatId);
            console.log(`[Orchestrator] Cleared ConversationContext for chat ${chatId} from memory.`);
        }
    }

    /**
     * Gets a ConversationContext by ID.
     */
    getConversationContext(chatId: string): ConversationContext | undefined {
        return this.activeConversations.get(chatId);
    }


    /**
     * Processes a user message within the context of a conversation.
     * Now receives the FlowContext directly from ChatService.
     */
    public async processUserMessage(flowContext: FlowContext): Promise<string | any> {
        const chatId = flowContext.getChatId();
        const text = flowContext.getValue<string>('userMessage') || '';
        // const files = flowContext.getValue<string[]>('referencedFiles') || []; // Will be accessed via getResolutionContext

        console.log(`[Orchestrator:${chatId}] Processing message: "${text}"`);

        let analysisResult: InputAnalysisResult | undefined;

        try {
           // --- Paso 1: Analizar la intención del usuario ---
           // The inputAnalyzer step uses the FlowContext's getResolutionContext
           const analyzeStep: ExecutionStep = {
               name: 'analyzeUserInput',
               type: 'prompt',
               execute: 'inputAnalyzer',
               // params are passed to buildVariables via StepExecutor
               params: {
                 // buildInputAnalyzerVariables will use the full resolution context
               },
               storeAs: 'analysisResult' // Result stored in FlowContext state
           };
           console.log(`[Orchestrator:${chatId}] Running input analysis step...`);
           const analysisResultStep = await this.stepExecutor.runStep(analyzeStep, flowContext);

           if (!analysisResultStep.success || !analysisResultStep.result) {
               console.warn(`[Orchestrator:${chatId}] Input analysis step failed or returned no result:`, analysisResultStep.error);
               // Store a default/error analysis result in context
               flowContext.setValue('analysisResult', { intent: 'unknown', objective: 'Analysis failed', extractedEntities: {}, confidence: 0.1, error: analysisResultStep.error?.message || 'Analysis step failed' });
           } else {
               console.log(`[Orchestrator:${chatId}] Input analysis step succeeded.`);
               // Result is already stored in FlowContext by StepExecutor due to storeAs
               // flowContext.setValue('analysisResult', analysisResultStep.result); // This is redundant if storeAs works
           }

        } catch (error: any) {
           console.error(`[Orchestrator:${chatId}] UNEXPECTED Error during input analysis step execution:`, error);
           // Ensure an analysisResult is set in context even on unexpected errors
           flowContext.setValue('analysisResult', { intent: 'unknown', objective: 'Unexpected analysis error', extractedEntities: {}, confidence: 0, error: error.message });
        }

        // Retrieve the analysis result from the FlowContext
        analysisResult = flowContext.getAnalysisResult();
        console.log(`[Orchestrator:${chatId}] Analysis Result from FlowContext:`, analysisResult);


        // --- Paso 2: Seleccionar y Ejecutar el Handler Basado en la Intención ---
        // (This part still follows the old workflow logic, will be refactored in Stage 3)
        let response: string | any;
        let selectedHandler: BaseHandler; // BaseHandler needs FlowContext and StepExecutor

        try {
          const intent = analysisResult?.intent || 'conversation';
          console.log(`[Orchestrator:${chatId}] Delegating to handler for intent: ${intent}`);

          // Handlers are initialized with the *current* FlowContext and StepExecutor
          switch (intent) {
            case 'explainCode':
                selectedHandler = new ExplainCodeHandler(flowContext, this.stepExecutor); // Pass FlowContext
                break;
            case 'fixCode':
                selectedHandler = new FixCodeHandler(flowContext, this.stepExecutor); // Pass FlowContext
                break;
            case 'conversation':
            case 'unknown':
            default:
              console.log(`[Orchestrator:${chatId}] Using ConversationHandler for intent: ${intent}`);
              selectedHandler = new ConversationHandler(flowContext, this.stepExecutor); // Pass FlowContext
              if (intent !== 'conversation') {
                 flowContext.setValue('originalIntentIfUnhandled', intent);
              }
              break;
          }

          // The handler executes its predefined steps using the provided FlowContext
          // and StepExecutor. Results/errors are stored back in the FlowContext.
          // The handler returns the final string response.
          response = await selectedHandler.handle();

        } catch (handlerError: any) {
           console.error(`[Orchestrator:${chatId}] Error during handler execution (${flowContext.getAnalysisResult()?.intent || 'unknown'}):`, handlerError);
           // Store handler execution error in FlowContext
           flowContext.setValue('handlerExecutionError', handlerError.message);
           response = `An error occurred while processing your request (${flowContext.getAnalysisResult()?.intent || 'unknown'} intent). Error: ${handlerError.message}`;
        }

        // Ensure the final response is a string (as expected by ChatService)
        if (typeof response !== 'string') {
             console.warn(`[Orchestrator:${chatId}] Handler returned non-string response. Expected string for chat message.`, response);
             // Store the non-string result in context if helpful for debugging
             flowContext.setValue('finalHandlerResult', response);
             response = `Processed request (intent: ${flowContext.getAnalysisResult()?.intent || 'unknown'}). Check context for results.`;
        }

        // The final assistant message content is returned.
        // Adding it to history (DB and ConversationContext) is handled by ChatService.
        return response;
    }

    /**
     * Disposes the orchestrator, clearing all active conversation contexts.
     * Called on extension deactivate.
     */
    dispose(): void {
        console.log('[Orchestrator] Disposing. Clearing all active conversation contexts.');
        // Note: The ConversationContexts themselves should be disposed by ChatService
        // or their owning component. Orchestrator just clears its references.
        this.activeConversations.clear();
    }

    // The previous getInteractionContext is effectively replaced by receiving the FlowContext
    // directly in processUserMessage. If you need to retrieve an *active* FlowContext
    // outside of the processUserMessage call (less common in this model), you'd add a method here,
    // but typically the FlowContext is short-lived within one processUserMessage call.
    // You can get the FlowContext from the ConversationContext:
    // getFlowContext(chatId: string): FlowContext | null | undefined {
    //    return this.activeConversations.get(chatId)?.getCurrentFlowContext();
    // }
}