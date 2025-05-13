// src/orchestrator/execution/stepExecutor.ts

import { InteractionContext } from "../context/interactionContext";
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
     * Resolves parameters from the provided context, runs the tool/prompt,
     * and stores the result back into the context if 'storeAs' is specified.
     * @param step The step definition.
     * @param context The interaction context for the current conversation.
     * @returns A Promise resolving to the result of the step execution.
     */
    public async runStep(step: ExecutionStep, context: InteractionContext): Promise<StepResult> {
        const chatId = context.getChatId();
        const stepStartTime = Date.now();
        console.log(`[StepExecutor:${chatId}] Running step '${step.name}' (Type: ${step.type}, Execute: ${step.execute})...`);

        // 1. Resolve parameters using the resolution context
        let resolvedParams: Record<string, any> | undefined;
        try {
            const resolutionContextData = context.getResolutionContext();
            resolvedParams = this.resolveParameters(step.params || {}, resolutionContextData);
            console.log(`[StepExecutor:${chatId}] Params resolved for '${step.name}':`, resolvedParams);
        } catch (paramResolveError: any) {
             console.error(`[StepExecutor:${chatId}] Parameter resolution failed for '${step.name}':`, paramResolveError);
             return {
                 success: false,
                 error: new Error(`Parameter resolution failed: ${paramResolveError.message}`),
                 timestamp: Date.now(),
                 step: step,
             };
        }

        // 2. Check condition if present
        if (step.condition) {
             const resolutionContextData = context.getResolutionContext();
             try {
                if (!step.condition(resolutionContextData)) {
                    console.log(`[StepExecutor:${chatId}] Skipping step '${step.name}' due to condition.`);
                    if (step.storeAs) {
                         context.setValue(step.storeAs, { skipped: true, timestamp: Date.now(), stepName: step.name });
                    }
                    return { success: true, result: 'skipped', timestamp: Date.now(), step, skipped: true };
                }
             } catch (conditionError: any) {
                 console.error(`[StepExecutor:${chatId}] Condition check failed for '${step.name}':`, conditionError);
                 return {
                    success: false,
                    error: new Error(`Condition check failed: ${conditionError.message}`),
                    timestamp: Date.now(),
                    step: step,
                 };
             }
        }

        let rawResult: any;
        let success = true;
        let error: any;

        try {
            // 3. Find appropriate executor for this step
            const executor = this.executorRegistry.getExecutorFor(step.execute);
            
            if (!executor) {
                success = false;
                error = new Error(`No executor found for action: ${step.execute}`);
                console.error(`[StepExecutor:${chatId}] ${error.message}`);
            } else {
                try {
                    // Execute the step using the appropriate executor
                    rawResult = await executor.execute(step.execute, resolvedParams || {});
                    success = true;
                    console.log(`[StepExecutor:${chatId}] Step execution succeeded for '${step.name}'.`);
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

        // 4. Store result in context if storeAs is specified and the step was successful
        if (step.storeAs && success) {
             context.setValue(step.storeAs, rawResult);
             console.log(`[StepExecutor:${chatId}] Stored successful result for '${step.name}' at '${step.storeAs}'.`);
        } else if (step.storeAs && !success) {
             context.setValue(`${step.storeAs}_error`, error?.message || 'Execution failed');
             console.warn(`[StepExecutor:${chatId}] Step '${step.name}' failed. Stored error indicator at '${step.storeAs}_error'.`);
        }

        // 5. Return a structured StepResult regardless of success
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
     * Looks up values in the provided contextData. Handles nested objects and arrays.
     */
    private resolveParameters(params: any, contextData: Record<string, any>): any {
        if (typeof params !== 'object' || params === null) {
            return params; // Base case: not an object, return as is
        }

        if (Array.isArray(params)) {
            // Recursively process array elements
            return params.map(item => this.resolveParameters(item, contextData));
        }

        // Process object properties
        const resolvedParams: Record<string, any> = {};
        for (const [key, value] of Object.entries(params)) {
            if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
                const contextKey = value.substring(2, value.length - 2);
                resolvedParams[key] = contextData[contextKey] !== undefined ? contextData[contextKey] : null;
            } else {
                // Recursively resolve nested objects/arrays
                resolvedParams[key] = this.resolveParameters(value, contextData);
            }
        }

        return resolvedParams;
    }
}