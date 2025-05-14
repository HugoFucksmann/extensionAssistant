// src/orchestrator/orchestrator.ts

import { FlowContext, GlobalContext, SessionContext, ConversationContext } from './context';
import { StepExecutor } from './execution/stepExecutor';
// Import PlannerResponse type from types.ts
import { ExecutionStep, InputAnalysisResult, StepResult, PromptType, PlannerResponse } from './execution/types';
// Handlers are no longer the primary execution path, keep imports for now but they won't be instantiated in the loop
// Add comments to handlers/index.ts and the handler files themselves
import { ConversationHandler, ExplainCodeHandler, FixCodeHandler } from './handlers';
import { ExecutorFactory } from './execution/executorFactory';

/**
 * Maximum number of planning iterations to prevent infinite loops.
 */
const MAX_PLANNING_ITERATIONS = 15; // Increased slightly, adjust as needed

/**
 * Main orchestrator that manages conversations and drives the incremental planning process.
 * Manages active ConversationContexts and executes steps based on planner prompt output.
 */
export class Orchestrator {
    private globalContext: GlobalContext;
    private sessionContext: SessionContext;
    private activeConversations: Map<string, ConversationContext> = new Map();

    private stepExecutor: StepExecutor;

    constructor(globalContext: GlobalContext, sessionContext: SessionContext) {
        this.globalContext = globalContext;
        this.sessionContext = sessionContext;
        const registry = ExecutorFactory.createExecutorRegistry();
        this.stepExecutor = new StepExecutor(registry);
        console.log('[Orchestrator] Initialized with global and session contexts.');
    }

    addConversationContext(convContext: ConversationContext): void {
        this.activeConversations.set(convContext.getChatId(), convContext);
         console.log(`[Orchestrator] Added ConversationContext for chat ${convContext.getChatId()}.`);
    }

    clearConversationContext(chatId: string): void {
        if (this.activeConversations.has(chatId)) {
            this.activeConversations.delete(chatId);
            console.log(`[Orchestrator] Cleared ConversationContext for chat ${chatId} from memory.`);
        }
    }

    getConversationContext(chatId: string): ConversationContext | undefined {
        return this.activeConversations.get(chatId);
    }


