// src/orchestrator/agents/FixCodeAgent.ts

import { IAgent } from './IAgent';
import { FlowContext } from '../context/flowContext';
import { StepExecutor } from '../execution/stepExecutor';
// Import types needed for steps within this agent and the planner response
import { ExecutionStep, StepResult, FixCodePlannerResponse } from '../execution/types';

/**
 * Agent responsible for handling 'fixCode' intents.
 * This agent uses an internal planning loop driven by the 'fixCodePlanner' prompt
 * to dynamically determine the steps required to fix code.
 */
export class FixCodeAgent implements IAgent {
    private stepExecutor: StepExecutor;
    private maxIterations: number; // Maximum iterations for the internal planning loop

    constructor(stepExecutor: StepExecutor, maxIterations: number = 10) { // Default iterations for this agent
        this.stepExecutor = stepExecutor;
        this.maxIterations = maxIterations;
    }

    async execute(flowContext: FlowContext): Promise<string | any> {
        const chatId = flowContext.getChatId();
        const objective = flowContext.getObjective() || 'Fix code';
        console.log(`[FixCodeAgent:${chatId}] Executing (Internal Planning Loop) for objective: ${objective}`);

        let finalResponse: string | any = "Sorry, I couldn't complete the code fixing task."; // Default failure message
        let iteration = 0;

        // --- Internal Planning Loop ---
        // The loop continues until the fixCodePlanner decides to 'respond' or max iterations are reached.
        while (iteration < this.maxIterations) {
            iteration++;
            console.log(`[FixCodeAgent:${chatId}] Fix Code Planning Iteration ${iteration}`);

            // Set agent-specific iteration count in flow context for the planner prompt
            flowContext.setValue('fixCodeIteration', iteration);

            // Step: Run the fixCodePlanner prompt to get the next action specific to fixing code.
            const fixPlannerStep: ExecutionStep = {
                name: `fixCodePlannerStep:${iteration}`,
                type: 'prompt',
                execute: 'fixCodePlanner', // Use the specialized fix code planner prompt
                params: {}, // fixCodePlanner prompt uses full context via buildFixCodePlannerVariables
            };

            let plannerResult: StepResult<FixCodePlannerResponse>;
            let nextAction: FixCodePlannerResponse | undefined;

            try {
                // Run the planner step
                plannerResult = await this.stepExecutor.runStep(fixPlannerStep, flowContext);

                // StepExecutor already logs to planningHistory

                if (!plannerResult.success || !plannerResult.result) {
                    console.error(`[FixCodeAgent:${chatId}] FixCodePlanner step failed or returned no result:`, plannerResult.error?.message || 'Unknown error');
                    // If the planner step itself fails, we cannot continue planning.
                    finalResponse = `Sorry, the code fixing planning process failed at iteration ${iteration}. Error: ${plannerResult.error?.message || 'Unknown error'}`;
                    break; // Exit loop on planner failure
                }

                nextAction = plannerResult.result;
                console.log(`[FixCodeAgent:${chatId}] FixCodePlanner decided action: '${nextAction.action}'`);

            } catch (plannerError: any) {
                 // Safeguard against unexpected exceptions during the step execution call itself.
                 console.error(`[FixCodeAgent:${chatId}] UNEXPECTED Error during fixCodePlanner step execution call:`, plannerError);
                 const currentHistory = flowContext.getValue<Array<any>>('planningHistory') || [];
                 currentHistory.push({
                     action: 'prompt:fixCodePlanner',
                     stepName: `fixCodePlannerStep:${iteration}`,
                     result: null,
                     error: plannerError
                 });
                 flowContext.setValue('planningHistory', currentHistory);

                 finalResponse = `Sorry, an unexpected error occurred during code fixing planning at iteration ${iteration}. Error: ${plannerError.message}`;
                 break; // Exit loop on unexpected error
            }

            // --- Execute the decided action ---
            if (!nextAction) {
                 console.error(`[FixCodeAgent:${chatId}] FixCodePlanner returned no valid action.`);
                 finalResponse = `Sorry, the code fixing planner did not return a valid action at iteration ${iteration}.`;
                 const currentHistory = flowContext.getValue<Array<any>>('planningHistory') || [];
                 currentHistory.push({
                     action: 'invalidFixCodePlannerOutput',
                     stepName: `fixCodePlannerStep:${iteration}`,
                     result: plannerResult?.result,
                     error: new Error("FixCodePlanner returned null or undefined action")
                 });
                 flowContext.setValue('planningHistory', currentHistory);
                 break; // Exit loop on invalid action
            }

            // Handle the 'respond' action - this is the exit condition for the loop
            if (nextAction.action === 'respond') {
                // The final response content is in the params of the 'respond' action
                finalResponse = nextAction.params?.messageToUser || "Code fixing task completed.";
                console.log(`[FixCodeAgent:${chatId}] FixCodePlanner decided to respond. Finalizing.`);
                 // Log the 'respond' action manually as StepExecutor doesn't run it
                 const currentHistory = flowContext.getValue<Array<any>>('planningHistory') || [];
                 currentHistory.push({
                     action: 'respond',
                     stepName: `fixCodeRespondStep:${iteration}`,
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
                    console.error(`[FixCodeAgent:${chatId}] FixCodePlanner decided '${nextAction.action}' but did not specify name.`);
                    finalResponse = `Sorry, the code fixing planner decided to execute a step but didn't specify which one at iteration ${iteration}.`;
                    const currentHistory = flowContext.getValue<Array<any>>('planningHistory') || [];
                    currentHistory.push({
                        action: nextAction.action,
                        stepName: `fixCodeExecutionError:${iteration}`,
                        result: nextAction,
                        error: new Error(`Action name missing for type ${nextAction.action}`)
                    });
                    flowContext.setValue('planningHistory', currentHistory);
                    break; // Exit loop on missing action name
                }

                const executionStep: ExecutionStep = {
                    name: `${nextAction.action}Step:${iteration}:${actionName}`,
                    type: nextAction.action,
                    execute: actionName,
                    params: nextAction.params || {},
                    storeAs: nextAction.storeAs,
                };

                console.log(`[FixCodeAgent:${chatId}] Executing step: '${executionStep.name}'`);
                const executionResult = await this.stepExecutor.runStep(executionStep, flowContext);

                // StepExecutor already logs the step result (success/failure/skipped) to planningHistory

                if (!executionResult.success && !executionResult.skipped) {
                    console.error(`[FixCodeAgent:${chatId}] Step execution failed: '${executionStep.name}'.`, executionResult.error?.message || 'Unknown error');
                    // A failed step means the planner needs to re-plan based on the failure.
                    // So, we continue the loop. The error is in the history.
                    console.log(`[FixCodeAgent:${chatId}] Step failed, continuing planning loop.`);
                } else if (executionResult.skipped) {
                     console.log(`[FixCodeAgent:${chatId}] Step execution skipped: '${executionStep.name}'.`);
                     // If skipped, continue the loop to re-plan. The skipped status is in the history.
                } else {
                    console.log(`[FixCodeAgent:${chatId}] Step execution succeeded: '${executionStep.name}'.`);
                    // If successful, continue the loop to re-plan based on the new state. The result is in the context/history.
                }

            } else {
                // Handle unknown action types returned by the planner
                console.error(`[FixCodeAgent:${chatId}] FixCodePlanner returned unknown action type: '${nextAction.action}'`);
                finalResponse = `Sorry, the code fixing planner returned an invalid action type at iteration ${iteration}.`;
                 const currentHistory = flowContext.getValue<Array<any>>('planningHistory') || [];
                 currentHistory.push({
                     action: 'unknown',
                     stepName: `invalidFixCodePlannerAction:${iteration}`,
                     result: nextAction,
                     error: new Error(`Unknown action type: ${nextAction.action}`)
                 });
                 flowContext.setValue('planningHistory', currentHistory);
                break; // Exit loop on unknown action type
            }
             // Loop continues here if action was 'tool' or 'prompt' and didn't break
        }

        // --- Final Response if loop exited without 'respond' ---
        if (iteration >= this.maxIterations) {
             console.warn(`[FixCodeAgent:${chatId}] Fix Code Planning loop reached maximum iterations (${this.maxIterations}). Stopping.`);
             // If the loop finished because of max iterations and finalResponse is still the default,
             // update it to indicate the iteration limit was hit.
             if (finalResponse === "Sorry, I couldn't complete the code fixing task.") {
                  finalResponse = `Sorry, I could not complete the code fixing task within the maximum number of steps (${this.maxIterations}).`;
             }
        }

        console.log(`[FixCodeAgent:${chatId}] Fix code process finished.`);
        return finalResponse;
    }
}