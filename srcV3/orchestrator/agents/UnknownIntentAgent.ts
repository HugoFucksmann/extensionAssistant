// src/orchestrator/agents/UnknownIntentAgent.ts

import { IAgent } from './IAgent';
import { FlowContext } from '../context/flowContext';
import { StepExecutor } from '../execution/stepExecutor';
import { ExecutionStep, PlannerResponse, StepResult } from '../execution/types'; // Need PlannerResponse and StepResult

/**
 * Agent responsible for handling 'unknown' intents or when initial analysis is low confidence.
 * This agent falls back to a general planning loop driven by the 'planner' prompt
 * to dynamically determine a sequence of steps.
 */
export class UnknownIntentAgent implements IAgent {
    private stepExecutor: StepExecutor;
    private maxIterations: number;

    constructor(stepExecutor: StepExecutor, maxIterations: number) {
        this.stepExecutor = stepExecutor;
        this.maxIterations = maxIterations;
    }

    async execute(flowContext: FlowContext): Promise<string | any> {
        const chatId = flowContext.getChatId();
        const objective = flowContext.getObjective() || 'Unknown task';
        console.log(`[UnknownIntentAgent:${chatId}] Executing (General Planning Loop) for objective: ${objective}`);

        let finalResponse: string | any = "Sorry, I couldn't complete the task."; // Default failure message
        let planningIteration = 0;

        // --- This is the original planning loop from the Orchestrator ---
        // It continues until the planner decides to 'respond' or max iterations are reached.
        while (planningIteration < this.maxIterations) {
            planningIteration++;
            console.log(`[UnknownIntentAgent:${chatId}] Planning iteration ${planningIteration}`);

            // Set planning iteration in flow context for the planner prompt
            flowContext.setValue('planningIteration', planningIteration);

            // Step: Run the general planner prompt to get the next action.
            const plannerStep: ExecutionStep = {
                name: `plannerStep:${planningIteration}`,
                type: 'prompt',
                execute: 'planner', // Use the general planner prompt
                params: {}, // Planner prompt uses full context via buildPlannerVariables
            };

            let plannerResult: StepResult<PlannerResponse>;
            let nextAction: PlannerResponse | undefined;

            try {
                // Run the planner step
                plannerResult = await this.stepExecutor.runStep(plannerStep, flowContext);

                // StepExecutor already logs to planningHistory

                if (!plannerResult.success || !plannerResult.result) {
                    console.error(`[UnknownIntentAgent:${chatId}] Planner step failed or returned no result:`, plannerResult.error?.message || 'Unknown error');
                    // If the planner step itself fails, we cannot continue planning.
                    finalResponse = `Sorry, the planning process failed at iteration ${planningIteration}. Error: ${plannerResult.error?.message || 'Unknown error'}`;
                    break; // Exit loop on planner failure
                }

                nextAction = plannerResult.result;
                console.log(`[UnknownIntentAgent:${chatId}] Planner decided action: '${nextAction.action}'`);

            } catch (plannerError: any) {
                 // Safeguard against unexpected exceptions during the step execution call itself.
                 // StepExecutor should catch most errors, but this is a final safety net.
                 console.error(`[UnknownIntentAgent:${chatId}] UNEXPECTED Error during planner step execution call:`, plannerError);
                 const currentHistory = flowContext.getValue<Array<any>>('planningHistory') || [];
                 currentHistory.push({
                     action: 'prompt:planner',
                     stepName: `plannerStep:${planningIteration}`,
                     result: null,
                     error: plannerError
                 });
                 flowContext.setValue('planningHistory', currentHistory);

                 finalResponse = `Sorry, an unexpected error occurred during planning at iteration ${planningIteration}. Error: ${plannerError.message}`;
                 break; // Exit loop on unexpected error
            }

            // --- Execute the decided action ---
            if (!nextAction) {
                 console.error(`[UnknownIntentAgent:${chatId}] Planner returned no valid action.`);
                 finalResponse = `Sorry, the planner did not return a valid action at iteration ${planningIteration}.`;
                 const currentHistory = flowContext.getValue<Array<any>>('planningHistory') || [];
                 currentHistory.push({
                     action: 'invalidPlannerOutput',
                     stepName: `plannerStep:${planningIteration}`,
                     result: plannerResult?.result,
                     error: new Error("Planner returned null or undefined action")
                 });
                 flowContext.setValue('planningHistory', currentHistory);
                 break; // Exit loop on invalid action
            }

            // Handle the 'respond' action - this is the exit condition for the loop
            if (nextAction.action === 'respond') {
                // The final response content is in the params of the 'respond' action
                finalResponse = nextAction.params?.messageToUser || "Task completed.";
                console.log(`[UnknownIntentAgent:${chatId}] Planner decided to respond. Finalizing.`);
                 // Log the 'respond' action manually as StepExecutor doesn't run it
                 const currentHistory = flowContext.getValue<Array<any>>('planningHistory') || [];
                 currentHistory.push({
                     action: 'respond',
                     stepName: `respondStep:${planningIteration}`,
                     result: { messageToUser: finalResponse },
                     error: null
                 });
                 flowContext.setValue('planningHistory', currentHistory);
                break; // Exit loop
            }
            // Handle 'tool' or 'prompt' actions - execute the step and continue the loop
            else if (nextAction.action === 'tool' || nextAction.action === 'prompt') {
                const actionName = nextAction.toolName || nextAction.promptType;
                if (!actionName) {
                    console.error(`[UnknownIntentAgent:${chatId}] Planner decided '${nextAction.action}' but did not specify name.`);
                    finalResponse = `Sorry, the planner decided to execute a step but didn't specify which one at iteration ${planningIteration}.`;
                    const currentHistory = flowContext.getValue<Array<any>>('planningHistory') || [];
                    currentHistory.push({
                        action: nextAction.action,
                        stepName: `executionError:${planningIteration}`,
                        result: nextAction,
                        error: new Error(`Action name missing for type ${nextAction.action}`)
                    });
                    flowContext.setValue('planningHistory', currentHistory);
                    break; // Exit loop on missing action name
                }

                const executionStep: ExecutionStep = {
                    name: `${nextAction.action}Step:${planningIteration}:${actionName}`,
                    type: nextAction.action,
                    execute: actionName,
                    params: nextAction.params || {},
                    storeAs: nextAction.storeAs,
                };

                console.log(`[UnknownIntentAgent:${chatId}] Executing step: '${executionStep.name}'`);
                const executionResult = await this.stepExecutor.runStep(executionStep, flowContext);

                // StepExecutor already logs the step result (success/failure/skipped) to planningHistory

                if (!executionResult.success && !executionResult.skipped) {
                    console.error(`[UnknownIntentAgent:${chatId}] Step execution failed: '${executionStep.name}'.`, executionResult.error?.message || 'Unknown error');
                    // A failed step means the planner needs to re-plan based on the failure.
                    // So, we continue the loop. The error is in the history.
                    console.log(`[UnknownIntentAgent:${chatId}] Step failed, continuing planning loop.`);
                } else if (executionResult.skipped) {
                     console.log(`[UnknownIntentAgent:${chatId}] Step execution skipped: '${executionStep.name}'.`);
                     // If skipped, continue the loop to re-plan. The skipped status is in the history.
                } else {
                    console.log(`[UnknownIntentAgent:${chatId}] Step execution succeeded: '${executionStep.name}'.`);
                    // If successful, continue the loop to re-plan based on the new state. The result is in the context/history.
                }

            } else {
                // Handle unknown action types returned by the planner
                console.error(`[UnknownIntentAgent:${chatId}] Planner returned unknown action type: '${nextAction.action}'`);
                finalResponse = `Sorry, the planner returned an invalid action type at iteration ${planningIteration}.`;
                 const currentHistory = flowContext.getValue<Array<any>>('planningHistory') || [];
                 currentHistory.push({
                     action: 'unknown',
                     stepName: `invalidPlannerAction:${planningIteration}`,
                     result: nextAction,
                     error: new Error(`Unknown action type: ${nextAction.action}`)
                 });
                 flowContext.setValue('planningHistory', currentHistory);
                break; // Exit loop on unknown action type
            }
             // Loop continues here if action was 'tool' or 'prompt' and didn't break
        }

        // --- Final Response if loop exited without 'respond' ---
        if (planningIteration >= this.maxIterations) {
             console.warn(`[UnknownIntentAgent:${chatId}] Planning loop reached maximum iterations (${this.maxIterations}). Stopping.`);
             // If the loop finished because of max iterations and finalResponse is still the default,
             // update it to indicate the iteration limit was hit.
             if (finalResponse === "Sorry, I couldn't complete the task.") {
                  finalResponse = `Sorry, I could not determine the final response within the maximum number of planning steps (${this.maxIterations}).`;
             }
        }

        console.log(`[UnknownIntentAgent:${chatId}] General planning process finished.`);
        return finalResponse;
    }
}