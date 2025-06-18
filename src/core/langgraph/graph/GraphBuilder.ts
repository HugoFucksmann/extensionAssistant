// src/core/langgraph/graph/GraphBuilder.ts
import { StateGraph, START, END } from "@langchain/langgraph";
import { DependencyContainer } from "../dependencies/DependencyContainer";
import { GraphPhase, SimplifiedOptimizedGraphState } from "../state/GraphState";
import { StateAnnotations } from "./StateAnnotations";
import { TransitionLogic } from "./TransitionLogic";
import { IGraphPhaseObserver } from "../services/interfaces/DependencyInterfaces";

import { PlannerNode } from "../nodes/PlannerNode";
import { ExecutorNode } from "../nodes/ExecutorNode";
import { ToolRunnerNode } from "../nodes/ToolRunnerNode";
import { RespondNode } from "../nodes/RespondNode";
import { ErrorNode } from "../nodes/ErrorNode";



export class GraphBuilder {
    constructor(
        private dependencies: DependencyContainer,
        private observer: IGraphPhaseObserver
    ) { }

    public buildGraph(): any {
        const workflow = new StateGraph<SimplifiedOptimizedGraphState>({
            channels: StateAnnotations.getAnnotations(),
        });

        const plannerNode = new PlannerNode(this.dependencies, this.observer);
        const executorNode = new ExecutorNode(this.dependencies, this.observer);
        const toolRunnerNode = new ToolRunnerNode(this.dependencies, this.observer);
        const respondNode = new RespondNode(this.dependencies, this.observer);
        const errorNode = new ErrorNode(this.dependencies, this.observer);

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

        // AÑADIR la nueva conexión de vuelta al Planner.
        workflow.addEdge(GraphPhase.ERROR_HANDLER, GraphPhase.PLANNER);

        // El único nodo que ahora termina el grafo es el de respuesta.
        workflow.addEdge(GraphPhase.RESPONSE, END);

        return workflow;
    }
}