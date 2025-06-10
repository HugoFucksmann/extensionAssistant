// src/core/execution/modes/PlannerMode.ts
import { BaseMode } from './BaseMode';
import { ExecutionResult } from '../ExecutionEngine';
import { MemoryEntry } from '../../../features/memory/MemoryManager';
import { generateUniqueId } from '@shared/utils/generateIds';
import { ExecutionState } from '../ExecutionState'; // Importar ExecutionState

export interface PlanStep {
    id: string;
    order: number;
    action: string;
    tool: string;
    parameters: any;
    description: string;
    estimatedTime: number;
    dependencies: string[];
    status: 'pending' | 'executing' | 'completed' | 'failed' | 'skipped';
    result?: any;
    error?: string;
    checkpointId?: string;
}

export interface Plan {
    id: string;
    version: number;
    description: string;
    steps: PlanStep[];
    estimatedTotalTime: number;
    createdAt: Date;
    updatedAt: Date;
    status: 'draft' | 'validated' | 'executing' | 'completed' | 'failed';
}

export interface PlanAnalysis {
    deviationScore: number;
    invalidatedStepsCount: number;
    resourcesUnavailable: boolean;
    alternatives: PlanStep[];
    recommendation: 'continue' | 'replan' | 'abort';
    reasoning: string;
    confidence: number;
}

interface PlannerPromptInput {
    query: string;
    memory: MemoryEntry[];
    currentPlan?: Plan;
    progress: number;
    lastResult?: any;
    deviationAnalysis?: {
        expectedVsActual: string;
        impactedSteps: number[];
        availableResources: string[];
    };
    step: number;
    errorCount: number;
}

interface PlannerResponse {
    planUpdate?: {
        type: 'create' | 'modify' | 'continue';
        steps: PlanStep[];
        estimatedTime: number;
        checkpoints: number[];
    };
    nextAction: {
        tool: string;
        parameters: any;
        stepIndex: number;
    };
    replanRequired: boolean;
    reasoning: string;
    confidence: number;
}

export class PlannerMode extends BaseMode {
    private currentPlan: Plan | null = null;
    private executionHistory: Map<string, any> = new Map();

    async execute(query: string): Promise<ExecutionResult> {
        // CAMBIO: Obtener el estado una vez al inicio del bucle para pasarlo.
        let state = this.context.stateManager.getState();

        // Initialize execution
        this.context.stateManager.setState({
            currentQuery: query,
            executionStatus: 'planning',
            step: 0,
            errorCount: 0,
            progress: 0
        });
        state = this.context.stateManager.getState(); // Refrescar estado después de la inicialización

        try {
            // Phase 1: Create detailed plan
            this.currentPlan = await this.createDetailedPlan(query);
            await this.storePlan(this.currentPlan);

            this.context.stateManager.setState({
                executionStatus: 'executing',
                planText: this.currentPlan.description
            });
            state = this.context.stateManager.getState(); // Refrescar estado

            // Phase 2: Execute plan with monitoring and replanning
            while (!this.isComplete() && state.errorCount < this.config.maxErrors) {
                const memory = await this.getRelevantMemory();
                const analysis = await this.analyzePlanAdherence(memory);

                // Check if replanning is needed
                if (this.shouldReplan(analysis, state)) {
                    await this.createCheckpointIfNeeded(`pre_replan_step_${state.step}`);
                    this.currentPlan = await this.replan(analysis.alternatives);
                    await this.storePlan(this.currentPlan);
                }

                // Execute next step
                const stepResult = await this.executeNextStep(analysis);

                // Update progress
                this.updateStepProgress(stepResult);

                if (stepResult.error) {
                    await this.handleError(new Error(stepResult.error));
                } else {
                    await this.handleSuccess(stepResult, `Step ${state.step} completed`);
                }

                // Refrescar el estado para la siguiente iteración del bucle
                state = this.context.stateManager.getState();
                this.context.stateManager.setState({ step: state.step + 1 });
                state = this.context.stateManager.getState();


                // Create checkpoint at intervals
                await this.createCheckpointIfNeeded(`step_${state.step}`);

                if (!this.shouldContinue(stepResult)) {
                    break;
                }
            }

            return this.generateFinalResponse();

        } catch (error) {
            await this.handleError(error as Error);
            return this.generateFinalResponse();
        }
    }

