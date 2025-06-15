// src/core/langgraph/graph/GraphBuilder.ts
import { StateGraph, START, END } from "@langchain/langgraph";
import { DependencyContainer } from "../dependencies/DependencyContainer";
import { GraphPhase, SimplifiedOptimizedGraphState } from "../state/GraphState";
import { StateAnnotations } from "./StateAnnotations";
import { TransitionLogic } from "./TransitionLogic";
import { IObservabilityManager } from "../services/interfaces/DependencyInterfaces";

import { PlannerNode } from "../nodes/PlannerNode";
import { ExecutorNode } from "../nodes/ExecutorNode";
import { ToolRunnerNode } from "../nodes/ToolRunnerNode";
import { RespondNode } from "../nodes/respondNode";
import { ErrorNode } from "../nodes/ErrorNode";


/**
 * Construye el grafo de ejecución del agente siguiendo una arquitectura Planner/Executor con auto-corrección.
 * El flujo es el siguiente:
 * 1. START -> PLANNER: Se crea o actualiza un plan de acción.
 * 2. PLANNER -> [EXECUTOR | RESPONSE | ERROR_HANDLER]:
 *    - Si hay un error, va a ERROR_HANDLER.
 *    - Si el plan está completo, va a RESPONSE.
 *    - Si hay una nueva tarea, va a EXECUTOR.
 * 3. EXECUTOR -> TOOL_RUNNER: El ejecutor traduce la tarea en una llamada a herramienta.
 * 4. TOOL_RUNNER -> PLANNER: La herramienta se ejecuta y el resultado vuelve al planificador para reevaluar.
 * 5. ERROR_HANDLER -> PLANNER: Si ocurre un error, este nodo lo analiza, decide una acción correctiva
 *    (reintentar, modificar plan), actualiza el estado y devuelve el control al planificador.
 * 6. RESPONSE -> END: Se genera una respuesta final para el usuario y el flujo termina.
 */
export class GraphBuilder {
    constructor(
        private dependencies: DependencyContainer,
        private observability: IObservabilityManager
    ) { }

    public buildGraph(): any {
        const workflow = new StateGraph<SimplifiedOptimizedGraphState>({
            channels: StateAnnotations.getAnnotations(),
        });

        const plannerNode = new PlannerNode(this.dependencies, this.observability);
        const executorNode = new ExecutorNode(this.dependencies, this.observability);
        const toolRunnerNode = new ToolRunnerNode(this.dependencies, this.observability);
        const respondNode = new RespondNode(this.dependencies, this.observability);
        const errorNode = new ErrorNode(this.dependencies, this.observability);

        workflow.addNode(GraphPhase.PLANNER, plannerNode.execute.bind(plannerNode));
        workflow.addNode(GraphPhase.EXECUTOR, executorNode.execute.bind(executorNode));
        workflow.addNode(GraphPhase.TOOL_RUNNER, toolRunnerNode.execute.bind(toolRunnerNode));
        workflow.addNode(GraphPhase.RESPONSE, respondNode.execute.bind(respondNode));
        workflow.addNode(GraphPhase.ERROR_HANDLER, errorNode.execute.bind(errorNode));

        workflow.addEdge(START, GraphPhase.PLANNER);

        workflow.addConditionalEdges(GraphPhase.PLANNER, TransitionLogic.afterPlanner, {
            [GraphPhase.EXECUTOR]: GraphPhase.EXECUTOR,
            [GraphPhase.RESPONSE]: GraphPhase.RESPONSE,
            [GraphPhase.ERROR_HANDLER]: GraphPhase.ERROR_HANDLER,
        });

        workflow.addEdge(GraphPhase.EXECUTOR, GraphPhase.TOOL_RUNNER);
        workflow.addEdge(GraphPhase.TOOL_RUNNER, GraphPhase.PLANNER);

        // MODIFICACIÓN CLAVE:
        // ELIMINAR la vieja conexión a END.
        // workflow.addEdge(GraphPhase.ERROR_HANDLER, END);

        // AÑADIR la nueva conexión de vuelta al Planner.
        workflow.addEdge(GraphPhase.ERROR_HANDLER, GraphPhase.PLANNER);

        // El único nodo que ahora termina el grafo es el de respuesta.
        workflow.addEdge(GraphPhase.RESPONSE, END);

        return workflow;
    }
}