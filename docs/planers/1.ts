// src/orchestrator/planner/PlannerService.ts

import { InteractionContext } from "../context/interactionContext";
import { ExecutionStep, StepResult } from "../execution/types";
import { ModelManager } from "../../models/config/ModelManager"; // Inject ModelManager if planning uses AI

/**
 * Service responsible for analyzing the InteractionContext state
 * and determining the next steps or overall process status.
 * In Stage 2, this service primarily facilitates sequential plan execution.
 */
export class PlannerService {
     // ModelManager is needed if the planner uses AI prompts for planning/evaluation
     // private modelManager: ModelManager;

     // Constructor only needs ModelManager if using AI planning/evaluation prompts
     // constructor(modelManager: ModelManager) {
     //      this.modelManager = modelManager;
     //      console.log('[PlannerService] Initialized.');
     // }
      constructor(/* modelManager: ModelManager */) {
           // this.modelManager = modelManager; // Will be used in Stage 3
           console.log('[PlannerService] Initialized (Stage 2).');
      }


     /**
      * Analyzes the current context and determines the next step to execute
      * or updates the process status if complete or needs input.
      * In Stage 2, this method gets the next step from the predefined plan.
      *
      * @param context The current interaction context.
      * @returns The next step to execute, or null if the process is complete/paused.
      */
     public planNextStep(context: InteractionContext): ExecutionStep | null {
         const status = context.getValue('processingStatus');
         const currentStepIndex = context.getValue<number>('currentStepIndex') || 0;
         const plan = context.getValue<ExecutionStep[]>('currentPlan') || [];
         const chatId = context.getChatId();

         if (status === 'planning') {
              if (currentStepIndex < plan.length) {
                   // There's a step in the plan to execute at the current index
                   const nextStep = plan[currentStepIndex];
                   context.setValue('processingStatus', 'executing'); // Transition to executing phase
                   console.log(`[PlannerService:${chatId}] Planning: Found step '${nextStep.name}' at index ${currentStepIndex}. Setting status to 'executing'.`);
                   // We don't increment index here; evaluateStepResult does that after execution
                   return nextStep; // Return the step to be executed
              } else {
                   // Plan is exhausted
                   context.setValue('processingStatus', 'complete'); // Transition to complete phase
                   // Set a default final response if none was set by a step (Stage 3+)
                   if (!context.getValue('finalResponseContent')) {
                        context.setValue('finalResponseContent', "Process completed based on the initial plan.");
                   }
                    console.log(`[PlannerService:${chatId}] Planning: Plan exhausted (${plan.length} steps). Setting status to 'complete'.`);
                   return null; // Signal no more steps
              }
         } else {
              // If not in 'planning' status, we shouldn't be planning.
              // This indicates a state transition issue or the loop is ending.
               console.warn(`[PlannerService:${chatId}] planNextStep called when status is not 'planning': ${status}. Returning null.`);
               return null; // Signal no more steps
         }
     }

     /**
      * Evaluates the result of the last executed step and updates the context
      * to inform the next planning phase.
      * In Stage 2, this method primarily increments the step index and sets status back to 'planning'.
      *
      * @param context The current interaction context.
      * @param result The result of the step that just finished executing.
      */
     public evaluateStepResult(context: InteractionContext, result: StepResult): void {
         const chatId = context.getChatId();
         const currentStepIndex = context.getValue<number>('currentStepIndex') || 0;
         const plan = context.getValue<ExecutionStep[]>('currentPlan') || [];

         context.setValue('lastStepResult', result); // Store the result for potential future use

         if (!result.success && !result.skipped) {
              console.error(`[PlannerService:${chatId}] Step '${result.step.name}' failed during evaluation.`);
              // In Stage 2, a failure in any step effectively stops the planned sequence.
              // We set the status to 'error'. The Orchestrator loop checks this status.
              context.setValue('processingStatus', 'error');
              // Set a basic error message if none is already set
               if (!context.getValue('finalResponseContent')) {
                    context.setValue('finalResponseContent', `Processing stopped due to step failure: ${result.step.name}. Error: ${result.error?.message || 'Unknown error'}`);
               }

         } else if (result.skipped) {
              console.log(`[PlannerService:${chatId}] Step '${result.step.name}' was skipped during evaluation.`);
              // Stage 3+ Logic: Depending on why it was skipped, might need a different plan.
         } else {
              console.log(`[PlannerService:${chatId}] Step '${result.step.name}' succeeded during evaluation.`);
              // Stage 3+ Logic: Check result.result and update context flags (e.g., hasCodeContent, foundDefinition)
              // Example (for Stage 3):
              // if (result.step.name === 'readActiveEditorForExplain' && result.result?.content) {
              //     context.setValue('hasActiveEditorContent', true);
              // }
          }

         // Stage 2 Logic: Increment step index and set status back to planning
         // This prepares the context for the next call to planNextStep in the loop
         // Only increment and set status to planning if not already in an error state
         if (context.getValue('processingStatus') !== 'error') {
              context.setValue('currentStepIndex', currentStepIndex + 1);
              context.setValue('processingStatus', 'planning'); // Go back to planning for the next iteration
              console.log(`[PlannerService:${chatId}] Evaluation complete. Incrementing step index to ${context.getValue('currentStepIndex')}. Setting status to 'planning'.`);
         } else {
              console.log(`[PlannerService:${chatId}] Evaluation complete, but status is 'error'. Loop will terminate.`);
         }
     }

     // Stage 3+: Add methods for AI-based planning/evaluation if needed
     // private async callPlanningPrompt(context: InteractionContext): Promise<ExecutionStep | null> { ... }
}