    private async createDetailedPlan(query: string): Promise<Plan> {
        const memory = await this.getRelevantMemory();
        const plannerInput: PlannerPromptInput = {
            query,
            memory,
            progress: 0,
            step: 0,
            errorCount: 0
        };

        const response = await this.generatePlannerResponse(plannerInput);

        if (!response.planUpdate || response.planUpdate.type !== 'create') {
            throw new Error('Failed to create initial plan');
        }

        const plan: Plan = {
            id: generateUniqueId(),
            version: 1,
            description: `Execution plan for: ${query}`,
            steps: response.planUpdate.steps,
            estimatedTotalTime: response.planUpdate.estimatedTime,
            createdAt: new Date(),
            updatedAt: new Date(),
            status: 'draft'
        };

        // Store plan creation in memory
        await this.storeMemoryEntry(
            'plan',
            `Created plan with ${plan.steps.length} steps: ${plan.description}`,
            0.9,
            ['plan_creation', `plan_${plan.id}`]
        );

        return plan;
    }

    private async analyzePlanAdherence(memory: MemoryEntry[]): Promise<PlanAnalysis> {
        if (!this.currentPlan) {
            throw new Error('No current plan to analyze');
        }

        const state = this.context.stateManager.getState();
        const currentStep = this.getCurrentStep();

        if (!currentStep) {
            return {
                deviationScore: 0,
                invalidatedStepsCount: 0,
                resourcesUnavailable: false,
                alternatives: [],
                recommendation: 'continue',
                reasoning: 'No current step to analyze',
                confidence: 0.5
            };
        }

        // Calculate deviation based on expected vs actual results
        const deviationScore = this.calculateDeviationScore(currentStep, state.lastResult);

        // Check for invalidated steps
        const invalidatedSteps = this.findInvalidatedSteps(currentStep, state.lastResult);

        // Check resource availability
        const resourcesAvailable = await this.checkResourceAvailability();

        // Generate alternatives if needed
        const alternatives = deviationScore > 0.3 ?
            await this.generateAlternativeSteps(currentStep, memory) : [];

        const recommendation = this.determineRecommendation(
            deviationScore,
            invalidatedSteps.length,
            resourcesAvailable
        );

        return {
            deviationScore,
            invalidatedStepsCount: invalidatedSteps.length,
            resourcesUnavailable: !resourcesAvailable,
            alternatives,
            recommendation,
            reasoning: this.generateAnalysisReasoning(deviationScore, invalidatedSteps.length),
            confidence: this.calculateAnalysisConfidence(deviationScore, memory)
        };
    }

    private shouldReplan(analysis: PlanAnalysis, state: ExecutionState): boolean {
        return analysis.deviationScore > 0.4 ||
            (state.errorCount || 0) >= 3 ||
            analysis.resourcesUnavailable ||
            analysis.invalidatedStepsCount > 0 ||
            analysis.recommendation === 'replan';
    }

    private async replan(alternatives: PlanStep[]): Promise<Plan> {
        if (!this.currentPlan) {
            throw new Error('Cannot replan without current plan');
        }

        const memory = await this.getRelevantMemory();
        const currentStep = this.getCurrentStep();

        // CAMBIO CLAVE: Obtener el estado más reciente directamente del stateManager.
        const state = this.context.stateManager.getState();

        const plannerInput: PlannerPromptInput = {
            query: state.currentQuery || '',
            memory,
            currentPlan: this.currentPlan,
            // CAMBIO CLAVE: Acceder a la propiedad 'progress' del objeto de estado.
            progress: state.progress || 0,
            lastResult: state.lastResult,
            deviationAnalysis: {
                expectedVsActual: this.generateExpectedVsActual(currentStep, state.lastResult),
                impactedSteps: this.findImpactedSteps(currentStep),
                availableResources: await this.getAvailableResources()
            },
            step: state.step,
            errorCount: state.errorCount
        };

        const response = await this.generatePlannerResponse(plannerInput);

        if (!response.planUpdate || response.planUpdate.type === 'continue') {
            return this.currentPlan;
        }

        // Create new plan version
        const newPlan: Plan = {
            ...this.currentPlan,
            id: generateUniqueId(),
            version: this.currentPlan.version + 1,
            steps: response.planUpdate.steps,
            estimatedTotalTime: response.planUpdate.estimatedTime,
            updatedAt: new Date(),
            status: 'validated'
        };

        // Store replanning in memory
        await this.storeMemoryEntry(
            'plan',
            `Replanned: ${response.reasoning}. New plan has ${newPlan.steps.length} steps`,
            0.9,
            ['replanning', `plan_${newPlan.id}`, 'adaptation']
        );

        return newPlan;
    }

