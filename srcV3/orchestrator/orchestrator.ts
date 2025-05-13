// src/orchestrator/orchestrator.ts
import { InteractionContext } from './context/interactionContext';
import { StepExecutor } from './execution/stepExecutor';
import { ExecutionStep, InputAnalysisResult, StepResult } from './execution/types'; // Importa los tipos necesarios
import { BaseHandler } from './handlers/baseHandler'; // Base handler
import { ConversationHandler,/*  ExplainCodeHandler, FixCodeHandler */ } from './handlers'; // Importa los handlers específicos (los crearemos después)
import { ToolRunner } from '../services/toolRunner';
import { ChatMessage } from '../storage/models/entities';


/**
 * The main orchestrator that manages conversations, analyzes input,
 * and delegates tasks to appropriate handlers using the StepExecutor.
 * Manages interaction contexts per chat session.
 */
export class Orchestrator {
    // Manages contexts for different chat IDs (simplified in-memory storage for now)
    // In a real extension, you might persist this state.
    private contexts: Map<string, InteractionContext>;
    private stepExecutor: StepExecutor; // Instance of the StepExecutor

    constructor() {
        this.contexts = new Map();
        // Initialize the StepExecutor with your actual dependencies
        this.stepExecutor = new StepExecutor(ToolRunner);

        console.log('[Orchestrator] Initialized.');
    }

    /**
     * Retrieves or creates the interaction context for a given chat ID.
     * In a real extension, this would handle loading/saving persisted context.
     */
    private getOrCreateContext(chatId: string): InteractionContext {
        if (!this.contexts.has(chatId)) {
            console.log(`[Orchestrator:${chatId}] Creating new context.`);
            // TODO: Load persisted context here if it exists for this chatId
            const newContext = new InteractionContext(chatId);
            this.contexts.set(chatId, newContext);
            return newContext;
        }
        // console.log(`[Orchestrator:${chatId}] Using existing context.`); // Too noisy?
        return this.contexts.get(chatId)!; // Non-null assertion is safe due to has() check
    }

     /**
      * Clears the interaction context for a given chat ID.
      * Useful for starting a new conversation.
      */
     public clearContext(chatId: string): void {
         if (this.contexts.has(chatId)) {
             console.log(`[Orchestrator:${chatId}] Clearing context.`);
             // TODO: Potentially save context before deleting
             this.contexts.delete(chatId);
         } else {
             console.warn(`[Orchestrator:${chatId}] Attempted to clear non-existent context.`);
         }
     }