    /**
     * Processes a user message by running the planning loop.
     * Receives the FlowContext for the current turn.
     */
    public async processUserMessage(flowContext: FlowContext): Promise<string | any> {
        const chatId = flowContext.getChatId();
        const userMessageText = flowContext.getValue<string>('userMessage') || '';

        console.log(`[Orchestrator:${chatId}] Starting planning process for message: "${userMessageText}"`);

        let finalResponse: string | any = "Sorry, I couldn't complete the task."; // Default fallback response
        let planningIteration = 0;
        // planningHistory is now stored and managed within the FlowContext state
        // const planningHistory: Array<{ action: string; result: any; error?: any; stepName: string }> = []; // Removed local variable

        // --- Step 1: Initial Input Analysis (Always the first step) ---
        // This step is hardcoded as the starting point.
        // It runs once at the beginning of the planning process.
        if (!flowContext.getValue('analysisResult')) { // Only run if analysis hasn't been done (e.g., if resuming a flow - future)
             const analyzeStep: ExecutionStep = {
                 name: 'analyzeUserInput',
                 type: 'prompt',
                 execute: 'inputAnalyzer',
                 params: {}, // buildInputAnalyzerVariables uses resolution context
                 storeAs: 'analysisResult' // Result stored in FlowContext state
             };
             console.log(`[Orchestrator:${chatId}] Running initial input analysis step...`);
             const analysisResultStep = await this.stepExecutor.runStep(analyzeStep, flowContext);

             // Add analysis step result to planning history stored in FlowContext
             const currentHistory = flowContext.getValue<Array<any>>('planningHistory') || [];
             currentHistory.push({
                 action: 'prompt:inputAnalyzer',
                 stepName: analyzeStep.name,
                 result: analysisResultStep.result,
                 error: analysisResultStep.error
             });
             flowContext.setValue('planningHistory', currentHistory);


             if (!analysisResultStep.success || !analysisResultStep.result) {
                 console.warn(`[Orchestrator:${chatId}] Initial input analysis failed:`, analysisResultStep.error);
                 // Store a default/error analysis result in context if step failed
                 if (!flowContext.getAnalysisResult()) { // Only set if not already set by storeAs on success
                      flowContext.setValue('analysisResult', { intent: 'unknown', objective: 'Analysis failed', extractedEntities: {}, confidence: 0.1, error: analysisResultStep.error?.message || 'Analysis step failed' });
                 }
                  // Decide if we should stop here or let the planner try to recover
                  // For now, let the planner try.
             } else {
                  console.log(`[Orchestrator:${chatId}] Initial input analysis succeeded.`);
                  // Result is already stored in FlowContext by storeAs
             }
        } else {
             console.log(`[Orchestrator:${chatId}] Analysis result already exists in context. Skipping initial analysis.`);
        }


        // Retrieve the analysis result from the FlowContext for initial logging
        const initialAnalysis = flowContext.getAnalysisResult();
        console.log(`[Orchestrator:${chatId}] Analysis Result from FlowContext:`, initialAnalysis);


        // --- Step 2: The Planning Loop ---
        // The loop continues until the planner decides to 'respond' or max iterations are reached.
        while (planningIteration < MAX_PLANNING_ITERATIONS) {
            planningIteration++;
            console.log(`[Orchestrator:${chatId}] Planning iteration ${planningIteration}...`);

            // Store current planning iteration in FlowContext for the planner prompt
            flowContext.setValue('planningIteration', planningIteration);

            // Define the planner step
            const plannerStep: ExecutionStep = {
                name: `plannerStep:${planningIteration}`,
                type: 'prompt',
                execute: 'planner', // Use the new planner prompt type
                params: {}, // buildPlannerVariables uses resolution context
                // Do NOT store the planner's *output* directly with storeAs,
                // we need to parse it to decide the next action.
                // We will store the *result* of the action chosen by the planner.
            };

            let plannerResult: StepResult<PlannerResponse>;
            let nextAction: PlannerResponse | undefined;

            try {
                // Execute the planner prompt
                plannerResult = await this.stepExecutor.runStep(plannerStep, flowContext);

                // Add planner step result to planning history stored in FlowContext
                const currentHistory = flowContext.getValue<Array<any>>('planningHistory') || [];
                 currentHistory.push({
                     action: 'prompt:planner',
                     stepName: plannerStep.name,
                     result: plannerResult.result, // May be undefined or the parsed PlannerResponse
                     error: plannerResult.error
                 });
                 flowContext.setValue('planningHistory', currentHistory);


                if (!plannerResult.success || !plannerResult.result) {
                    console.error(`[Orchestrator:${chatId}] Planner step failed or returned no result:`, plannerResult.error);
                    finalResponse = `Sorry, the planning process failed at iteration ${planningIteration}. Error: ${plannerResult.error?.message || 'Unknown error'}`;
                    break; // Stop the loop on planner failure
                }

                // Parse the planner's output (StepExecutor already parsed it based on PlannerResponse type hint)
                nextAction = plannerResult.result;
                console.log(`[Orchestrator:${chatId}] Planner decided action:`, nextAction);

                 // Add successful planner decision to history (more detailed)
                 // This was already added above with the planner step result, but we can refine the history entry if needed.
                 // For now, the entry added after step execution is sufficient.


            } catch (plannerError: any) {
                 console.error(`[Orchestrator:${chatId}] UNEXPECTED Error during planner step execution:`, plannerError);
                 // Add unexpected planner execution error to history
                 const currentHistory = flowContext.getValue<Array<any>>('planningHistory') || [];
                 currentHistory.push({
                     action: 'prompt:planner',
                     stepName: `plannerStep:${planningIteration}`,
                     result: null,
                     error: plannerError
                 });
                 flowContext.setValue('planningHistory', currentHistory);

                 finalResponse = `Sorry, an unexpected error occurred during planning at iteration ${planningIteration}. Error: ${plannerError.message}`;
                 break; // Stop the loop on unexpected planner error
            }


            // --- Step 3: Execute the decided action ---
            if (!nextAction) {
                 console.error(`[Orchestrator:${chatId}] Planner returned no valid action.`);
                 finalResponse = `Sorry, the planner did not return a valid action at iteration ${planningIteration}.`;
                 // Add error to history
                 const currentHistory = flowContext.getValue<Array<any>>('planningHistory') || [];
                 currentHistory.push({
                     action: 'invalidPlannerOutput',
                     stepName: `plannerStep:${planningIteration}`,
                     result: plannerResult?.result, // Log the invalid output
                     error: new Error("Planner returned null or undefined action")
                 });
                 flowContext.setValue('planningHistory', currentHistory);
                 break; // Stop if planner output was invalid/missing
            }

            if (nextAction.action === 'respond') {
                // Planner decided to respond, get the final message and break the loop
                finalResponse = nextAction.params?.messageToUser || "Task completed.";
                console.log(`[Orchestrator:${chatId}] Planner decided to respond. Finalizing.`);
                // Add final response action to history
                 const currentHistory = flowContext.getValue<Array<any>>('planningHistory') || [];
                 currentHistory.push({
                     action: 'respond',
                     stepName: `respondStep:${planningIteration}`,
                     result: { messageToUser: finalResponse },
                     error: null
                 });
                 flowContext.setValue('planningHistory', currentHistory);
                break; // Exit the planning loop
            } else if (nextAction.action === 'tool' || nextAction.action === 'prompt') {
                // Planner decided to execute a tool or prompt
                const actionName = nextAction.toolName || nextAction.promptType;
                if (!actionName) {
                    console.error(`[Orchestrator:${chatId}] Planner decided '${nextAction.action}' but did not specify name.`);
                    finalResponse = `Sorry, the planner decided to execute a step but didn't specify which one at iteration ${planningIteration}.`;
                    // Add error to history
                    const currentHistory = flowContext.getValue<Array<any>>('planningHistory') || [];
                    currentHistory.push({
                        action: nextAction.action,
                        stepName: `executionError:${planningIteration}`,
                        result: nextAction,
                        error: new Error(`Action name missing for type ${nextAction.action}`)
                    });
                    flowContext.setValue('planningHistory', currentHistory);
                    break; // Stop if action name is missing
                }

                const executionStep: ExecutionStep = {
                    name: `${nextAction.action}Step:${planningIteration}:${actionName}`, // Dynamic step name
                    type: nextAction.action, // 'tool' or 'prompt'
                    execute: actionName,
                    params: nextAction.params || {}, // Pass params from planner output
                    storeAs: nextAction.storeAs, // Use storeAs from planner output
                    // Condition is not decided by planner output structure yet,
                    // but could be added in future stages if needed.
                };

                console.log(`[Orchestrator:${chatId}] Executing step decided by planner: '${executionStep.name}'`);
                const executionResult = await this.stepExecutor.runStep(executionStep, flowContext);

                // Add execution result to planning history stored in FlowContext
                const currentHistory = flowContext.getValue<Array<any>>('planningHistory') || [];
                currentHistory.push({
                    action: `${executionStep.type}:${executionStep.execute}`,
                    stepName: executionStep.name,
                    result: executionResult.result,
                    error: executionResult.error
                });
                flowContext.setValue('planningHistory', currentHistory);


                if (!executionResult.success && !executionResult.skipped) {
                    console.error(`[Orchestrator:${chatId}] Step execution failed: '${executionStep.name}'`, executionResult.error);
                    // Decide how to handle step failure:
                    // Option A: Stop the loop (simpler for now)
                    // finalResponse = `Sorry, a step failed during execution at iteration ${planningIteration}: '${executionStep.name}'. Error: ${executionResult.error?.message || 'Unknown error'}`;
                    // break;
                    // Option B: Let the planner decide the next step (more robust, requires planner to handle errors in history)
                    console.log(`[Orchestrator:${chatId}] Step failed, continuing planning loop to allow planner to handle.`);
                    // The loop continues, the planner will see the error in planningHistory and FlowContext state.
                } else if (executionResult.skipped) {
                     console.log(`[Orchestrator:${chatId}] Step execution skipped: '${executionStep.name}'.`);
                     // The loop continues. Planner sees 'skipped' marker in FlowContext state.
                } else {
                    console.log(`[Orchestrator:${chatId}] Step execution succeeded: '${executionStep.name}'.`);
                    // Result is stored in FlowContext by StepExecutor if storeAs was provided.
                    // The loop continues. Planner sees the result in FlowContext state.
                }

            } else {
                console.error(`[Orchestrator:${chatId}] Planner returned unknown action type: '${nextAction.action}'`);
                finalResponse = `Sorry, the planner returned an invalid action type at iteration ${planningIteration}.`;
                 // Add error to history
                 const currentHistory = flowContext.getValue<Array<any>>('planningHistory') || [];
                 currentHistory.push({
                     action: 'unknown',
                     stepName: `invalidPlannerAction:${planningIteration}`,
                     result: nextAction,
                     error: new Error(`Unknown action type: ${nextAction.action}`)
                 });
                 flowContext.setValue('planningHistory', currentHistory);
                break; // Stop on invalid action type
            }

            // --- Check for loop termination conditions ---
            // The primary termination is 'respond' action from planner.
            // Secondary termination is MAX_PLANNING_ITERATIONS.
            // Additional checks could be added (e.g., if context hasn't changed in N iterations).
        }

        // --- Step 4: Final Response ---
        if (planningIteration >= MAX_PLANNING_ITERATIONS) {
             console.warn(`[Orchestrator:${chatId}] Planning loop reached maximum iterations (${MAX_PLANNING_ITERATIONS}). Stopping.`);
             // finalResponse might still hold the default error message or the last step error message
             if (finalResponse === "Sorry, I couldn't complete the task.") {
                  finalResponse = `Sorry, I could not determine the final response within the maximum number of planning steps (${MAX_PLANNING_ITERATIONS}).`;
             }
        }

        console.log(`[Orchestrator:${chatId}] Planning process finished. Returning final response.`);

        // Dispose the FlowContext after the turn is complete
        // Note: If we implement flow resumption later, we might NOT dispose it here.
        // For now, assume each user message starts a new flow.
        flowContext.dispose();

        return finalResponse;
    }

    // ... (dispose method remains the same)
    dispose(): void {
        console.log('[Orchestrator] Disposing. Clearing all active conversation contexts.');
        // Dispose conversation contexts too, as Orchestrator manages their lifecycle in memory
        this.activeConversations.forEach(context => context.dispose());
        this.activeConversations.clear();
    }
}