    private async executeNextStep(analysis: PlanAnalysis): Promise<any> {
        if (!this.currentPlan) {
            throw new Error('No plan to execute');
        }

        const currentStep = this.getCurrentStep();
        if (!currentStep) {
            return { success: true, completed: true };
        }

        currentStep.status = 'executing';

        try {
            const result = await this.executeStepSafely(currentStep);

            currentStep.status = result.success ? 'completed' : 'failed';
            currentStep.result = result;

            if (result.error) {
                currentStep.error = result.error;
            }

            // Store step execution in history
            this.executionHistory.set(currentStep.id, {
                step: currentStep,
                result,
                timestamp: Date.now()
            });

            // Actualizar el estado con el último resultado
            this.context.stateManager.setState({ lastResult: result });

            return result;

        } catch (error) {
            currentStep.status = 'failed';
            currentStep.error = (error as Error).message;

            const result = {
                success: false,
                error: (error as Error).message,
                step: currentStep
            };

            // Actualizar el estado con el último resultado (de error)
            this.context.stateManager.setState({ lastResult: result });

            return result;
        }
    }

    private async executeStepSafely(step: PlanStep): Promise<any> {
        try {
            // Store step execution in memory
            await this.storeMemoryEntry(
                'plan',
                `Executing step ${step.order}: ${step.description}`,
                0.7,
                [`step_${step.id}`, step.tool, 'execution']
            );

            const result = await this.executeToolForStep(step);

            if (result.success) {
                await this.storeMemoryEntry(
                    'success',
                    `Step ${step.order} completed successfully: ${step.description}`,
                    0.8,
                    [`step_${step.id}`, step.tool, 'success_pattern']
                );
            }

            return result;

        } catch (error) {
            await this.storeMemoryEntry(
                'error',
                `Step ${step.order} failed: ${(error as Error).message}`,
                0.9,
                [`step_${step.id}`, step.tool, 'error_pattern']
            );
            throw error;
        }
    }

    private async executeToolForStep(step: PlanStep): Promise<any> {
        // Mock tool execution - replace with actual tool integration
        switch (step.tool) {
            case 'file_operations':
                return {
                    success: true,
                    result: `File operation completed: ${step.action}`,
                    data: { files: [`${step.action}_result.txt`] }
                };

            case 'search':
                return {
                    success: true,
                    result: `Search completed for step: ${step.description}`,
                    data: { matches: ['relevant_file1.ts', 'relevant_file2.js'] }
                };

            case 'analysis':
                return {
                    success: true,
                    result: `Analysis completed: ${step.description}`,
                    data: { analysis: 'Analysis results here...' }
                };

            case 'code_generation':
                return {
                    success: true,
                    result: `Code generated: ${step.description}`,
                    data: { code: '// Generated code here' }
                };

            default:
                throw new Error(`Unknown tool in step: ${step.tool}`);
        }
    }

    private getCurrentStep(): PlanStep | null {
        if (!this.currentPlan) return null;

        return this.currentPlan.steps.find(step =>
            step.status === 'pending'
        ) || null;
    }

