// src/core/langgraph/nodes/ValidateNode.ts
import { IValidationService } from "../services/interfaces/DependencyInterfaces";
import { GraphPhase, SimplifiedOptimizedGraphState } from "../state/GraphState";
import { BaseNode, } from "./BaseNode";
import { AIMessage } from "@langchain/core/messages";

export class ValidateNode extends BaseNode {
    private validationService: IValidationService;

    constructor(dependencies: any, observability: any) {
        super(GraphPhase.VALIDATION, dependencies, observability);
        this.validationService = dependencies.get('IValidationService');
    }

    protected async executeCore(
        state: SimplifiedOptimizedGraphState,

    ): Promise<Partial<SimplifiedOptimizedGraphState>> {

        if (!state.requiresValidation) {

            return { requiresValidation: false };
        }

        const validationResult = await this.validationService.performDeepValidation(state);

        const messages = [...state.messages];
        if (validationResult.error) {
            messages.push(new AIMessage(`Validation failed: ${validationResult.error}. Attempting to correct.`));
        } else {
            messages.push(new AIMessage(`Validation successful. Proceeding with corrected plan.`));
        }

        return {
            ...validationResult.stateUpdates,
            messages,
            requiresValidation: false,
            error: validationResult.error
        };
    }
}