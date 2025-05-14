// src/orchestrator/orchestrator.ts

import { InteractionContext } from './context/interactionContext';
import { StepExecutor } from './execution/stepExecutor';
import { ExecutionStep, InputAnalysisResult, StepResult } from './execution/types';
import { BaseHandler } from './handlers/baseHandler';
import { ConversationHandler, ExplainCodeHandler, FixCodeHandler } from './handlers';
import { ExecutorFactory } from './execution/executorFactory';
import { PlannerService } from './planner/PlannerService';
import { ModelManager } from '../models/config/ModelManager'; // Needed for PlannerService constructor

/**
 * Main orchestrator that manages conversations, analyzes input,
 * and delegates tasks to appropriate handlers using StepExecutor.
 * Manages interaction contexts per chat session.
 * Drives the multi-step execution process using the Planner.
 */
export class Orchestrator {
    private contexts: Map<string, InteractionContext>;
    private stepExecutor: StepExecutor;
    private plannerService: PlannerService;
    private modelManager: ModelManager; // Still needed for PlannerService constructor

    constructor(modelManager: ModelManager, plannerService: PlannerService) {
        this.contexts = new Map();
        const registry = ExecutorFactory.createExecutorRegistry();
        this.stepExecutor = new StepExecutor(registry);
        this.modelManager = modelManager;
        this.plannerService = plannerService;
        console.log('[Orchestrator] Initialized.');
    }

    public clearContext(chatId: string): void {
        if (this.contexts.has(chatId)) {
            console.log(`[Orchestrator:${chatId}] Clearing context from memory.`);
            this.contexts.delete(chatId);
        } else {
            console.warn(`[Orchestrator:${chatId}] Attempted to clear non-existent context from memory.`);
        }
        // Database deletion is handled by ChatService/ChatRepository
    }

