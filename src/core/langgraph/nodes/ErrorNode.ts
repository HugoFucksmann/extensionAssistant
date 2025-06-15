// src/core/langgraph/nodes/ErrorNode.ts
import { AIMessage } from "@langchain/core/messages";
import { GraphPhase, SimplifiedOptimizedGraphState } from "../state/GraphState";
import { BaseNode, NodeExecutionContext } from "./BaseNode";
import { IErrorCorrectionService, IContextBuilderService } from "../services/interfaces/DependencyInterfaces"; // <-- MODIFICAR

export class ErrorNode extends BaseNode {
    private errorCorrectionService: IErrorCorrectionService; // <-- AÑADIR
    private contextBuilder: IContextBuilderService; // <-- AÑADIR

    constructor(dependencies: any, observability: any) {
        super(GraphPhase.ERROR_HANDLER, dependencies, observability);
        // MODIFICAR: Inyectar los nuevos servicios
        this.errorCorrectionService = dependencies.get('IErrorCorrectionService');
        this.contextBuilder = dependencies.get('IContextBuilderService');
    }

    protected async executeCore(
        state: SimplifiedOptimizedGraphState,
        context: NodeExecutionContext
    ): Promise<Partial<SimplifiedOptimizedGraphState>> {
        console.log(`[ErrorNode] Analyzing error: ${state.error}`);

        // 1. Construir un contexto específico para el análisis del error.
        const errorContext = this.contextBuilder.forError(state);

        // 2. Llamar al servicio de corrección para que el LLM decida qué hacer.
        const decision = await this.errorCorrectionService.analyzeError(errorContext);

        console.log('[ErrorNode] Self-correction decision:', decision);

        // 3. Crear un mensaje de sistema para registrar el pensamiento y la decisión.
        const systemMessage = new AIMessage({
            content: `System Thought (Error Correction): ${decision.thought}\nDecision: ${decision.decision}.`
        });

        const updatedState: Partial<SimplifiedOptimizedGraphState> = {
            messages: [...state.messages, systemMessage],
            // CRUCIAL: Limpiamos el error para que el grafo no entre en un bucle infinito
            // hacia el ErrorNode. El error ya ha sido manejado.
            error: undefined,
        };

        // 4. Modificar el estado del grafo según la decisión del LLM.
        switch (decision.decision) {
            case 'modify_plan':
                // Reemplazamos el plan antiguo por el nuevo propuesto por el LLM.
                updatedState.currentPlan = decision.newPlan;
                updatedState.currentTask = undefined; // Forzar al Planner a elegir una nueva tarea del nuevo plan.
                console.log('[ErrorNode] Modifying plan. New plan:', decision.newPlan);
                break;

            case 'retry':
                // No hacemos nada más. Al limpiar el error, el flujo volverá al Planner,
                // que re-evaluará la misma tarea. El Planner ya tiene lógica para contar reintentos.
                console.log('[ErrorNode] Retrying task. The Planner will re-evaluate.');
                break;

            case 'continue':
                // Marcamos la tarea fallida como "resuelta" (aunque falló) para que el Planner
                // pase a la siguiente. Esto se hace eliminando la tarea del plan.
                if (state.currentTask && state.currentPlan.includes(state.currentTask)) {
                    updatedState.currentPlan = state.currentPlan.filter(task => task !== state.currentTask);
                }
                updatedState.currentTask = undefined;
                console.log('[ErrorNode] Error deemed non-critical. Continuing with the next task.');
                break;
        }

        return updatedState;
    }
}