    private updateStepProgress(stepResult: any): void {
        if (!this.currentPlan) return;

        const completedSteps = this.currentPlan.steps.filter(s => s.status === 'completed').length;
        const totalSteps = this.currentPlan.steps.length;

        this.updateProgress(completedSteps, totalSteps);
    }

    private calculateDeviationScore(step: PlanStep, actualResult: any): number {
        if (!actualResult) return 0;

        // Simple deviation calculation - in real implementation, this would be more sophisticated
        if (actualResult.success) {
            return 0.1; // Minor deviation for successful steps
        } else {
            return 0.8; // High deviation for failed steps
        }
    }

    private findInvalidatedSteps(currentStep: PlanStep, result: any): PlanStep[] {
        if (!this.currentPlan || !result || result.success) return [];

        // Find steps that depend on the current step
        return this.currentPlan.steps.filter(step =>
            step.dependencies.includes(currentStep.id) && step.status === 'pending'
        );
    }

    private async checkResourceAvailability(): Promise<boolean> {
        // Mock resource check - replace with actual resource checking
        return true;
    }

    private async generateAlternativeSteps(currentStep: PlanStep, memory: MemoryEntry[]): Promise<PlanStep[]> {
        // Look for similar successful patterns in memory
        const successPatterns = memory.filter(m =>
            m.type === 'success' && m.content.includes(currentStep.tool)
        );

        if (successPatterns.length === 0) return [];

        // Generate alternative based on successful patterns
        return [{
            id: generateUniqueId(),
            order: currentStep.order,
            action: `alternative_${currentStep.action}`,
            tool: currentStep.tool,
            parameters: { ...currentStep.parameters, alternative: true },
            description: `Alternative approach for: ${currentStep.description}`,
            estimatedTime: currentStep.estimatedTime * 1.2,
            dependencies: currentStep.dependencies,
            status: 'pending'
        }];
    }

    private determineRecommendation(
        deviationScore: number,
        invalidatedCount: number,
        resourcesAvailable: boolean
    ): 'continue' | 'replan' | 'abort' {
        if (!resourcesAvailable) return 'abort';
        if (deviationScore > 0.6 || invalidatedCount > 2) return 'replan';
        return 'continue';
    }

    private generateAnalysisReasoning(deviationScore: number, invalidatedCount: number): string {
        if (deviationScore > 0.6) {
            return `High deviation detected (${deviationScore.toFixed(2)}), replanning recommended`;
        }
        if (invalidatedCount > 0) {
            return `${invalidatedCount} steps invalidated, plan adjustment needed`;
        }
        return 'Plan execution proceeding as expected';
    }

    private calculateAnalysisConfidence(deviationScore: number, memory: MemoryEntry[]): number {
        const baseConfidence = 0.7;
        const memoryBoost = Math.min(memory.length * 0.05, 0.2);
        const deviationPenalty = deviationScore * 0.3;

        return Math.max(0.1, Math.min(1.0, baseConfidence + memoryBoost - deviationPenalty));
    }

    private generateExpectedVsActual(step: PlanStep | null, result: any): string {
        if (!step) return 'No current step';

        return `Expected: ${step.description}. Actual: ${result?.result || 'No result'}`;
    }

    private findImpactedSteps(currentStep: PlanStep | null): number[] {
        if (!this.currentPlan || !currentStep) return [];

        return this.currentPlan.steps
            .filter(s => s.dependencies.includes(currentStep.id))
            .map(s => s.order);
    }

    private async getAvailableResources(): Promise<string[]> {
        // Mock resource listing - replace with actual resource detection
        return ['file_system', 'network', 'compute'];
    }

