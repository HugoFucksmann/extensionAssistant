// src/orchestrator/orchestrator.ts

import { FlowContext, GlobalContext, SessionContext, ConversationContext } from './context';
import { ExecutorFactory } from './execution/executorFactory';
import { StepExecutor } from './execution/stepExecutor';
import { ExecutionStep, PlannerResponse, StepResult, InputAnalysisResult } from './execution/types';
import { IAgent } from './execution/types';

// Import agent implementations
import { ConversationAgent } from './agents/ConversationAgent';
import { FixCodeAgent } from './agents/FixCodeAgent';
import { ExplainCodeAgent } from './agents/ExplainCodeAgent';
import { UnknownIntentAgent } from './agents/UnknownIntentAgent';
import { SearchAgent } from './agents/SearchAgent';
import { ConsoleAgent } from './agents/ConsoleAgent';
import { EditingAgent } from './agents/EditingAgent';
import { ExaminationAgent } from './agents/ExaminationAgent';
import { ProjectManagementAgent } from './agents/ProjectManagementAgent'; // Import ProjectManagementAgent


/**
 * Maximum number of planning iterations for agents that use an internal loop (like UnknownIntentAgent and FixCodeAgent).
 */
const MAX_AGENT_ITERATIONS = 15;

/**
 * Main orchestrator that acts as a router based on initial intent analysis.
 * Manages active ConversationContexts and delegates execution to specialized agents.
 */
export class Orchestrator {
    private globalContext: GlobalContext;
    private sessionContext: SessionContext;
    private activeConversations: Map<string, ConversationContext> = new Map();

    private stepExecutor: StepExecutor;
    private agentRegistry: Map<InputAnalysisResult['intent'], (executor: StepExecutor) => IAgent>; // Registry for agents

    constructor(globalContext: GlobalContext, sessionContext: SessionContext) {
        this.globalContext = globalContext;
        this.sessionContext = sessionContext;
        const registry = ExecutorFactory.createExecutorRegistry();
        this.stepExecutor = new StepExecutor(registry);

        // Initialize the agent registry
        this.agentRegistry = new Map();
        this.registerAgents();

        console.log('[Orchestrator] Initialized (Router Mode)');
    }

    private registerAgents(): void {
        // Register agents by the intent they handle
        this.agentRegistry.set('conversation', (executor) => new ConversationAgent(executor));
        // Pass MAX_AGENT_ITERATIONS to agents that use an internal loop
        this.agentRegistry.set('fixCode', (executor) => new FixCodeAgent(executor, MAX_AGENT_ITERATIONS));
        this.agentRegistry.set('explainCode', (executor) => new ExplainCodeAgent(executor));
        this.agentRegistry.set('search', (executor) => new SearchAgent(executor));
        this.agentRegistry.set('console', (executor) => new ConsoleAgent(executor));
        this.agentRegistry.set('editing', (executor) => new EditingAgent(executor));
        this.agentRegistry.set('examination', (executor) => new ExaminationAgent(executor));
        this.agentRegistry.set('projectManagement', (executor) => new ProjectManagementAgent(executor)); // Register ProjectManagementAgent


        // TODO: Register other agents here if needed (e.g., 'resultEvaluator')
        // this.agentRegistry.set('resultEvaluator', (executor) => new ResultEvaluatorAgent(executor));


        // Register the fallback agent for 'unknown' intent
        this.agentRegistry.set('unknown', (executor) => new UnknownIntentAgent(executor, MAX_AGENT_ITERATIONS));


        console.log('[Orchestrator] Registered agents for intents:', Array.from(this.agentRegistry.keys()));
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
     * Processes a user message by analyzing intent and delegating to the appropriate agent.
     * Receives the FlowContext for the current turn.
     */
    public async processUserMessage(flowContext: FlowContext): Promise<string | any> {
        const chatId = flowContext.getChatId();
        const userMessageText = flowContext.getValue<string>('userMessage') || '';

        console.log(`[Orchestrator:${chatId}] Starting processing for: "${userMessageText.substring(0, 50)}..."`);

        let finalResponse: string | any = "Sorry, I couldn't understand your request.";

        // --- Step 1: Initial Input Analysis ---
        // This step remains in the Orchestrator as it determines which agent to route to.
        if (!flowContext.getValue('analysisResult')) {
             const analyzeStep: ExecutionStep = {
                 name: 'analyzeUserInput',
                 type: 'prompt',
                 execute: 'inputAnalyzer',
                 params: {}, // inputAnalyzer prompt uses the full context
                 storeAs: 'analysisResult'
             };
             console.log(`[Orchestrator:${chatId}] Running initial analysis...`);
             const analysisResultStep = await this.stepExecutor.runStep(analyzeStep, flowContext);

             // Log analysis step to history
             const currentHistory = flowContext.getValue<Array<any>>('planningHistory') || [];
             currentHistory.push({
                 action: 'prompt:inputAnalyzer',
                 stepName: analyzeStep.name,
                 result: analysisResultStep.result,
                 error: analysisResultStep.error
             });
             flowContext.setValue('planningHistory', currentHistory);


             if (!analysisResultStep.success || !analysisResultStep.result) {
                 console.warn(`[Orchestrator:${chatId}] Initial analysis failed:`, analysisResultStep.error?.message);
                 // Set a default 'unknown' intent if analysis fails completely
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
        // Use 'unknown' as a fallback if analysisResult or intent is missing/malformed
        const intent = initialAnalysis?.intent || 'unknown';
        console.log(`[Orchestrator:${chatId}] Analysis Intent: ${intent}, Objective: ${initialAnalysis?.objective}`);

        // --- Step 2: Route to Agent ---
        const agentFactory = this.agentRegistry.get(intent);

        if (!agentFactory) {
             console.error(`[Orchestrator:${chatId}] No agent registered for intent: '${intent}'`);
             finalResponse = `Sorry, I don't know how to handle requests related to "${intent}".`;
              const currentHistory = flowContext.getValue<Array<any>>('planningHistory') || [];
              currentHistory.push({
                  action: 'routingError',
                  stepName: 'agentRouting',
                  result: { intent },
                  error: new Error(`No agent found for intent: ${intent}`)
              });
              flowContext.setValue('planningHistory', currentHistory);

        } else {
            try {
                // Create the agent instance and execute it
                const agent = agentFactory(this.stepExecutor);
                console.log(`[Orchestrator:${chatId}] Routing to agent: ${agent.constructor.name} for intent '${intent}'`);
                finalResponse = await agent.execute(flowContext);
                console.log(`[Orchestrator:${chatId}] Agent ${agent.constructor.name} finished execution.`);

            } catch (agentError: any) {
                console.error(`[Orchestrator:${chatId}] Error during agent execution (${intent} agent):`, agentError);
                finalResponse = `Sorry, an error occurred while trying to fulfill your request (${intent} task). Error: ${agentError.message}`;
                 const currentHistory = flowContext.getValue<Array<any>>('planningHistory') || [];
                 currentHistory.push({
                     action: 'agentExecutionError',
                     stepName: `${intent}Agent`,
                     result: null,
                     error: agentError
                 });
                 flowContext.setValue('planningHistory', currentHistory);
            }
        }

        console.log(`[Orchestrator:${chatId}] Processing finished.`);

        // Dispose the FlowContext after the turn is complete
        flowContext.dispose();

        return finalResponse;
    }

    dispose(): void {
        console.log('[Orchestrator] Disposing.');
        this.activeConversations.forEach(context => context.dispose());
        this.activeConversations.clear();
        // Agents are not stateful beyond a single turn, so no need to dispose them here.
    }
}