    /**
     * Starts or continues processing a user message within a specific chat context.
     * This method now drives the iterative execution loop using the Planner.
     */
    public async processMessage(
        context: InteractionContext, // Receive context instance
        text: string,
        files?: string[],
        projectInfo?: any,
        // messageHistory is already in the context
    ): Promise<string | any> {
        const chatId = context.getChatId();
        console.log(`[Orchestrator:${chatId}] Starting/Continuing process for message: "${text}"`);

        // --- Initialization for a New Turn (if status is idle, complete, error, or needs_user_input) ---
        // In Stage 2, we assume each user message starts a *new* process.
        // Stage 3+ might add logic to resume ('needs_user_input').
        const currentStatus = context.getValue('processingStatus');

        if (currentStatus === 'idle' || currentStatus === 'complete' || currentStatus === 'error' || currentStatus === 'needs_user_input' || currentStatus === undefined) { // Also check for undefined status
             console.log(`[Orchestrator:${chatId}] Starting new process turn. Status was: ${currentStatus}`);
             // Add user message to context history (ChatService already did this)
             // context.addMessage('user', text); // Redundant if ChatService does it before calling

             // Set initial context values for the turn
             context.setValue('userMessage', text);
             context.setValue('referencedFiles', files || []);
             context.setValue('projectInfo', projectInfo);
             // Reset workflow state for a new turn
             context.setValue('processingStatus', 'analyzing'); // Start with analysis
             context.setValue('currentPlan', []); // Clear previous plan
             context.setValue('currentStepIndex', 0);
             context.setValue('lastStepResult', undefined);
             context.setValue('finalResponseContent', undefined);
             context.setValue('requiresUserInputReason', undefined);
             // Consider clearing previous step results too, or ensure they are namespaced
             // e.g., 'turn1_analysisResult', 'turn2_analysisResult'? For now, overwrite is fine.

             // --- Step 1: Analyze User Input ---
             console.log(`[Orchestrator:${chatId}] Running input analysis step...`);
             const analyzeStep: ExecutionStep = {
                 name: 'analyzeUserInput',
                 type: 'prompt',
                 execute: 'inputAnalyzer',
                 params: { /* built by prompt builder */ },
                 storeAs: 'analysisResult' // Store the parsed analysis result object
             };
             try {
                 const analysisStepResult = await this.runExecutionStep(analyzeStep, context);

                 if (!analysisStepResult.success || !analysisStepResult.result) {
                     console.warn(`[Orchestrator:${chatId}] Input analysis step failed or returned no result:`, analysisStepResult.error);
                     context.setValue('processingStatus', 'error'); // Mark as error
                     context.setValue('finalResponseContent', `Sorry, I couldn't understand your request. Analysis error: ${analysisStepResult.error?.message || 'Unknown analysis error'}`);
                      // Still store a minimal analysis result for context consistency
                     context.setValue('analysisResult', { intent: 'unknown', objective: 'Analysis failed', extractedEntities: {}, confidence: 0, error: analysisStepResult.error?.message });
                 } else {
                     console.log(`[Orchestrator:${chatId}] Input analysis step succeeded.`);
                     const analysisResult = analysisStepResult.result as InputAnalysisResult;
                     context.setValue('analysisResult', analysisResult); // Store the full analysis result
                     context.setValue('processingStatus', 'planning'); // Move to planning phase
                     context.addMessage('system', `Analysis complete. Intent: ${analysisResult.intent}. Objective: ${analysisResult.objective}`);

                     // --- Step 2: Initialize the Plan based on Analysis ---
                     console.log(`[Orchestrator:${chatId}] Selecting handler and initializing plan...`);
                     let selectedHandler: BaseHandler;
                     const intent = analysisResult.intent || 'conversation';

                     // Instantiate the appropriate handler
                     switch (intent) {
                         case 'explainCode': selectedHandler = new ExplainCodeHandler(context); break;
                         case 'fixCode': selectedHandler = new FixCodeHandler(context); break;
                         case 'conversation':
                         case 'unknown':
                         default:
                           console.log(`[Orchestrator:${chatId}] Using ConversationHandler for intent: ${intent}`);
                           selectedHandler = new ConversationHandler(context);
                           if (intent !== 'conversation') {
                              context.setValue('originalIntentIfUnhandled', intent);
                           }
                           break;
                     }

                     const initialPlan = selectedHandler.initializePlan();
                     context.setValue('currentPlan', initialPlan);
                     context.setValue('currentStepIndex', 0); // Start from the beginning of the plan
                     console.log(`[Orchestrator:${chatId}] Initial plan initialized:`, initialPlan.map(step => step.name));
                     // Status is already 'planning' from successful analysis
                 }
             } catch (analysisInitError: any) {
                 console.error(`[Orchestrator:${chatId}] Error during analysis or plan initialization:`, analysisInitError);
                 context.setValue('processingStatus', 'error');
                 context.setValue('finalResponseContent', `An error occurred during analysis or initial planning: ${analysisInitError.message}`);
                  // Still store a minimal analysis result for context consistency
                 context.setValue('analysisResult', { intent: 'unknown', objective: 'Analysis/Planning failed', extractedEntities: {}, confidence: 0, error: analysisInitError.message });
             }
        }
         // else { // Status indicates continuation (executing, evaluating, needs_user_input)
              // Stage 3+ logic: Handle resuming execution based on current status
              // For Stage 2, we assume new turn always starts from analysis.
         // }


        // --- The Core Execution Loop (Stage 2) ---
        console.log(`[Orchestrator:${chatId}] Entering execution loop. Initial status: ${context.getValue('processingStatus')}`);
        // Loop while the status is one that indicates processing is ongoing
        // FIX: Use nullish coalescing to provide a default status if undefined
        while (['planning', 'executing', 'evaluating'].includes(context.getValue('processingStatus') ?? 'idle')) {

            const loopStatus = context.getValue('processingStatus');
            console.log(`[Orchestrator:${chatId}] Loop iteration. Current status: ${loopStatus}`);

            try {
                if (loopStatus === 'planning') {
                    // Planner decides the *next* step or signals completion
                    const nextStep = this.plannerService.planNextStep(context);

                    if (nextStep) {
                        // Planner returned a step. PlannerService should have set status to 'executing'.
                        console.log(`[Orchestrator:${chatId}] Planner selected step: '${nextStep.name}'. Status is now '${context.getValue('processingStatus')}'.`);
                         context.addMessage('system', `Planning: Next step is '${nextStep.name}'.`);

                    } else {
                        // Planner returned null, meaning plan is exhausted or process is complete/paused
                        // Planner should have updated the status to 'complete' or 'needs_user_input'
                         console.log(`[Orchestrator:${chatId}] Planner returned null. Process status: ${context.getValue('processingStatus')}. Exiting loop.`);
                        break; // Exit loop
                    }

                } else if (loopStatus === 'executing') {
                    // Get the step to execute from the plan based on current index
                    const plan = context.getValue<ExecutionStep[]>('currentPlan') || [];
                    const currentStepIndex = context.getValue<number>('currentStepIndex') || 0;
                    const stepToExecute = plan[currentStepIndex];

                    if (!stepToExecute) {
                         // This shouldn't happen if plannerService.planNextStep worked correctly
                         console.error(`[Orchestrator:${chatId}] Execution status but no step in plan at index ${currentStepIndex}. Setting status to error.`);
                         context.setValue('processingStatus', 'error');
                         context.setValue('finalResponseContent', "Internal error: No step found to execute.");
                         break; // Exit loop
                    }

                    console.log(`[Orchestrator:${chatId}] Executing step '${stepToExecute.name}'...`);
                    const stepResult = await this.runExecutionStep(stepToExecute, context); // Await the step execution
                    context.setValue('lastStepResult', stepResult); // Store result for evaluation
                    context.setValue('processingStatus', 'evaluating'); // Move to evaluation phase
                    console.log(`[Orchestrator:${chatId}] Step '${stepToExecute.name}' execution finished. Success: ${stepResult.success}.`);
                    // Evaluation will happen in the next loop iteration
                    // Add a system message about step result
                    context.addMessage('system', `Step '${stepToExecute.name}' completed. Success: ${stepResult.success}.`);


                } else if (loopStatus === 'evaluating') {
                     // Evaluate the result of the step that just finished
                     const lastResult = context.getValue<StepResult>('lastStepResult');
                     if (!lastResult) {
                         // Should not happen
                         console.error(`[Orchestrator:${chatId}] Evaluation status but no lastStepResult. Setting status to error.`);
                         context.setValue('processingStatus', 'error');
                         context.setValue('finalResponseContent', "Internal error: No step result to evaluate.");
                          break; // Exit loop
                     }

                     console.log(`[Orchestrator:${chatId}] Evaluating result for step '${lastResult.step.name}'...`);
                     // Planner evaluates the result and updates context/plan/status
                     this.plannerService.evaluateStepResult(context, lastResult);
                     // After evaluation, the status should be 'planning' (set by plannerService)
                     // The loop will then go back to the 'planning' phase in the next iteration.
                      console.log(`[Orchestrator:${chatId}] Evaluation finished. Next status: ${context.getValue('processingStatus')}.`);

                      // Check if evaluation led to error/completion to exit early
                     // FIX: Use nullish coalescing here as well
                     if (!['planning', 'executing', 'evaluating'].includes(context.getValue('processingStatus') ?? 'idle')) {
                         console.log(`[Orchestrator:${chatId}] Evaluation led to non-iterative status: ${context.getValue('processingStatus')}. Exiting loop.`);
                         break; // Exit loop
                     }
                }

                 // No explicit context save here *inside* the loop in this synchronous version.
                 // ChatService saves the context *after* this function returns.
                 // In an async version, saving here would trigger the next phase.

            } catch (error: any) {
                console.error(`[Orchestrator:${chatId}] UNEXPECTED Error during process loop phase '${loopStatus}':`, error);
                context.setValue('processingStatus', 'error');
                context.setValue('finalResponseContent', `An unexpected error occurred during processing phase '${loopStatus}': ${error.message}`);
                // Ensure the error is logged as a step result? Or just rely on finalResponseContent?
                // Let's add a generic error result if lastStepResult wasn't set
                if (!context.getValue('lastStepResult')) {
                     context.setValue('lastStepResult', {
                         success: false,
                         error: error,
                         timestamp: Date.now(),
                         step: { name: 'unexpected_error', type: 'tool', execute: 'none' }, // Placeholder step
                         skipped: false
                     } as StepResult);
                }
                break; // Exit loop on unexpected error
            }
        } // --- End of Core Execution Loop ---


        // --- Final Response Generation ---
        console.log(`[Orchestrator:${chatId}] Execution loop finished. Final status: ${context.getValue('processingStatus')}.`);

        let finalResponse = context.getValue<string>('finalResponseContent');

        // If status is complete but no final response was explicitly set by a step/planner,
        // determine it based on the results stored in context.
        if (context.getValue('processingStatus') === 'complete' && !finalResponse) {
             const analysisResult = context.getAnalysisResult();
             const explanationResult = context.getValue<{ explanation?: string }>('explanationResult');
             const proposedFixResult = context.getValue<{ messageToUser?: string, proposedChanges?: any[], error?: string }>('proposedFixResult');
             const fixValidationResult = context.getValue<{ isValid?: boolean, feedback?: string, error?: string }>('fixValidationResult');
             const conversationResponse = context.getValue<string>('conversationResponse');
             const lastStepResult = context.getValue<StepResult>('lastStepResult'); // Check last step result as a fallback


             // Determine final message based on primary intent or fallback
             if (analysisResult?.intent === 'explainCode' && explanationResult?.explanation) {
                 finalResponse = explanationResult.explanation;
             } else if (analysisResult?.intent === 'fixCode' && proposedFixResult?.messageToUser) {
                 finalResponse = proposedFixResult.messageToUser;
                 // Append validation feedback if available
                 const validationMessage = fixValidationResult?.feedback || context.getValue('proposedFixValidationMessage');
                 if (validationMessage) {
                      finalResponse += `\n\nValidation: ${validationMessage}`;
                 }
                 // Note: Proposed changes themselves are NOT returned in the message,
                 // they are stored in context for the UI to render interactively.
             } else if (conversationResponse) {
                  finalResponse = conversationResponse;
             } else if (lastStepResult?.success && typeof lastStepResult.result === 'string') {
                 // Fallback: If the last step was successful and returned a string, use that.
                 console.warn(`[Orchestrator:${chatId}] No specific final response found, using string result from last successful step '${lastStepResult.step.name}'.`);
                 finalResponse = lastStepResult.result;
             }
             else {
                 console.warn(`[Orchestrator:${chatId}] Process completed, but no clear final response could be determined from context.`);
                 finalResponse = "Processing completed."; // Generic fallback
             }
        } else if (!finalResponse) {
             // If status is error or needs_user_input and no final response was set
             const status = context.getValue('processingStatus');
             if (status === 'needs_user_input') {
                 finalResponse = context.getValue('requiresUserInputReason') || "The process requires your input to continue.";
             } else if (status === 'error') {
                 finalResponse = `An error occurred during processing: ${context.getValue('finalResponseContent') || 'See logs for details.'}`;
             } else {
                  // Should not happen if status is not complete, error, or needs_user_input
                  console.error(`[Orchestrator:${chatId}] Process ended with unexpected status: ${status}`);
                  finalResponse = `Process ended with unexpected status: ${status}`;
             }
        }


        // Ensure finalResponse is a string before adding to history/returning
        if (typeof finalResponse !== 'string') {
             console.warn(`[Orchestrator:${chatId}] Final response is not a string (${typeof finalResponse}). Converting to string.`, finalResponse);
             finalResponse = JSON.stringify(finalResponse, null, 2); // Use pretty print for objects
        }

        // Add the final assistant message to the context history
        context.addMessage('assistant', finalResponse);
         console.log(`[Orchestrator:${chatId}] Added final assistant message to context history.`);

        // Set status back to idle after sending the final message, ready for next user input
        context.setValue('processingStatus', 'idle');
         console.log(`[Orchestrator:${chatId}] Set final status to 'idle'.`);


        console.log(`[Orchestrator:${chatId}] Processing finished. Returning response.`);

        // ChatService will save the updated context state after this function returns.
        return finalResponse; // Return the final string response
    }