    /**
     * Processes the user message for a specific chat conversation.
     * @param chatId A unique identifier for the conversation/chat session.
     * @param text The text of the user's prompt.
     * @param files Optional list of referenced files (e.g., active editor).
     * @param projectInfo Optional general project information.
     * @returns A promise resolving to the response string for the user.
     */
    public async processUserMessage(chatId: string, text: string, files?: string[], projectInfo?: any, messageHistory?: ChatMessage[]): Promise<string | any> { // Return type can be string or object for UI actions
        const context = this.getOrCreateContext(chatId);

        // 1. Add user input to history and context state
        context.addMessage('user', text); // Add to chat history
        context.setValue('userMessage', text); // Store as current message for easy access
        context.setValue('referencedFiles', files || []); // Store referenced files
        context.setValue('projectInfo', projectInfo); // Store project info
        context.setValue('messageHistory', messageHistory || []); // Store message history
        console.log(`[Orchestrator:${chatId}] Processing message: "${text}"`);

        let analysis: InputAnalysisResult | undefined;
        let analysisResultStep: StepResult<InputAnalysisResult>;

        // 2. Analyze the user input using the StepExecutor
        try {
           const analyzeStep: ExecutionStep = {
               name: 'analyzeUserInput',
               type: 'prompt',
               execute: 'inputAnalyzer', // Assuming 'inputAnalyzer' is a valid prompt type
               params: {
                 userPrompt: text,
                 referencedFiles: files || [],
                 projectContext: projectInfo || {},
                 chatHistory: context.getHistoryForModel(10) // Pass recent history for context
               },
               storeAs: 'analysisResult' // Store the result directly in context
           };
           // Run the analysis step
           analysisResultStep = await this.stepExecutor.runStep(analyzeStep, context);

           // Check if analysis was successful
           if (!analysisResultStep.success || analysisResultStep.result === undefined) {
               // Handle analysis failure - could be prompt error, format error, etc.
               throw new Error(`Input analysis failed: ${analysisResultStep.error?.message || 'Unknown error'}. Result: ${JSON.stringify(analysisResultStep.result)}`);
           }
           analysis = analysisResultStep.result; // Get the analysis result from the step result
           // Note: The result is also already stored in context by stepExecutor due to storeAs

           console.log(`[Orchestrator:${chatId}] Input analysis complete. Intent: ${analysis.intent}, Confidence: ${analysis.confidence}`);

        } catch (error: any) {
           console.error(`[Orchestrator:${chatId}] Error during input analysis:`, error);
           // Fallback: If analysis fails, treat as a simple conversation or return an error
           const fallbackMessage = "Sorry, I couldn't fully understand your request. Let's try a general conversation.";
           // Set a default analysis result for the fallback handler
         /*   analysis = {
               intent: 'conversation',
               objective: "Respond to user's unanalyzed query in a helpful manner.",
               extractedEntities: {},
               confidence: 0.1, // Low confidence
               analysisError: error.message // Store error details in analysis result
           }; */
            // Manually store this fallback analysis result in context
           context.setValue('analysisResult', analysis);
           context.addMessage('assistant', fallbackMessage); // Add fallback message to history
           // We will proceed to delegate based on the 'conversation' intent set in the fallback analysis
        }


        // 3. Delegate to a specific handler based on the analyzed (or fallback) intent
        let response: string | any; // Response can be a string or object for UI actions
        let selectedHandler: BaseHandler;

        try {
          const intent = analysis?.intent || 'conversation'; // Use 'conversation' as ultimate fallback
          console.log(`[Orchestrator:${chatId}] Delegating to handler for intent: ${intent}`);

          // Pass the SAME context instance and the StepExecutor to the handler
          switch (intent) {
            case 'conversation':
              selectedHandler = new ConversationHandler(context, this.stepExecutor);
              break;
           /*  case 'explainCode':
              selectedHandler = new ExplainCodeHandler(context, this.stepExecutor);
              break;
            case 'fixCode':
              selectedHandler = new FixCodeHandler(context, this.stepExecutor);
              break; */
            case 'unknown': // Handle 'unknown' specifically if inputAnalyzer can return it
                 console.warn(`[Orchestrator:${chatId}] Input analyzer returned 'unknown' intent. Falling back to conversation.`);
                 selectedHandler = new ConversationHandler(context, this.stepExecutor);
                 break;
            default:
              console.warn(`[Orchestrator:${chatId}] Unhandled intent: ${intent}. Falling back to conversation.`);
              selectedHandler = new ConversationHandler(context, this.stepExecutor);
               // Optional: Add a note to the context that intent was unhandled
               context.setValue('unhandledIntent', intent);
              break;
          }

          // Execute the selected handler's logic
          response = await selectedHandler.handle(); // Handler orchestrates steps and returns final response/indicator

        } catch (handlerError: any) {
           console.error(`[Orchestrator:${chatId}] Error during handler execution (${analysis?.intent || 'unknown'}):`, handlerError);
           response = `An error occurred while processing your request. Error: ${handlerError.message}`;
        }

        // 4. Add assistant response to history (after handler finishes)
        // Check if the response is a string before adding to history
        if (typeof response === 'string') {
            context.addMessage('assistant', response);
        } else {
            // If response is an object (e.g., indicating UI action),
            // maybe add a generic message or log the action.
             console.log(`[Orchestrator:${chatId}] Handler returned non-string response (likely UI action):`, response);
             // Optional: context.addMessage('assistant', 'Action required in the UI.');
        }


        // TODO: Implement context persistence here (save context.getState())
        // Example: await this.contextPersistor.saveContext(chatId, context.getState());

        // 5. Return the response for the UI to display or handle
        // The UI layer should inspect the return value and/or check the context
        // (e.g., context.getValue('proposedChanges')) after receiving the response.
        return response;
    }

    /**
     * Public method for UI layer to access the interaction context.
     * Useful for retrieving state like proposed changes or chat history.
     */
    public getInteractionContext(chatId: string): InteractionContext | undefined {
        return this.contexts.get(chatId);
    }

    // TODO: Implement context loading/saving mechanism
    // private async loadContext(chatId: string): Promise<InteractionContextState | undefined> { ... }
    // private async saveContext(chatId: string, state: InteractionContextState): Promise<void> { ... }
}