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

        workflow.setEntryPoint(GraphPhase.PLANNER);

        workflow.addConditionalEdges(GraphPhase.PLANNER, TransitionLogic.route, {
            [GraphPhase.EXECUTOR]: GraphPhase.EXECUTOR,
            [GraphPhase.RESPONSE]: GraphPhase.RESPONSE,
            [GraphPhase.ERROR_HANDLER]: GraphPhase.ERROR_HANDLER,
        });

        workflow.addConditionalEdges(GraphPhase.EXECUTOR, TransitionLogic.route, {
            [GraphPhase.TOOL_RUNNER]: GraphPhase.TOOL_RUNNER,
            [GraphPhase.RESPONSE]: GraphPhase.RESPONSE, // En caso de que no haya herramienta que llamar
        });

        workflow.addConditionalEdges(GraphPhase.TOOL_RUNNER, TransitionLogic.route, {
            [GraphPhase.EXECUTOR]: GraphPhase.EXECUTOR, // Bucle para la siguiente tarea
            [GraphPhase.RESPONSE]: GraphPhase.RESPONSE,   // Fin del plan
            [GraphPhase.ERROR_HANDLER]: GraphPhase.ERROR_HANDLER,
        });
        
        workflow.addConditionalEdges(GraphPhase.ERROR_HANDLER, TransitionLogic.route, {
            [GraphPhase.PLANNER]: GraphPhase.PLANNER, // Re-planificar
            [GraphPhase.RESPONSE]: GraphPhase.RESPONSE, // Error irrecuperable
        });

        workflow.addEdge(GraphPhase.RESPONSE, END);

        return workflow;
    }
}