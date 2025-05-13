// src/orchestrator/handlers/baseHandler.ts

import { InteractionContext } from '../context/interactionContext';
import { StepExecutor } from '../execution/stepExecutor';
import { ExecutionStep, StepResult } from '../execution/types';

/**
 * Base class for all intent-specific handlers.
 * Provides access to the interaction context and the step executor.
 * Includes helper methods for running steps.
 */
export abstract class BaseHandler {
    protected context: InteractionContext;
    protected stepExecutor: StepExecutor;

    constructor(context: InteractionContext, stepExecutor: StepExecutor) {
        this.context = context;
        this.stepExecutor = stepExecutor;
    }

    /**
     * Abstract method to be implemented by concrete handlers.
     * Contains the orchestration logic for a specific intent.
     * Should return a string message to be added to the chat history.
     * Any complex data (like proposed changes) should be stored in the context.
     * @returns A promise resolving to the final string message for the user.
     */
    abstract handle(): Promise<string>; // Return type is string

    /**
     * Helper method to run a single execution step using the injected StepExecutor.
     * Simplifies handler logic by abstracting step execution details.
     */
    protected async runExecutionStep(step: ExecutionStep): Promise<StepResult> {
        // The StepExecutor handles parameter resolution and context storage internally.
        return this.stepExecutor.runStep(step, this.context);
    }

     /**
      * Helper method to run a sequence of steps. Stops if a step fails.
      * @returns An array of results, or null if a step failed.
      */
     protected async runStepsSequence(steps: ExecutionStep[]): Promise<StepResult[] | null> {
         const results: StepResult[] = [];
         for (const step of steps) {
             const result = await this.runExecutionStep(step);
             results.push(result);
             if (!result.success && !result.skipped) {
                 console.error(`[BaseHandler:${this.context.getChatId()}] Sequence stopped due to failed step: ${step.name}`);
                 // Store error in context for potential debugging/reporting
                 if (result.step.storeAs) {
                     this.context.setValue(`${result.step.storeAs}_error`, result.error?.message || 'Sequence step failed');
                 }
                 return null; // Stop sequence on failure
             }
         }
         return results;
     }

      /**
       * Helper method to run multiple steps in parallel.
       * Uses Promise.allSettled to ensure all promises complete regardless of individual success.
       * @returns A Promise resolving to an array of StepResult objects for each step.
       */
     protected async runStepsParallel(steps: ExecutionStep[]): Promise<StepResult[]> {
         const promises = steps.map(step => this.runExecutionStep(step));
         // Use allSettled to get results for all steps, even if some fail
         const settledResults = await Promise.allSettled(promises);

         const results: StepResult[] = [];
         settledResults.forEach((settledResult, index) => {
             const step = steps[index]; // Get the original step definition
             if (settledResult.status === 'fulfilled') {
                 results.push(settledResult.value); // The StepResult from runExecutionStep
             } else {
                 // Handle the case where runExecutionStep itself threw an error
                 console.error(`[BaseHandler:${this.context.getChatId()}] Unexpected error running step '${step.name}' in parallel:`, settledResult.reason);
                 results.push({
                     success: false,
                     error: settledResult.reason,
                     timestamp: Date.now(),
                     step: step,
                     skipped: false
                 });
                 // Store error in context for potential debugging/reporting
                 if (step.storeAs) {
                      this.context.setValue(`${step.storeAs}_error`, settledResult.reason?.message || 'Parallel step execution failed unexpectedly');
                 }
             }
         });

         return results;
     }

  
}