    /**
     * Helper method to run a single execution step using the injected StepExecutor.
     * Simplifies handler logic by abstracting step execution details.
     */
    protected async runExecutionStep(step: ExecutionStep, context: InteractionContext): Promise<StepResult> {
        // The StepExecutor handles parameter resolution and context storage internally.
        // It also handles conditions and skipped steps.
        return this.stepExecutor.runStep(step, context);
    }

    // runStepsSequence and runStepsParallel helpers are kept but less central to the main loop now.
    // They might be used *within* a single complex ExecutionStep if needed.
    // For the main plan execution, the Planner + Loop handles sequential/conditional execution.

     /**
      * Helper method to run a sequence of steps. Stops if a step fails.
      * (Less used for main plan in Stage 2+, but kept as a utility)
      * @returns An array of results, or null if a step failed.
      */
     protected async runStepsSequence(steps: ExecutionStep[], context: InteractionContext): Promise<StepResult[] | null> {
         const results: StepResult[] = [];
         for (const step of steps) {
             // Note: This helper doesn't use the Planner/Context loop state (currentStepIndex, etc.)
             // It's a simple linear execution.
             const result = await this.runExecutionStep(step, context);
             results.push(result);
             if (!result.success && !result.skipped) {
                 console.error(`[Orchestrator:${context.getChatId()}] runStepsSequence stopped due to failed step: ${step.name}`);
                 // Store error in context for potential debugging/reporting
                 if (result.step.storeAs) {
                     context.setValue(`${result.step.storeAs}_error`, result.error?.message || 'Sequence step failed');
                 }
                 return null; // Stop sequence on failure
             }
         }
         return results;
     }

