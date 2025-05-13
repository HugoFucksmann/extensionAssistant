import { InteractionContext } from './context/interactionContext';
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
    private contexts: Map<string, InteractionContext>;
    private stepExecutor: StepExecutor;

    constructor() {
        this.contexts = new Map();
        const registry = ExecutorFactory.createExecutorRegistry();
        this.stepExecutor = new StepExecutor(registry);
        console.log('[Orchestrator] Initialized.');
    }

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

        context.addMessage('user', text);
        context.setValue('userMessage', text);
        context.setValue('referencedFiles', files || []);
        context.setValue('projectInfo', projectInfo);

        console.log(`[Orchestrator:${chatId}] Processing message: "${text}"`);

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
               storeAs: 'analysisResult'
           };
           const analysisResultStep = await this.stepExecutor.runStep(analyzeStep, context);

           if (!analysisResultStep.success) {
               console.warn(`[Orchestrator:${chatId}] Input analysis step failed:`, analysisResultStep.error);
           } else {
               console.log(`[Orchestrator:${chatId}] Input analysis step succeeded.`);
           }

        } catch (error: any) {
           console.error(`[Orchestrator:${chatId}] UNEXPECTED Error during input analysis step execution:`, error);
           context.setValue('analysisResult', { intent: 'unknown', objective: 'Unexpected analysis error', extractedEntities: {}, confidence: 0, error: error.message });
        }

        const analysisFromContext = context.getAnalysisResult();
        console.log(`[Orchestrator:${chatId}] Analysis Result from Context:`, analysisFromContext);

        let response: string | any;
        let selectedHandler: BaseHandler;

        try {
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
            case 'unknown':
            default:
              console.log(`[Orchestrator:${chatId}] Using ConversationHandler for intent: ${intent}`);
              selectedHandler = new ConversationHandler(context, this.stepExecutor);
              if (intent !== 'conversation') {
                 context.setValue('originalIntentIfUnhandled', intent);
              }
              break;
          }

          response = await selectedHandler.handle();

        } catch (handlerError: any) {
           console.error(`[Orchestrator:${chatId}] Error during handler execution (${context.getAnalysisResult()?.intent || 'unknown'}):`, handlerError);
           response = `An error occurred while processing your request (${context.getAnalysisResult()?.intent || 'unknown'} intent). Error: ${handlerError.message}`;
        }

        if (typeof response !== 'string') {
             console.warn(`[Orchestrator:${chatId}] Handler returned non-string response. Expected string for chat message.`, response);
             response = `Processed request (intent: ${context.getAnalysisResult()?.intent || 'unknown'}). Check context for results.`;
        }
        context.addMessage('assistant', response);

        return response;
    }

    public getInteractionContext(chatId: string): InteractionContext | undefined {
        return this.contexts.get(chatId);
    }
}