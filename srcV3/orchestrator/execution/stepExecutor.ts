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

        // Get the full resolution context data *before* resolving parameters
        const resolutionContextData = context.getResolutionContext();

        // 1. Resolve parameters (only for tool steps)
        let executionParams: Record<string, any>;
        try {
            if (step.type === 'tool') {
                 // Resolve {{placeholder}} params for tool steps using the resolution context
                 executionParams = this.resolveParameters(step.params || {}, resolutionContextData);
                 console.log(`[StepExecutor:${chatId}] Tool params resolved for '${step.name}':`, executionParams);
            } else if (step.type === 'prompt') {
                 // For prompt steps, the executor (PromptExecutor) expects the full resolution context data.
                 // Any 'params' in the step definition are treated as non-contextual config by the executor/promptSystem.
                 // We pass the full context data as the primary parameter source for the prompt builder.
                 executionParams = resolutionContextData;
                 // Optionally merge non-contextual step.params if the executor/promptSystem needs them separately
                 // executionParams = { ...resolutionContextData, _stepParams: step.params || {} }; // Example of merging
                 console.log(`[StepExecutor:${chatId}] Prompt step '${step.name}' will receive full context data.`);
            } else {
                 throw new Error(`Unknown step type: ${step.type}`);
            }
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
             try {
                // Condition function receives the full resolution context data
                if (!step.condition(resolutionContextData)) {
                    console.log(`[StepExecutor:${chatId}] Skipping step '${step.name}' due to condition.`);
                    if (step.storeAs) {
                         // Store a marker indicating the step was skipped
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
                    // Execute the step using the appropriate executor, passing the prepared params
                    rawResult = await executor.execute(step.execute, executionParams);
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
             // Store error information if the step failed and storeAs was specified
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
            skipped: false // This field is set explicitly in the condition block if skipped
        };
    }

    /**
     * Recursively resolves parameter placeholders (e.g., {{key}}) in a params object.
     * Looks up values in the provided contextData. Handles nested objects and arrays.
     * This is primarily used for *tool* step parameters.
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
                // Look up the value in the context data
                resolvedParams[key] = contextData[contextKey] !== undefined ? contextData[contextKey] : null;
            } else {
                // Recursively resolve nested objects/arrays
                resolvedParams[key] = this.resolveParameters(value, contextData);
            }
        }

        return resolvedParams;
    }
}