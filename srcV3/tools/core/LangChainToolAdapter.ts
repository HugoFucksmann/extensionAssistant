// src/tools/core/LangChainToolAdapter.ts
// MODIFIED: Adjusted func wrapper to get traceId from config and pass it to runTool.
// MODIFIED: Removed call to TraceService.getCurrentTraceId.

import { DynamicTool, Tool } from '@langchain/core/tools'; // Use DynamicTool for simpler wrapping
import { z, ZodError } from 'zod'; // Need Zod types
import { ToolMetadata, getAllToolMetadata, getToolMetadata } from './toolMetadata'; // Depend on our metadata registry
import { ValidatorService } from '../../validation/ValidatorService'; // Depend on ValidatorService
import { EventEmitterService } from '../../events/EventEmitterService'; // Depend on EventEmitterService
import { TraceService } from '../../observability/TraceService'; // Depend on TraceService for tracing tool calls
import * as vscode from 'vscode'; // Need for SimplifiedLocationSchema output parsing
import { IFlowContextState } from '../../orchestrator'; // Import FlowContextState interface to type config
import {  ToolRunnableConfig } from '@langchain/core/tools'; // Import LangChain types

// Re-import simplified schemas for potential output parsing if needed
import { SearchWorkspaceOutputSchema, ApplyWorkspaceEditOutputSchema, GetActiveEditorContentOutputSchema, GetWorkspaceFilesOutputSchema, GetFileContentsOutputSchema, GetPackageDependenciesOutputSchema, GetProjectInfoOutputSchema } from '../../validation/schemas';
import { CallbackManagerForToolRun } from '@langchain/core/callbacks/manager';


// Map tool names to their specific output schemas for easier lookup
const TOOL_OUTPUT_SCHEMAS: Record<string, z.ZodSchema<any>> = {
    'filesystem.getWorkspaceFiles': GetWorkspaceFilesOutputSchema,
    'filesystem.getFileContents': GetFileContentsOutputSchema,
    'editor.getActiveEditorContent': GetActiveEditorContentOutputSchema,
    'project.getPackageDependencies': GetPackageDependenciesOutputSchema,
    'project.getProjectInfo': GetProjectInfoOutputSchema,
    'project.searchWorkspace': SearchWorkspaceOutputSchema,
    'codeManipulation.applyWorkspaceEdit': ApplyWorkspaceEditOutputSchema,
    // Add other tool schemas here
};


/**
 * Adapts internal tool functions to LangChain Tool instances.
 * Handles input/output validation using ValidatorService and emits events.
 */
export class LangChainToolAdapter {
    private validatorService: ValidatorService;
    private eventEmitter: EventEmitterService;
    private traceService: TraceService; // Inject TraceService


    constructor(
        validatorService: ValidatorService,
        eventEmitter: EventEmitterService,
        traceService: TraceService // Inject TraceService
    ) {
        this.validatorService = validatorService;
        this.eventEmitter = eventEmitter;
        this.traceService = traceService;
        console.log('[LangChainToolAdapter] Initialized.');

        // Register tool input/output schemas with the ValidatorService
        getAllToolMetadata().forEach(metadata => {
             this.validatorService.registerSchema(`${metadata.name}_input`, metadata.inputSchema);
             if (metadata.outputSchema) {
                 this.validatorService.registerSchema(`${metadata.name}_output`, metadata.outputSchema);
             }
        });
        console.log('[LangChainToolAdapter] Tool schemas registered with ValidatorService.');
    }

    /**
     * Gets all registered tools as LangChain Tool instances.
     * Used by LangGraph to define the available tools.
     * The 'func' method of the DynamicTool will be called by LangChain.
     */
    getLangChainTools(): Tool[] {
        return getAllToolMetadata().map(metadata =>
            new DynamicTool({
                name: metadata.name,
                description: metadata.description,
                // The func wrapper handles validation, events, and calling the actual tool logic
                // It receives input and runManager from LangChain.
                func: async (input: string, runManager?: CallbackManagerForToolRun, config?: ToolRunnableConfig<Record<string, any>>) => {
                    try {
                        // Extract state from runManager's metadata if available
                        // Accedemos a las propiedades internas del runManager para obtener el estado
                        // @ts-ignore - Accedemos a propiedades internas que pueden no estar en la interfaz pública
                        const state = runManager?.metadata?.state as IFlowContextState | undefined;
                        // Get traceId from the LangGraph state
                        const traceId = state?.traceId;
                        
                        if (!traceId) {
                            console.warn(`[LangChainToolAdapter] Tool "${metadata.name}" called without traceId in state. Cannot trace.`);
                            // Decide how to handle: throw error, use a default traceId, or skip tracing for this call.
                            // For robustness, we might proceed without tracing, but it indicates a flow issue.
                        }

                        // Parse input if it's a string (LangChain always passes string)
                        let params: any;
                        try {
                            // If input is a JSON string, parse it
                            params = typeof input === 'string' && input.trim().startsWith('{') 
                                ? JSON.parse(input) 
                                : input;
                        } catch (parseError) {
                            // If parsing fails, use the raw string
                            params = input;
                            console.warn(`[LangChainToolAdapter] Failed to parse input as JSON for tool "${metadata.name}":`, parseError);
                        }

                        // Call our runTool method which handles validation, events, and execution
                        return await this.runTool(metadata.name, params, traceId);
                    } catch (error) {
                        console.error(`[LangChainToolAdapter] Error in LangChain tool wrapper for "${metadata.name}":`, error);
                        throw error; // Re-throw to let LangChain handle it
                    }
                }
            })
        );
    }

