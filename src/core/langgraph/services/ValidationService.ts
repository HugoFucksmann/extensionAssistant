// src/core/langgraph/services/ValidationService.ts
import { z } from "zod";
import { createAutoCorrectStep } from "../../../shared/utils/aiResponseParser";
import { DeepValidationResult, IModelManager, IPromptProvider, IValidationService } from "./interfaces/DependencyInterfaces";
import { SimplifiedOptimizedGraphState } from "../state/GraphState";

// Esquema para la salida del LLM de validación
const validationOutputSchema = z.object({
    isValid: z.boolean().describe("¿El resultado de la herramienta parece correcto y útil para el siguiente paso?"),
    reasoning: z.string().describe("Breve explicación de por qué el resultado es válido o no."),
    correctionSuggestion: z.string().optional().describe("Si no es válido, una sugerencia de cómo corregir el plan o la siguiente acción."),
    updatedPlan: z.array(z.string()).optional().describe("Un nuevo plan si el original necesita ser modificado drásticamente.")
});

export class ValidationService implements IValidationService {
    constructor(
        private modelManager: IModelManager,
        private promptProvider: IPromptProvider
    ) { }

    async performDeepValidation(state: SimplifiedOptimizedGraphState): Promise<DeepValidationResult> {
        // La validación profunda se activa cuando hay un error o se solicita explícitamente.
        const lastToolExecution = state.toolsUsed[state.toolsUsed.length - 1];
        const contextForValidation = `
            User Query: ${state.userInput}
            Current Plan: ${state.currentPlan.join(" -> ")}
            Last Tool Executed: ${lastToolExecution?.toolName || 'None'}
            Tool Input: ${JSON.stringify(lastToolExecution?.input)}
            Tool Output/Error: ${lastToolExecution?.error || JSON.stringify(lastToolExecution?.output)}
            Working Memory: ${state.workingMemory}
        `;

        const model = this.modelManager.getActiveModel();
        const prompt = this.promptProvider.getValidationPrompt();
        const parseStep = createAutoCorrectStep(validationOutputSchema, model, { maxAttempts: 2 });
        const chain = prompt.pipe(model).pipe(parseStep);

        try {
            const validation = await chain.invoke({
                errors: state.error || "No explicit error, but validation was requested.",
                context: contextForValidation
            });

            if (validation.isValid) {
                return { passed: true, stateUpdates: {} };
            }

            // Si no es válido, preparamos las actualizaciones sugeridas
            const stateUpdates: Partial<SimplifiedOptimizedGraphState> = {};
            if (validation.updatedPlan) {
                stateUpdates.currentPlan = validation.updatedPlan;
                stateUpdates.currentTask = validation.updatedPlan[0]; // Reiniciar la tarea al inicio del nuevo plan
            }
            // El `reasoning` del siguiente paso tomará la `correctionSuggestion` como input.
            stateUpdates.workingMemory = `${state.workingMemory}\n\nValidation Feedback: ${validation.correctionSuggestion}`;

            return {
                passed: false,
                stateUpdates,
                error: `Validation failed: ${validation.reasoning}`
            };

        } catch (e: any) {
            return {
                passed: false,
                stateUpdates: {},
                error: `Failed to generate validation correction: ${e.message}`
            };
        }
    }
}