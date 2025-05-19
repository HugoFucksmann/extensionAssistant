// src/models/PromptService.ts
// MODIFIED: Added traceId parameter to executePrompt and used it for trace calls.

import { z, ZodSchema } from 'zod'; // Needed for Zod types
import { Runnable, RunnableSequence } from '@langchain/core/runnables'; // Import LangChain Runnables
import { ChatPromptTemplate } from "@langchain/core/prompts"; // Import LangChain Prompt Template type
import { BaseChatModel } from "@langchain/core/language_models/chat_models"; // Import LangChain LLM type
import { PromptType, BasePromptVariables } from '../orchestrator'; // Import PromptType and types
import { getPromptMetadata, PromptMetadata } from './prompts/promptMetadata'; // Depend on prompt metadata registry
import { ModelManager } from './config/ModelManager'; // Depend on ModelManager
import { ValidatorService } from '../validation/ValidatorService'; // Depend on ValidatorService
import { EventEmitterService } from '../events/EventEmitterService'; // Depend on EventEmitterService
import { TraceService } from '../observability/TraceService'; // Depend on TraceService for tracing prompt calls

// Need a LangChain output parser that integrates with Zod.
// LangChain provides methods like .withStructuredOutput() directly on LLMs/ChatModels now.
// Or using @langchain/core/output_parsers/zod

/**
 * Service responsible for executing AI prompts using LangChain pipelines.
 * Builds prompt variables from context, uses templates, calls the model,
 * validates/parses output with Zod, and emits events.
 */
export class PromptService {
    private modelManager: ModelManager;
    private validatorService: ValidatorService;
    private eventEmitter: EventEmitterService;
    private traceService: TraceService; // Inject TraceService

    // The prompt metadata is accessed via the getPromptMetadata function, no need to store the whole registry

    constructor(
        modelManager: ModelManager,
        validatorService: ValidatorService,
        eventEmitter: EventEmitterService,
        traceService: TraceService // Inject TraceService
    ) {
        this.modelManager = modelManager;
        this.validatorService = validatorService;
        this.eventEmitter = eventEmitter;
        this.traceService = traceService;
        console.log('[PromptService] Initialized.');
         // Prompt output schemas are registered by LangChainToolAdapter or ValidatorService initialization
    }

    /**
     * Executes a specific prompt using a LangChain pipeline.
     *
     * @param type The type of prompt to execute.
     * @param contextSnapshot The consolidated context snapshot for variable building.
     * @param traceId The trace ID for the current turn/execution.
     * @returns A Promise resolving to the validated/parsed result of the model interaction.
     * @throws Error if the prompt type is unknown, variable building fails,
     * model interaction fails, or output validation fails.
     */
    async executePrompt<T = any>(type: PromptType, contextSnapshot: Record<string, any>, traceId: string): Promise<T> { // MODIFIED: Added traceId parameter
        const metadata = getPromptMetadata(type);
        if (!metadata) {
            throw new Error(`Unknown prompt type: ${type}`);
        }

        // Use prompt type and iteration/timestamp for step ID
        const planningIteration = contextSnapshot.planningIteration || 1;
        const stepId = `${type}-${planningIteration}-${Date.now()}`; // Use a unique ID for the step


        try {
            // 1. Build prompt variables using the builder function and context snapshot
            const variables = metadata.buildVariables(contextSnapshot);
            // console.debug(`[PromptService] Built variables for ${type}:`, variables); // Use logger

             // 2. Get LangChain model instance
             const model = this.modelManager.getLangChainModelInstance();
             // console.debug(`[PromptService] Using model: ${this.modelManager.getCurrentModel()}`); // Use logger

             // 3. Get LangChain prompt template
             const template = metadata.template;

             // 4. Get output schema
             const outputSchema = metadata.outputSchema;

             // 5. Build the LangChain pipeline: Variables -> Template -> Model -> Output Parser (with Zod)
             // The .withStructuredOutput() method on the model integrates parsing and validation
             // Ensure your LangChain model integration supports this. If not, use zod_parser directly.
             // Example using .withStructuredOutput (preferred if available):
             const pipeline = template.pipe(model.withStructuredOutput(outputSchema));


             // Emit prompt called event and add step to trace
             this.traceService.addStepToTrace(traceId, stepId, 'prompt', type, variables); // Use traceId parameter
             this.eventEmitter.emit('promptCalled', { promptType: type, variables, traceId, stepId });


            // 6. Invoke the pipeline with the variables
            // The invoke call needs the signal for aborting
            // The PromptService should get the signal from whoever manages the overall turn (OrchestratorService)
            // For now, let's assume the invoke call can take an options object with signal
            // Or, ModelManager handles the global AbortController and passes it implicitly?
            // LangChain standard is usually passing { signal: AbortSignal } in invoke options.
            // Let's add a placeholder for options, the OrchestratorService will provide the signal.
            const invokeOptions = { signal: this.modelManager.getAbortController()?.signal }; // Conceptual: ModelManager exposes its controller


            const result = await pipeline.invoke(variables, invokeOptions as any); // Invoke with options

             // 7. The result from the pipeline is already validated and parsed by Zod
             // If validation failed within the pipeline, it would throw an error caught below.

             // Emit completion event and end step in trace
             this.eventEmitter.emit('promptCompleted', { promptType: type, result, traceId, stepId }); // Use traceId parameter
             this.traceService.endLastStep(traceId, result); // Use traceId parameter

            return result as T; // Return the validated/parsed result

        } catch (error: any) {
             // Emit failure event and fail step in trace
             this.eventEmitter.emit('promptFailed', { promptType: type, error, traceId, stepId }); // Use traceId parameter
             this.traceService.failLastStep(traceId, error); // Use traceId parameter

             console.error(`[PromptService] Error executing prompt ${type}:`, error);

             // LangChain pipeline errors, including Zod validation errors from output, will be caught here.
             // Re-throw the error so the orchestrator/handler can manage flow based on failure.
             // You might want to wrap it in a custom error type.
              const errorMessage = error instanceof z.ZodError
                  ? `Prompt Output Validation Error for ${type}: ${error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')}`
                  : error.message || String(error);

             throw new Error(`Prompt execution failed for ${type}: ${errorMessage}`);
        }
    }

    dispose(): void {
        // No specific resources to dispose
        console.log('[PromptService] Disposed.');
    }
}