// src/orchestrator/execution/stepExecutor.ts

import { ToolRunner } from "../../services/toolRunner";
import { InteractionContext } from "../context/interactionContext";
import { ExecutionStep, StepResult } from "./types";
import { executeModelInteraction, PromptType } from "../../models/promptSystem";

/**
 * Responsible for executing a single ExecutionStep (tool or prompt).
 * Handles parameter resolution from context and storing results back into context.
 */
export class StepExecutor {
    // Usamos los tipos de las implementaciones reales que pasará el Orchestrator
    private toolRunner: typeof ToolRunner;

    // Recibe las implementaciones reales en el constructor
    constructor(toolRunner: typeof ToolRunner) {
        this.toolRunner = toolRunner;
       
    }

    /**
     * Executes a single step based on its definition.
     * Resolves parameters from the provided context, runs the tool/prompt,
     * and stores the result back into the context if 'storeAs' is specified.
     * Adapts the result format from the actual ToolRunner implementation.
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
                    // Optional: Store a 'skipped' status in context
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
            // 3. Execute the step (Tool or Prompt)
            if (step.type === 'tool') {
                 try {
                     // *** MODIFICACIÓN AQUÍ ***
                     // Llamamos a tu ToolRunner.runTool
                     const toolSpecificResult = await this.toolRunner.runTool(step.execute, resolvedParams);

                     // Asumimos éxito por defecto si no hay excepción.
                     // Si tu ToolRunner.runTool devuelve un formato específico para errores,
                     // como { error: ... }, lo manejaríamos aquí.
                     // Por ahora, asumimos que si no lanzó excepción, fue exitoso,
                     // y el resultado es el contenido.
                     rawResult = toolSpecificResult; // Tu resultado directo

                     // Si tu toolRunner.runTool devuelve { success: boolean, ... }, puedes usar:
                     // success = toolSpecificResult.success ?? true; // Assume success if property missing
                     // rawResult = toolSpecificResult.content ?? toolSpecificResult; // Use 'content' if exists, otherwise full result
                     // error = toolSpecificResult.error; // Capture error property if exists

                     success = true; // Si llega aquí sin lanzar, asumimos éxito

                     console.log(`[StepExecutor:${chatId}] Tool execution succeeded for '${step.name}'.`);

                 } catch (toolError) {
                     success = false;
                     error = toolError;
                     console.error(`[StepExecutor:${chatId}] Tool execution failed for '${step.name}':`, error);
                 }

            } else if (step.type === 'prompt') {
                 try {
                     rawResult = await executeModelInteraction(step.execute as PromptType, resolvedParams || {});
                     success = true;
                     console.log(`[StepExecutor:${chatId}] Prompt execution succeeded for '${step.name}'.`);
                 } catch (promptError) {
                     success = false;
                     error = promptError; // Captura el error lanzado por promptSystem
                     console.error(`[StepExecutor:${chatId}] Prompt execution failed for '${step.name}':`, error);
                 }

            } else {
                success = false;
                error = new Error(`Unknown step type: ${step.type}`);
                console.error(`[StepExecutor:${chatId}] Invalid step type for '${step.name}':`, error);
            }

        } catch (unexpectedError) {
            // Captura cualquier error inesperado que no haya sido manejado en los bloques try/catch específicos
            success = false;
            error = unexpectedError;
            console.error(`[StepExecutor:${chatId}] UNEXPECTED ERROR during step execution for '${step.name}':`, error);
        }

        // 4. Store result in context if storeAs is specified and the step was successful
        // Decidimos guardar el resultado RAW de la tool/prompt si fue exitoso
        if (step.storeAs && success) {
             context.setValue(step.storeAs, rawResult);
             console.log(`[StepExecutor:${chatId}] Stored successful result for '${step.name}' at '${step.storeAs}'.`);
        } else if (step.storeAs && !success) {
             // Opcional: Guardar el error o un indicador de fallo en el contexto
             // Esto permite a los handlers comprobar si un paso específico falló
             context.setValue(`${step.storeAs}_error`, error?.message || 'Execution failed');
             console.warn(`[StepExecutor:${chatId}] Step '${step.name}' failed. Stored error indicator at '${step.storeAs}_error'.`);
        }


        // 5. Return a structured StepResult regardless of success
        // Esto permite a los handlers reaccionar ante fallos o resultados específicos
        return {
            success: success,
            result: rawResult,
            error: error,
            timestamp: Date.now(),
            step: step,
            skipped: false // Was not skipped by condition here
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
                // Look up the key in the context data
                // Provide a default (e.g., null or undefined) if the key is not found
                // Using null for consistency if key is missing
                resolvedParams[key] = contextData[contextKey] !== undefined ? contextData[contextKey] : null;
            } else {
                // Recursively resolve nested objects/arrays
                resolvedParams[key] = this.resolveParameters(value, contextData);
            }
        }

        return resolvedParams;
    }
}