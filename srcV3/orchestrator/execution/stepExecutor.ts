// src/orchestrator/execution/stepExecutor.ts

import { FlowContext } from "../context";
import { ExecutorRegistry } from "./ExecutorRegistry";
import { ExecutionStep, StepResult } from "./types";

/**
 * Responsible for executing a single ExecutionStep (tool or prompt).
 * Handles parameter resolution from context and storing results back into context.
 * Uses the ExecutorRegistry to determine the appropriate executor for each step.
 */
export class StepExecutor {
    private executorRegistry: ExecutorRegistry;

    constructor(executorRegistry: ExecutorRegistry) {
        this.executorRegistry = executorRegistry;
    }

    /**
     * Executes a single step based on its definition.
     * Resolves parameters from the provided FlowContext, runs the tool/prompt,
     * and stores the result back into the FlowContext if 'storeAs' is specified.
     * @param step The step definition.
     * @param flowContext The FlowContext for the current turn.
     * @returns A Promise resolving to the result of the step execution.
     */
    public async runStep(step: ExecutionStep, flowContext: FlowContext): Promise<StepResult> {
        const chatId = flowContext.getChatId();
        // console.log(`[StepExecutor:${chatId}] Running step '${step.name}' (Type: ${step.type}, Execute: ${step.execute})...`); // Reduced logging

        const resolutionContextData = flowContext.getResolutionContext();

        // 1. Resolve parameters
        let executionParams: Record<string, any>;
        try {
            if (step.type === 'tool') {
                 executionParams = this.resolveParameters(step.params || {}, resolutionContextData);
                 // console.log(`[StepExecutor:${chatId}] Tool params resolved for '${step.name}':`, executionParams); // Reduced logging
            } else if (step.type === 'prompt') {
                 executionParams = resolutionContextData; // Pass the flattened resolution context data
                 // console.log(`[StepExecutor:${chatId}] Prompt step '${step.name}' will receive resolution context data.`); // Reduced logging
            } else {
                 throw new Error(`Unknown step type: ${step.type}`);
            }
        } catch (paramResolveError: any) {
             console.error(`[StepExecutor:${chatId}] Parameter resolution failed for '${step.name}':`, paramResolveError.message);
             return {
                 success: false,
                 error: new Error(`Parameter resolution failed: ${paramResolveError.message}`),
                 timestamp: Date.now(),
                 step: step,
                 skipped: false
             };
        }

        // 2. Check condition if present
        if (step.condition) {
             try {
                if (!step.condition(resolutionContextData)) {
                    console.log(`[StepExecutor:${chatId}] Skipping step '${step.name}' due to condition.`);
                    if (step.storeAs) {
                         flowContext.setValue(step.storeAs, { skipped: true, timestamp: Date.now(), stepName: step.name });
                    }
                    return { success: true, result: 'skipped', timestamp: Date.now(), step, skipped: true };
                }
             } catch (conditionError: any) {
                 console.error(`[StepExecutor:${chatId}] Condition check failed for '${step.name}':`, conditionError.message);
                 return {
                    success: false,
                    error: new Error(`Condition check failed: ${conditionError.message}`),
                    timestamp: Date.now(),
                    step: step,
                    skipped: false
                 };
             }
        }

        let rawResult: any;
        let success = true;
        let error: any;

        try {
            // 3. Find appropriate executor
            const executor = this.executorRegistry.getExecutorFor(step.execute);

            if (!executor) {
                success = false;
                error = new Error(`No executor found for action: ${step.execute}`);
                console.error(`[StepExecutor:${chatId}] ${error.message}`);
            } else {
                try {
                    rawResult = await executor.execute(step.execute, executionParams);
                    success = true;
                    // console.log(`[StepExecutor:${chatId}] Step execution succeeded for '${step.name}'.`); // Reduced logging
                } catch (executionError) {
                    success = false;
                    error = executionError;
                    console.error(`[StepExecutor:${chatId}] Step execution failed for '${step.name}':`, error);
                }
            }
        } catch (unexpectedError) {
            success = false;
            error = unexpectedError;
            console.error(`[StepExecutor:${chatId}] UNEXPECTED ERROR during step execution for '${step.name}':`, error);
        }

        // 4. Store result in FlowContext state if storeAs is specified and the step was successful
        if (step.storeAs && success) {
             flowContext.setValue(step.storeAs, rawResult);
             // console.log(`[StepExecutor:${chatId}] Stored successful result for '${step.name}' at '${step.storeAs}'.`); // Reduced logging
        } else if (step.storeAs && !success) {
             flowContext.setValue(`${step.storeAs}_error`, error?.message || 'Execution failed');
             // console.warn(`[StepExecutor:${chatId}] Step '${step.name}' failed. Stored error indicator at '${step.storeAs}_error'.`); // Reduced logging
        }

        // 5. Return a structured StepResult
        return {
            success: success,
            result: rawResult,
            error: error,
            timestamp: Date.now(),
            step: step,
            skipped: false
        };
    }

    /**
     * Recursively resolves parameter placeholders (e.g., {{key}}) in a params object.
     * Looks up values in the provided contextData (the resolution context).
     * Handles nested objects and arrays.
     * This is primarily used for *tool* step parameters.
     */
    private resolveParameters(params: any, resolutionContextData: Record<string, any>): any {
        if (typeof params !== 'object' || params === null) {
            return params;
        }

        if (Array.isArray(params)) {
            return params.map(item => this.resolveParameters(item, resolutionContextData));
        }

        const resolvedParams: Record<string, any> = {};
        for (const [key, value] of Object.entries(params)) {
            if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
                const contextKey = value.substring(2, value.length - 2);
                const keys = contextKey.split('.');
                let currentValue: any = resolutionContextData;
                let found = true;
                for (const k of keys) {
                    if (currentValue && typeof currentValue === 'object' && k in currentValue) {
                        currentValue = currentValue[k];
                    } else {
                        found = false;
                        currentValue = undefined;
                        break;
                    }
                }
                resolvedParams[key] = found ? currentValue : null;

            } else {
                resolvedParams[key] = this.resolveParameters(value, resolutionContextData);
            }
        }

        return resolvedParams;
    }
}