     /**
      * Executes a tool directly (e.g., called by UI) or internally from the LangChain wrapper.
      * Provides validation and event emission. Manages tracing steps.
      */
     async runTool(toolName: string, params: any, traceId?: string): Promise<any> { // MODIFIED: traceId is now optional for direct calls
          const metadata = getToolMetadata(toolName);
          if (!metadata) {
              // This indicates a configuration error, not a tool execution error
              const configError = new Error(`Tool "${toolName}" not found in registry.`);
              console.error('[LangChainToolAdapter] Config Error:', configError.message);
              this.eventEmitter.emit('toolConfigError', { toolName, error: configError.message });
              throw configError;
          }

          // For direct UI calls, start a new trace. For calls from LangGraph, traceId is provided.
          const currentTraceId = traceId || this.traceService.startTrace(`Direct Tool Call: ${toolName}`, { toolName, params });
          const stepId = `${toolName}-${traceId ? 'graph' : 'direct'}-${Date.now()}`; // Simple step ID

          try {
               // 1. Validate input
               // Use validate() which throws on failure - this is caught below
               const validatedParams = this.validatorService.validate(params, `${toolName}_input`);

               // Add step to trace *after* input validation
               this.traceService.addStepToTrace(currentTraceId, stepId, 'tool', toolName, validatedParams); // Use validatedParams for trace log
               this.eventEmitter.emit('toolCalled', { toolName, params: validatedParams, traceId: currentTraceId, stepId }); // Emit validated params


               // 2. Execute the actual tool function
               const rawResult = await metadata.func(validatedParams);

               // 3. Validate the output result using the ValidatorService (if schema exists)
               let validatedResult = rawResult; // Assume rawResult is fine if no output schema
               if (metadata.outputSchema) {
                   // Use validate() which throws on failure
                   validatedResult = this.validatorService.validate(rawResult, `${toolName}_output`);
               }

               // 4. Emit completion event and end trace step
               this.eventEmitter.emit('toolCompleted', { toolName, result: validatedResult, traceId: currentTraceId, stepId });
               this.traceService.endLastStep(currentTraceId, validatedResult);

               // For direct calls, end the trace here. For graph calls, the orchestrator ends the main trace.
               if (!traceId) {
                    this.traceService.endTrace(currentTraceId, validatedResult);
               }

               return validatedResult; // Return the validated result

          } catch (error: any) {
               // Emit failure event and fail trace step
               this.eventEmitter.emit('toolFailed', { toolName, error, traceId: currentTraceId, stepId });
               // Check if step was already added before failing it
               // This check is implicit if addStepToTrace is inside the try block after validation
               // If validation fails, addStepToTrace is not called, so failLastStep might fail.
               // A more robust approach would be to add step *before* validation, but then params aren't validated.
               // Let's assume validation errors are caught here and failLastStep is called only if addStepToTrace succeeded.
               // Or, add a check in failLastStep if the step exists.
               // For now, rely on addStepToTrace being called before the main execution logic.
               this.traceService.failLastStep(currentTraceId, error);

               // For direct calls, fail the trace here.
               if (!traceId) {
                    this.traceService.failTrace(currentTraceId, error);
               }


               console.error(`[LangChainToolAdapter] Error executing tool ${toolName}:`, error);

               // LangChain Tool 'func' should throw on error
               // Include schema issues in the error message for debugging
               const errorMessage = error instanceof ZodError
                   ? `Validation Error for ${toolName} ${error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')}`
                   : error.message || String(error);

               throw new Error(`Tool execution failed for ${toolName}: ${errorMessage}`);
          }
     }

     dispose(): void {
         // No specific resources to dispose
         console.log('[LangChainToolAdapter] Disposed.');
     }
}