    private async generatePlannerResponse(input: PlannerPromptInput): Promise<PlannerResponse> {
        // Mock AI response generation - replace with actual AI integration
        const { query, memory, currentPlan, progress } = input;

        if (!currentPlan) {
            // Create new plan
            const steps = this.generateStepsFromQuery(query);
            return {
                planUpdate: {
                    type: 'create',
                    steps,
                    estimatedTime: steps.reduce((sum, s) => sum + s.estimatedTime, 0),
                    checkpoints: steps.filter((_, i) => i % 3 === 0).map(s => s.order)
                },
                nextAction: {
                    tool: steps[0]?.tool || 'analysis',
                    parameters: steps[0]?.parameters || {},
                    stepIndex: 0
                },
                replanRequired: false,
                reasoning: 'Initial plan created based on query analysis',
                confidence: 0.8
            };
        } else {
            // Continue or modify existing plan
            const nextStep = this.getCurrentStep();
            return {
                nextAction: {
                    tool: nextStep?.tool || 'completion',
                    parameters: nextStep?.parameters || {},
                    stepIndex: nextStep?.order || 0
                },
                replanRequired: false,
                reasoning: 'Continuing with current plan',
                confidence: 0.7
            };
        }
    }

    private generateStepsFromQuery(query: string): PlanStep[] {
        // Simple step generation based on query content
        const steps: PlanStep[] = [];
        let order = 1;

        if (query.toLowerCase().includes('analyze') || query.toLowerCase().includes('understand')) {
            steps.push({
                id: generateUniqueId(),
                order: order++,
                action: 'analyze_requirements',
                tool: 'analysis',
                parameters: { query, type: 'requirements' },
                description: 'Analyze requirements and understand the task',
                estimatedTime: 30,
                dependencies: [],
                status: 'pending'
            });
        }

        if (query.toLowerCase().includes('file') || query.toLowerCase().includes('create')) {
            steps.push({
                id: generateUniqueId(),
                order: order++,
                action: 'file_operations',
                tool: 'file_operations',
                parameters: { query, action: 'create' },
                description: 'Handle file operations as requested',
                estimatedTime: 60,
                dependencies: steps.length > 0 ? [steps[steps.length - 1].id] : [],
                status: 'pending'
            });
        }

        if (query.toLowerCase().includes('search') || query.toLowerCase().includes('find')) {
            steps.push({
                id: generateUniqueId(),
                order: order++,
                action: 'search_and_find',
                tool: 'search',
                parameters: { query, scope: 'comprehensive' },
                description: 'Search and find relevant information',
                estimatedTime: 45,
                dependencies: [],
                status: 'pending'
            });
        }

        // Always add a completion step
        steps.push({
            id: generateUniqueId(),
            order: order++,
            action: 'finalize_results',
            tool: 'completion',
            parameters: { query },
            description: 'Finalize and present results',
            estimatedTime: 15,
            dependencies: steps.map(s => s.id),
            status: 'pending'
        });

        return steps;
    }

    private async storePlan(plan: Plan): Promise<void> {
        await this.storeMemoryEntry(
            'plan',
            JSON.stringify({
                planId: plan.id,
                version: plan.version,
                description: plan.description,
                totalSteps: plan.steps.length,
                estimatedTime: plan.estimatedTotalTime
            }),
            0.9,
            [`plan_${plan.id}`, 'plan_storage', `version_${plan.version}`]
        );
    }

    protected isComplete(): boolean {
        if (!this.currentPlan) return false;

        const allStepsCompleted = this.currentPlan.steps.every(step =>
            step.status === 'completed' || step.status === 'skipped'
        );

        return allStepsCompleted || super.isComplete();
    }

    /**
     * Get detailed execution metrics for the planner mode
     */
    getExecutionMetrics(): any {
        if (!this.currentPlan) return null;

        const completedSteps = this.currentPlan.steps.filter(s => s.status === 'completed').length;
        const failedSteps = this.currentPlan.steps.filter(s => s.status === 'failed').length;
        const totalSteps = this.currentPlan.steps.length;

        return {
            planId: this.currentPlan.id,
            planVersion: this.currentPlan.version,
            totalSteps,
            completedSteps,
            failedSteps,
            successRate: totalSteps > 0 ? completedSteps / totalSteps : 0,
            estimatedTime: this.currentPlan.estimatedTotalTime,
            actualTime: this.calculateActualExecutionTime(),
            replanCount: this.currentPlan.version - 1
        };
    }

    private calculateActualExecutionTime(): number {
        const startTime = this.context.stateManager.getState().createdAt.getTime();
        return Date.now() - startTime;
    }
}