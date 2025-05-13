// src/orchestrator/orchestrator.ts
import { InteractionContext } from './context/interactionContext';
import { StepExecutor } from './execution/stepExecutor';
import { ExecutionStep, InputAnalysisResult, StepResult } from './execution/types';
import { BaseHandler } from './handlers/baseHandler';
import { ConversationHandler, ExplainCodeHandler, FixCodeHandler } from './handlers';
import { ExecutorFactory } from './execution/executorFactory';

/**
 * The main orchestrator that manages conversations, analyzes input,
 * and delegates tasks to appropriate handlers using the StepExecutor.
 * Manages interaction contexts per chat session.
 */
export class Orchestrator {
    private contexts: Map<string, InteractionContext>;
    private stepExecutor: StepExecutor;

    constructor() {
        this.contexts = new Map();
        // Initialize with ExecutorFactory instead of direct dependencies
        const registry = ExecutorFactory.createExecutorRegistry();
        this.stepExecutor = new StepExecutor(registry);

        console.log('[Orchestrator] Initialized.');
    }

    // Rest of the Orchestrator implementation remains the same...
    // Only the constructor has been modified to use ExecutorFactory

    private getOrCreateContext(chatId: string): InteractionContext {
        if (!this.contexts.has(chatId)) {
            console.log(`[Orchestrator:${chatId}] Creating new context.`);
            const newContext = new InteractionContext(chatId);
            this.contexts.set(chatId, newContext);
            return newContext;
        }
        return this.contexts.get(chatId)!;
    }

    public clearContext(chatId: string): void {
        if (this.contexts.has(chatId)) {
            console.log(`[Orchestrator:${chatId}] Clearing context.`);
            this.contexts.delete(chatId);
        } else {
            console.warn(`[Orchestrator:${chatId}] Attempted to clear non-existent context.`);
        }
    }

    public async processUserMessage(chatId: string, text: string, files?: string[], projectInfo?: any, messageHistory?: any[]): Promise<string | any> {
        const context = this.getOrCreateContext(chatId);

        // 1. Add user input to history and context state
        context.addMessage('user', text);
        context.setValue('userMessage', text);
        context.setValue('referencedFiles', files || []);
        context.setValue('projectInfo', projectInfo);
        // context.setValue('messageHistory', messageHistory || []); // messageHistory is already part of context.chatHistory, maybe redundant?

        console.log(`[Orchestrator:${chatId}] Processing message: "${text}"`);

        // 2. Analyze the user input using the StepExecutor
        // This try/catch block is specifically for the execution of the analysis step itself.
        try {
           const analyzeStep: ExecutionStep = {
               name: 'analyzeUserInput',
               type: 'prompt',
               execute: 'inputAnalyzer',
               params: {
                 userPrompt: text,
                 referencedFiles: files || [],
                 projectContext: projectInfo || {},
                 chatHistory: context.getHistoryForModel(10)
               },
               storeAs: 'analysisResult' // StepExecutor will store result here on success
           };
           const analysisResultStep = await this.stepExecutor.runStep(analyzeStep, context);

           // Log the outcome of the analysis step execution.
           // The actual analysis result is stored in the context by StepExecutor.
           if (!analysisResultStep.success) {
               console.warn(`[Orchestrator:${chatId}] Input analysis step failed:`, analysisResultStep.error);
               // If analysis step fails, ensure context reflects this, e.g., by setting a default or error state
               // StepExecutor already stores error if storeAs was present, but we can ensure a basic analysis structure exists
               if (!context.getAnalysisResult()) { // Only set if StepExecutor didn't store anything
                   context.setValue('analysisResult', { intent: 'unknown', objective: 'Analysis failed', extractedEntities: {}, confidence: 0, error: analysisResultStep.error?.message });
               }
           } else if (analysisResultStep.skipped) {
               console.log(`[Orchestrator:${chatId}] Input analysis step skipped.`);
                // If skipped, ensure context reflects this, maybe set intent to unknown
                if (!context.getAnalysisResult()) {
                     context.setValue('analysisResult', { intent: 'unknown', objective: 'Analysis skipped', extractedEntities: {}, confidence: 0 });
                }
           } else {
               console.log(`[Orchestrator:${chatId}] Input analysis step succeeded.`);
               // The result is already stored in context by StepExecutor at 'analysisResult'
           }

        } catch (error: any) {
           // This catch block handles unexpected errors *during* the execution of runStep itself,
           // not errors indicated *within* the StepResult.
           console.error(`[Orchestrator:${chatId}] UNEXPECTED Error during input analysis step execution:`, error);
           // In case of unexpected error, ensure analysisResult in context indicates failure
           context.setValue('analysisResult', { intent: 'unknown', objective: 'Unexpected analysis error', extractedEntities: {}, confidence: 0, error: error.message });
        }

        // --- IMPORTANT FIX HERE ---
        // Retrieve the analysis result *from the context* after the analysis step is complete.
        // This guarantees you are using the result that was successfully stored by the StepExecutor.
        const analysisFromContext = context.getAnalysisResult();

        // Log the analysis result retrieved from the context for debugging
        console.log(`[Orchestrator:${chatId}] Analysis Result from Context:`, analysisFromContext);

        // 3. Delegate to a specific handler based on the analyzed intent
        let response: string | any;
        let selectedHandler: BaseHandler;

        try {
          // Use the intent from the result retrieved from the context, defaulting to 'conversation'
          const intent = analysisFromContext?.intent || 'conversation';

          console.log(`[Orchestrator:${chatId}] Delegating to handler for intent: ${intent}`);


          switch (intent) {
            case 'explainCode':
                selectedHandler = new ExplainCodeHandler(context, this.stepExecutor);
                break;
            case 'fixCode':
                selectedHandler = new FixCodeHandler(context, this.stepExecutor);
                break;
            case 'conversation':
            case 'unknown': // Explicitly handle 'unknown' intent if the analyzer returns it
            default: // Fallback for any other case or if analysisFromContext was null/undefined
              console.log(`[Orchestrator:${chatId}] Using ConversationHandler for intent: ${intent}`);
              selectedHandler = new ConversationHandler(context, this.stepExecutor);
              // Optionally add a note to context if intent was unhandled/unknown
              if (intent !== 'conversation') {
                 context.setValue('originalIntentIfUnhandled', intent);
              }
              break;
          }

          // Handlers should return a string message for the chat history
          response = await selectedHandler.handle();

        } catch (handlerError: any) {
           console.error(`[Orchestrator:${chatId}] Error during handler execution (${context.getAnalysisResult()?.intent || 'unknown'}):`, handlerError);
           response = `An error occurred while processing your request (${context.getAnalysisResult()?.intent || 'unknown'} intent). Error: ${handlerError.message}`;
        }

        // The assistant message content is the string response from the handler
        if (typeof response !== 'string') {
             console.warn(`[Orchestrator:${chatId}] Handler returned non-string response. Expected string for chat message.`, response);
             // Fallback to a generic message if handler didn't return a string
             response = `Processed request (intent: ${context.getAnalysisResult()?.intent || 'unknown'}). Check context for results.`;
        }
        context.addMessage('assistant', response);


        // Return the string response for ChatService to save
        return response;
    }

    public getInteractionContext(chatId: string): InteractionContext | undefined {
        return this.contexts.get(chatId);
    }
}