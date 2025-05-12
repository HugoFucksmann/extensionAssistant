// src/orchestrator/handlers/baseHandler.ts

import { InteractionContext } from '../context/interactionContext';
import { StepExecutor } from '../execution/stepExecutor';
import { ExecutionStep, StepResult } from '../execution/types';

/**
 * Base class for all intent-specific handlers.
 * Provides access to the interaction context and the step executor.
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
     * @returns A promise resolving to the final string response or an object
     *          indicating a UI action (like showing a diff).
     */
    abstract handle(): Promise<string | any>; // Return type can be more specific if needed

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
                 console.error(`[BaseHandler] Sequence stopped due to failed step: ${step.name}`);
                 return null; // Stop sequence on failure
             }
         }
         return results;
     }

      /**
       * Helper method to run multiple steps in parallel.
       * @returns An array of results. Failures do not stop other steps.
       */
     protected async runStepsParallel(steps: ExecutionStep[]): Promise<StepResult[]> {
         const promises = steps.map(step => this.runExecutionStep(step));
         return Promise.all(promises);
     }
}