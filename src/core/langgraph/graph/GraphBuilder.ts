// src/core/langgraph/graph/GraphBuilder.ts
import { StateGraph, START, END } from "@langchain/langgraph";
import { DependencyContainer } from "../dependencies/DependencyContainer";
import { GraphPhase, SimplifiedOptimizedGraphState } from "../state/GraphState";
import { StateAnnotations } from "./StateAnnotations";
import { TransitionLogic } from "./TransitionLogic";
import { IObservabilityManager } from "../services/interfaces/DependencyInterfaces";

// Importamos los nodos correctos para este flujo
import { PlannerNode } from "../nodes/PlannerNode";
import { ExecutorNode } from "../nodes/ExecutorNode";
import { ToolRunnerNode } from "../nodes/ToolRunnerNode";
import { RespondNode } from "../nodes/respondNode"; // El de la 'r' minúscula
import { ErrorNode } from "../nodes/ErrorNode";

export class GraphBuilder {
    constructor(
        private dependencies: DependencyContainer,
        private observability: IObservabilityManager
    ) { }

    public buildGraph(): any {
        const workflow = new StateGraph<SimplifiedOptimizedGraphState>({
            channels: StateAnnotations.getAnnotations(),
        });

        // Instanciar los nodos que vamos a usar
        const plannerNode = new PlannerNode(this.dependencies, this.observability);
        const executorNode = new ExecutorNode(this.dependencies, this.observability);
        const toolRunnerNode = new ToolRunnerNode(this.dependencies, this.observability);
        const respondNode = new RespondNode(this.dependencies, this.observability);
        const errorNode = new ErrorNode(this.dependencies, this.observability);

        // Añadir nodos al grafo
        workflow.addNode(GraphPhase.PLANNER, plannerNode.execute.bind(plannerNode));
        workflow.addNode(GraphPhase.EXECUTOR, executorNode.execute.bind(executorNode));
        workflow.addNode(GraphPhase.TOOL_RUNNER, toolRunnerNode.execute.bind(toolRunnerNode));
        workflow.addNode(GraphPhase.RESPONSE, respondNode.execute.bind(respondNode));
        workflow.addNode(GraphPhase.ERROR_HANDLER, errorNode.execute.bind(errorNode));

        // Definir el flujo de ejecución
        workflow.addEdge(START, GraphPhase.PLANNER);

        // Después del PLANNER, decidimos si ejecutar una herramienta o responder
        workflow.addConditionalEdges(GraphPhase.PLANNER, TransitionLogic.afterPlanner, {
            [GraphPhase.EXECUTOR]: GraphPhase.EXECUTOR,
            [GraphPhase.RESPONSE]: GraphPhase.RESPONSE,
            [GraphPhase.ERROR_HANDLER]: GraphPhase.ERROR_HANDLER,
        });

        // El EXECUTOR siempre pasa al TOOL_RUNNER para ejecutar la herramienta
        workflow.addEdge(GraphPhase.EXECUTOR, GraphPhase.TOOL_RUNNER);

        // Después de ejecutar la herramienta, SIEMPRE volvemos al PLANNER para reevaluar
        workflow.addEdge(GraphPhase.TOOL_RUNNER, GraphPhase.PLANNER);

        // Los nodos finales terminan el grafo
        workflow.addEdge(GraphPhase.RESPONSE, END);
        workflow.addEdge(GraphPhase.ERROR_HANDLER, END);

        return workflow;
    }
}