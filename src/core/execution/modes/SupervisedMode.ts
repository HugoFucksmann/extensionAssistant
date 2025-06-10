// src/core/execution/modes/SupervisedMode.ts
import { BaseMode, ModeContext } from './BaseMode';
import { ExecutionResult, ExecutionMode } from '../ExecutionEngine';
import { EventType, UserInputReceivedPayload, WindsurfEvent } from '../../../features/events/eventTypes';
import { generateUniqueId } from '@shared/utils/generateIds';

interface PlanStep {
    id: string;
    description: string;
    tool: string;
    parameters: any;
    status: 'pending' | 'completed' | 'failed';
}

interface ValidatedPlan {
    id: string;
    steps: PlanStep[];
}

export class SupervisedMode extends BaseMode {
    private currentPlan: ValidatedPlan | null = null;

    constructor(
        mode: ExecutionMode,
        context: ModeContext,
        config?: Partial<any>
    ) {
        // SupervisedMode needs access to the dispatcher for user interaction
        super(mode, { ...context, dispatcher: (context as any).dispatcher }, config);
    }

    async execute(query: string): Promise<ExecutionResult> {
        this.context.stateManager.setState({
            currentQuery: query,
            executionStatus: 'planning',
            step: 0,
            errorCount: 0,
            progress: 0,
        });

        try {
            // Phase 1: Create a plan and get user validation
            const initialPlan = await this.createInitialPlan(query);
            const userResponse = await this.requestUserValidation(initialPlan);

            if (!userResponse.approved) {
                return {
                    success: false,
                    error: 'Plan rejected by user.',
                    executionTime: this.calculateExecutionTime(),
                    data: { response: 'Execution cancelled by user.' }
                };
            }

            this.currentPlan = { id: generateUniqueId(), steps: initialPlan };
            this.context.stateManager.setState({
                executionStatus: 'executing',
                planText: JSON.stringify(this.currentPlan, null, 2),
            });

            // Phase 2: Execute the validated plan
            for (const step of this.currentPlan.steps) {
                if (this.context.stateManager.getState().executionStatus !== 'executing') {
                    break; // Execution was paused or stopped
                }

                try {
                    await this.executeStep(step);
                    step.status = 'completed';
                    this.updateProgress(
                        this.currentPlan.steps.filter(s => s.status === 'completed').length,
                        this.currentPlan.steps.length
                    );
                } catch (error) {
                    step.status = 'failed';
                    await this.handleError(error as Error);

                    // Escalate on error
                    const escalationResponse = await this.escalateToUser(
                        `Step "${step.description}" failed.`,
                        ['Retry', 'Skip', 'Abort']
                    );

                    if (escalationResponse.choice === 'Abort') {
                        throw new Error('Execution aborted by user after step failure.');
                    }
                    if (escalationResponse.choice === 'Skip') {
                        continue; // Move to the next step
                    }
                    // Implicitly retry if not aborted or skipped
                }
            }

            return this.generateFinalResponse();

        } catch (error) {
            await this.handleError(error as Error);
            return this.generateFinalResponse();
        }
    }

    private async createInitialPlan(query: string): Promise<PlanStep[]> {
        // Mock plan generation. In a real scenario, this would call an LLM.
        return [
            { id: generateUniqueId(), description: 'Analyze user request', tool: 'analysis', parameters: { query }, status: 'pending' },
            { id: generateUniqueId(), description: 'Search for relevant files', tool: 'search', parameters: { query }, status: 'pending' },
            { id: generateUniqueId(), description: 'Generate proposed solution', tool: 'code_generation', parameters: { query }, status: 'pending' },
            { id: generateUniqueId(), description: 'Finalize and present response', tool: 'response', parameters: { query }, status: 'pending' },
        ];
    }

    private async executeStep(step: PlanStep): Promise<void> {
        // Mock tool execution
        console.log(`[SupervisedMode] Executing step: ${step.description}`);
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate work
        if (Math.random() < 0.1) { // Simulate a random failure
            throw new Error(`Simulated failure for tool: ${step.tool}`);
        }
    }

    private async requestUserValidation(plan: PlanStep[]): Promise<{ approved: boolean }> {
        const dispatcher = (this.context as any).dispatcher;
        if (!dispatcher) throw new Error('Event dispatcher is required for user interaction in SupervisedMode.');

        const operationId = generateUniqueId();
        const planDescription = plan.map((step, i) => `${i + 1}. ${step.description}`).join('\n');

        return new Promise((resolve) => {
            const sub = dispatcher.once(EventType.USER_INPUT_RECEIVED, (event: WindsurfEvent) => {
                const payload = event.payload as UserInputReceivedPayload;
                if (payload.operationId === operationId) {
                    resolve({ approved: !payload.wasCancelled });
                }
            });

            dispatcher.dispatch(EventType.USER_INTERACTION_REQUIRED, {
                operationId,
                interactionType: 'confirmation',
                promptMessage: `I have a plan to address your request:\n\n${planDescription}\n\nDo you approve this plan?`,
                title: 'Plan Approval Required',
                confirmButtonText: 'Approve',
                cancelButtonText: 'Reject',
            });
        });
    }

    private async escalateToUser(reason: string, choices: string[]): Promise<{ choice: string }> {
        const dispatcher = (this.context as any).dispatcher;
        if (!dispatcher) throw new Error('Event dispatcher is required for user interaction in SupervisedMode.');

        const operationId = generateUniqueId();

        return new Promise((resolve) => {
            const sub = dispatcher.once(EventType.USER_INPUT_RECEIVED, (event: WindsurfEvent) => {
                const payload = event.payload as UserInputReceivedPayload;
                if (payload.operationId === operationId) {
                    resolve({ choice: payload.value || 'Abort' });
                }
            });

            dispatcher.dispatch(EventType.USER_INTERACTION_REQUIRED, {
                operationId,
                interactionType: 'choiceSelection',
                promptMessage: `Execution requires your input: ${reason}`,
                title: 'User Input Required',
                options: choices.map(c => ({ label: c, value: c })),
            });
        });
    }

    private calculateExecutionTime(): number {
        const state = this.context.stateManager.getState();
        return Date.now() - state.createdAt.getTime();
    }

    protected isComplete(): boolean {
        if (!this.currentPlan) return true;
        return this.currentPlan.steps.every(s => s.status === 'completed' || s.status === 'failed');
    }
}