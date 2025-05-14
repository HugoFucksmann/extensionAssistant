// src/orchestrator/planner/PlannerService.ts

import { InteractionContext } from "../context/interactionContext";
import { ExecutionStep, StepResult } from "../execution/types";
import { ModelManager } from "../../models/config/ModelManager"; // Inject ModelManager if planning uses AI

/**
 * Service responsible for analyzing the InteractionContext state
 * and determining the next steps or overall process status.
 */
export class PlannerService {
     private modelManager: ModelManager;

     constructor(modelManager: ModelManager) {
          this.modelManager = modelManager;
          console.log('[PlannerService] Initialized.');
     }

     /**
      * Analyzes the current context and determines the next step to execute
      * or updates the process status if complete or needs input.
      * In Stage 1, this is a placeholder. It will always signal completion
      * after the initial plan is executed by the Orchestrator.
      *
      * @param context The current interaction context.
      * @returns The next step to execute, or null if the process is complete/paused.
      */
     public planNextStep(context: InteractionContext): ExecutionStep | null {
         // Stage 1 Placeholder Logic:
         // The Orchestrator in Stage 1 will execute the *initial* plan directly.
         // This method will be used in Stage 2 to drive the loop.
         // For now, we can add basic logic that will be refined later.

         const status = context.getValue('processingStatus');
         const currentStepIndex = context.getValue<number>('currentStepIndex') || 0;
         const plan = context.getValue<ExecutionStep[]>('currentPlan') || [];

         if (status === 'planning') {
              if (currentStepIndex < plan.length) {
                   // There's a step in the plan to execute
                   context.setValue('processingStatus', 'executing');
                   console.log(`[PlannerService:${context.getChatId()}] Planning: Found step at index ${currentStepIndex}.`);
                   return plan[currentStepIndex]; // Return the step to be executed
              } else {
                   // Plan is exhausted
                   context.setValue('processingStatus', 'complete');
                   context.setValue('finalResponseContent', context.getValue<string>('finalResponseContent') || "Process completed based on the initial plan.");
                    console.log(`[PlannerService:${context.getChatId()}] Planning: Plan exhausted. Setting status to 'complete'.`);
                   return null;
              }
         } else {
              // If not in 'planning' status, we shouldn't be planning.
              // This indicates a state transition issue or the loop is ending.
               console.warn(`[PlannerService:${context.getChatId()}] planNextStep called when status is not 'planning': ${status}`);
               // Ensure we return null if not planning
               return null;
         }
     }

     /**
      * Evaluates the result of the last executed step and updates the context
      * to inform the next planning phase.
      * In Stage 1, this is a placeholder.
      *
      * @param context The current interaction context.
      * @param result The result of the step that just finished executing.
      */
     public evaluateStepResult(context: InteractionContext, result: StepResult): void {
         // Stage 1 Placeholder Logic:
         // In Stage 1, the Orchestrator runs the whole sequence.
         // This method will be used in Stage 2 to evaluate results dynamically.
         // For now, we just update the index and set status back to planning
         // so the loop can continue to the next step in Stage 2.

         const currentStepIndex = context.getValue<number>('currentStepIndex') || 0;
         const plan = context.getValue<ExecutionStep[]>('currentPlan') || [];

         if (!result.success && !result.skipped) {
              console.error(`[PlannerService:${context.getChatId()}] Step '${result.step.name}' failed during evaluation.`);
              // In future stages, this would add error flags, perhaps change status to 'error' or 'needs_user_input'
              // For Stage 1/2, we might just log and let the sequence helper handle the stop.
         } else if (result.skipped) {
              console.log(`[PlannerService:${context.getChatId()}] Step '${result.step.name}' was skipped.`);
         } else {
              console.log(`[PlannerService:${context.getChatId()}] Step '${result.step.name}' succeeded during evaluation.`);
         }

         // Stage 2 Logic Preparation: Increment step index and set status back to planning
         // This prepares the context for the next call to planNextStep in the loop
         context.setValue('currentStepIndex', currentStepIndex + 1);
         context.setValue('processingStatus', 'planning'); // Go back to planning for the next iteration
     }
}