      /**
       * Helper method to run multiple steps in parallel.
       * (Useful for context gathering phases within a plan)
       * @returns A Promise resolving to an array of StepResult objects for each step.
       */
     protected async runStepsParallel(steps: ExecutionStep[], context: InteractionContext): Promise<StepResult[]> {
         const promises = steps.map(step => this.runExecutionStep(step, context));
         // Use allSettled to get results for all steps, even if some fail
         const settledResults = await Promise.allSettled(promises);

         const results: StepResult[] = [];
         settledResults.forEach((settledResult, index) => {
             const step = steps[index]; // Get the original step definition
             if (settledResult.status === 'fulfilled') {
                 results.push(settledResult.value); // The StepResult from runExecutionStep
             } else {
                 // Handle the case where runExecutionStep itself threw an error
                 console.error(`[Orchestrator:${context.getChatId()}] Unexpected error running step '${step.name}' in parallel:`, settledResult.reason);
                 results.push({
                     success: false,
                     error: settledResult.reason,
                     timestamp: Date.now(),
                     step: step,
                     skipped: false
                 });
                 // Store error in context for potential debugging/reporting
                 if (step.storeAs) {
                      context.setValue(`${step.storeAs}_error`, settledResult.reason?.message || 'Parallel step execution failed unexpectedly');
                 }
             }
         });

         return results;
     }

    // Method to get context (used by ChatService)
    public getInteractionContext(chatId: string): InteractionContext | undefined {
        return this.contexts.get(chatId);
    }

    // Method to add/set context (used by ChatService after loading/creating)
    public setInteractionContext(context: InteractionContext): void {
         this.contexts.set(context.getChatId(), context);
          console.log(`[Orchestrator] Set context for chat: ${context.getChatId()}`);
    }
}