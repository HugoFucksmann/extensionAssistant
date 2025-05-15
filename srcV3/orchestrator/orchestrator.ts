// src/orchestrator/orchestrator.ts

import { FlowContext, GlobalContext, SessionContext, ConversationContext } from './context';
import { ExecutorFactory } from './execution/executorFactory';
import { StepExecutor } from './execution/stepExecutor';
import { ExecutionStep, PlannerResponse, StepResult } from './execution/types'; // Removed unused types

/**
 * Maximum number of planning iterations to prevent infinite loops.
 */
const MAX_PLANNING_ITERATIONS = 15;

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
        // console.log('[Orchestrator] Initialized'); // Reduced logging
    }

    addConversationContext(convContext: ConversationContext): void {
        this.activeConversations.set(convContext.getChatId(), convContext);
        // console.log(`[Orchestrator] Added ConversationContext for chat ${convContext.getChatId()}`); // Reduced logging
    }

    clearConversationContext(chatId: string): void {
        if (this.activeConversations.has(chatId)) {
            this.activeConversations.delete(chatId);
            // console.log(`[Orchestrator] Cleared ConversationContext for chat ${chatId}`); // Reduced logging
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

        console.log(`[Orchestrator:${chatId}] Starting planning for: "${userMessageText.substring(0, 50)}..."`); // More concise log

        let finalResponse: string | any = "Sorry, I couldn't complete the task.";
        let planningIteration = 0;

        // --- Step 1: Initial Input Analysis ---
        if (!flowContext.getValue('analysisResult')) {
             const analyzeStep: ExecutionStep = {
                 name: 'analyzeUserInput',
                 type: 'prompt',
                 execute: 'inputAnalyzer',
                 params: {},
                 storeAs: 'analysisResult'
             };
             console.log(`[Orchestrator:${chatId}] Running initial analysis...`);
             const analysisResultStep = await this.stepExecutor.runStep(analyzeStep, flowContext);

             const currentHistory = flowContext.getValue<Array<any>>('planningHistory') || [];
             currentHistory.push({
                 action: 'prompt:inputAnalyzer',
                 stepName: analyzeStep.name,
                 result: analysisResultStep.result,
                 error: analysisResultStep.error
             });
             flowContext.setValue('planningHistory', currentHistory);

             if (!analysisResultStep.success || !analysisResultStep.result) {
                 console.warn(`[Orchestrator:${chatId}] Initial analysis failed:`, analysisResultStep.error?.message); // More concise log
                 if (!flowContext.getAnalysisResult()) {
                      flowContext.setValue('analysisResult', { intent: 'unknown', objective: 'Analysis failed', extractedEntities: {}, confidence: 0.1, error: analysisResultStep.error?.message || 'Analysis step failed' });
                 }
             } else {
                  console.log(`[Orchestrator:${chatId}] Initial analysis succeeded.`);
             }
        } else {
             console.log(`[Orchestrator:${chatId}] Analysis result found in context. Skipping initial analysis.`);
        }

        const initialAnalysis = flowContext.getAnalysisResult();
        console.log(`[Orchestrator:${chatId}] Analysis Intent: ${initialAnalysis?.intent}, Objective: ${initialAnalysis?.objective}`); // Concise log

        // --- Step 2: The Planning Loop ---
        while (planningIteration < MAX_PLANNING_ITERATIONS) {
            planningIteration++;
            console.log(`[Orchestrator:${chatId}] Planning iteration ${planningIteration}`);

            flowContext.setValue('planningIteration', planningIteration);

            const plannerStep: ExecutionStep = {
                name: `plannerStep:${planningIteration}`,
                type: 'prompt',
                execute: 'planner',
                params: {},
            };

            let plannerResult: StepResult<PlannerResponse>;
            let nextAction: PlannerResponse | undefined;

            try {
                plannerResult = await this.stepExecutor.runStep(plannerStep, flowContext);

                const currentHistory = flowContext.getValue<Array<any>>('planningHistory') || [];
                 currentHistory.push({
                     action: 'prompt:planner',
                     stepName: plannerStep.name,
                     result: plannerResult.result,
                     error: plannerResult.error
                 });
                 flowContext.setValue('planningHistory', currentHistory);

                if (!plannerResult.success || !plannerResult.result) {
                    console.error(`[Orchestrator:${chatId}] Planner step failed or returned no result:`, plannerResult.error?.message);
                    finalResponse = `Sorry, the planning process failed at iteration ${planningIteration}. Error: ${plannerResult.error?.message || 'Unknown error'}`;
                    break;
                }

                nextAction = plannerResult.result;
                console.log(`[Orchestrator:${chatId}] Planner decided action: '${nextAction.action}'`);

            } catch (plannerError: any) {
                 console.error(`[Orchestrator:${chatId}] UNEXPECTED Error during planner step:`, plannerError);
                 const currentHistory = flowContext.getValue<Array<any>>('planningHistory') || [];
                 currentHistory.push({
                     action: 'prompt:planner',
                     stepName: `plannerStep:${planningIteration}`,
                     result: null,
                     error: plannerError
                 });
                 flowContext.setValue('planningHistory', currentHistory);

                 finalResponse = `Sorry, an unexpected error occurred during planning at iteration ${planningIteration}. Error: ${plannerError.message}`;
                 break;
            }

            // --- Step 3: Execute the decided action ---
            if (!nextAction) {
                 console.error(`[Orchestrator:${chatId}] Planner returned no valid action.`);
                 finalResponse = `Sorry, the planner did not return a valid action at iteration ${planningIteration}.`;
                 const currentHistory = flowContext.getValue<Array<any>>('planningHistory') || [];
                 currentHistory.push({
                     action: 'invalidPlannerOutput',
                     stepName: `plannerStep:${planningIteration}`,
                     result: plannerResult?.result,
                     error: new Error("Planner returned null or undefined action")
                 });
                 flowContext.setValue('planningHistory', currentHistory);
                 break;
            }

            if (nextAction.action === 'respond') {
                finalResponse = nextAction.params?.messageToUser || "Task completed.";
                console.log(`[Orchestrator:${chatId}] Planner decided to respond. Finalizing.`);
                 const currentHistory = flowContext.getValue<Array<any>>('planningHistory') || [];
                 currentHistory.push({
                     action: 'respond',
                     stepName: `respondStep:${planningIteration}`,
                     result: { messageToUser: finalResponse },
                     error: null
                 });
                 flowContext.setValue('planningHistory', currentHistory);
                break;
            } else if (nextAction.action === 'tool' || nextAction.action === 'prompt') {
                const actionName = nextAction.toolName || nextAction.promptType;
                if (!actionName) {
                    console.error(`[Orchestrator:${chatId}] Planner decided '${nextAction.action}' but did not specify name.`);
                    finalResponse = `Sorry, the planner decided to execute a step but didn't specify which one at iteration ${planningIteration}.`;
                    const currentHistory = flowContext.getValue<Array<any>>('planningHistory') || [];
                    currentHistory.push({
                        action: nextAction.action,
                        stepName: `executionError:${planningIteration}`,
                        result: nextAction,
                        error: new Error(`Action name missing for type ${nextAction.action}`)
                    });
                    flowContext.setValue('planningHistory', currentHistory);
                    break;
                }

                const executionStep: ExecutionStep = {
                    name: `${nextAction.action}Step:${planningIteration}:${actionName}`,
                    type: nextAction.action,
                    execute: actionName,
                    params: nextAction.params || {},
                    storeAs: nextAction.storeAs,
                };

                console.log(`[Orchestrator:${chatId}] Executing step: '${executionStep.name}'`);
                const executionResult = await this.stepExecutor.runStep(executionStep, flowContext);

                const currentHistory = flowContext.getValue<Array<any>>('planningHistory') || [];
                currentHistory.push({
                    action: `${executionStep.type}:${executionStep.execute}`,
                    stepName: executionStep.name,
                    result: executionResult.result,
                    error: executionResult.error
                });
                flowContext.setValue('planningHistory', currentHistory);

                if (!executionResult.success && !executionResult.skipped) {
                    console.error(`[Orchestrator:${chatId}] Step execution failed: '${executionStep.name}'`, executionResult.error?.message);
                    console.log(`[Orchestrator:${chatId}] Step failed, continuing planning loop.`);
                } else if (executionResult.skipped) {
                     console.log(`[Orchestrator:${chatId}] Step execution skipped: '${executionStep.name}'.`);
                } else {
                    console.log(`[Orchestrator:${chatId}] Step execution succeeded: '${executionStep.name}'.`);
                }

            } else {
                console.error(`[Orchestrator:${chatId}] Planner returned unknown action type: '${nextAction.action}'`);
                finalResponse = `Sorry, the planner returned an invalid action type at iteration ${planningIteration}.`;
                 const currentHistory = flowContext.getValue<Array<any>>('planningHistory') || [];
                 currentHistory.push({
                     action: 'unknown',
                     stepName: `invalidPlannerAction:${planningIteration}`,
                     result: nextAction,
                     error: new Error(`Unknown action type: ${nextAction.action}`)
                 });
                 flowContext.setValue('planningHistory', currentHistory);
                break;
            }
        }

        // --- Step 4: Final Response ---
        if (planningIteration >= MAX_PLANNING_ITERATIONS) {
             console.warn(`[Orchestrator:${chatId}] Planning loop reached maximum iterations (${MAX_PLANNING_ITERATIONS}). Stopping.`);
             if (finalResponse === "Sorry, I couldn't complete the task.") {
                  finalResponse = `Sorry, I could not determine the final response within the maximum number of planning steps (${MAX_PLANNING_ITERATIONS}).`;
             }
        }

        console.log(`[Orchestrator:${chatId}] Planning process finished.`);

        flowContext.dispose();

        return finalResponse;
    }

    dispose(): void {
        console.log('[Orchestrator] Disposing.');
        this.activeConversations.forEach(context => context.dispose());
        this.activeConversations.clear();
    }
}