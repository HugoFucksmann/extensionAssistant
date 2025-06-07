// src/core/langgraph/nodes/ValidateNode.ts
import { IValidationService } from "../services/interfaces/DependencyInterfaces";
import { GraphPhase, SimplifiedOptimizedGraphState } from "../state/GraphState";
import { BaseNode, NodeExecutionContext } from "./BaseNode";
import { AIMessage } from "@langchain/core/messages";

export class ValidateNode extends BaseNode {
    private validationService: IValidationService;

    constructor(dependencies: any, observability: any) {
        super(GraphPhase.VALIDATION, dependencies, observability);
        this.validationService = dependencies.get('IValidationService');
    }

    protected async executeCore(
        state: SimplifiedOptimizedGraphState,
        context: NodeExecutionContext
    ): Promise<Partial<SimplifiedOptimizedGraphState>> {

        if (!state.requiresValidation) {
            // No hay nada que validar, pasar al siguiente estado.
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
            requiresValidation: false, // Resetear el flag después de la validación
            error: validationResult.error // Propagar el error si la corrección no es posible
        };
    }
}