// src/core/langgraph/graph/GraphBuilder.ts
import { StateGraph, START, END } from "@langchain/langgraph";
import { DependencyContainer } from "../dependencies/DependencyContainer";
import { AnalyzeNode } from "../nodes/analyzeNode";
import { ExecuteNode } from "../nodes/executeNode";
import { RespondNode } from "../nodes/respondNode";
import { ValidateNode } from "../nodes/validateNode";
import { ErrorNode } from "../nodes/ErrorNode"; // <<< AÑADIDO
import { GraphPhase, SimplifiedOptimizedGraphState } from "../state/GraphState";
import { StateAnnotations } from "./StateAnnotations";
import { TransitionLogic } from "./TransitionLogic";
import { IObservabilityManager } from "../services/interfaces/DependencyInterfaces";

export class GraphBuilder {
    constructor(
        private dependencies: DependencyContainer,
        private observability: IObservabilityManager
    ) { }

    public buildGraph(): any {
        const workflow = new StateGraph<SimplifiedOptimizedGraphState>({
            channels: StateAnnotations.getAnnotations(),
        });

        const analyzeNode = new AnalyzeNode(this.dependencies, this.observability);
        const executeNode = new ExecuteNode(this.dependencies, this.observability);
        const validateNode = new ValidateNode(this.dependencies, this.observability);
        const respondNode = new RespondNode(this.dependencies, this.observability);
        const errorNode = new ErrorNode(this.dependencies, this.observability); // <<< AÑADIDO

        workflow.addNode(GraphPhase.ANALYSIS, analyzeNode.execute.bind(analyzeNode));
        workflow.addNode(GraphPhase.EXECUTION, executeNode.execute.bind(executeNode));
        workflow.addNode(GraphPhase.VALIDATION, validateNode.execute.bind(validateNode));
        workflow.addNode(GraphPhase.RESPONSE, respondNode.execute.bind(respondNode));
        workflow.addNode(GraphPhase.ERROR_HANDLER, errorNode.execute.bind(errorNode)); // <<< AÑADIDO

        workflow.addEdge(START, GraphPhase.ANALYSIS as any);

        // CAMBIO: Las transiciones de error ahora apuntan a ERROR_HANDLER en lugar de a END.
        workflow.addConditionalEdges(GraphPhase.ANALYSIS as any, TransitionLogic.determineNextNode.bind(TransitionLogic), {
            [GraphPhase.EXECUTION]: GraphPhase.EXECUTION as any,
            [GraphPhase.ERROR_HANDLER]: GraphPhase.ERROR_HANDLER as any, // <<< CAMBIADO
        });
        workflow.addConditionalEdges(GraphPhase.EXECUTION as any, TransitionLogic.determineNextNode.bind(TransitionLogic), {
            [GraphPhase.EXECUTION]: GraphPhase.EXECUTION as any,
            [GraphPhase.VALIDATION]: GraphPhase.VALIDATION as any,
            [GraphPhase.RESPONSE]: GraphPhase.RESPONSE as any,
            [GraphPhase.ERROR_HANDLER]: GraphPhase.ERROR_HANDLER as any, // <<< CAMBIADO
        });
        workflow.addConditionalEdges(GraphPhase.VALIDATION as any, TransitionLogic.determineNextNode.bind(TransitionLogic), {
            [GraphPhase.EXECUTION]: GraphPhase.EXECUTION as any,
            [GraphPhase.RESPONSE]: GraphPhase.RESPONSE as any,
            [GraphPhase.ERROR_HANDLER]: GraphPhase.ERROR_HANDLER as any, // <<< CAMBIADO
        });
        workflow.addConditionalEdges(GraphPhase.RESPONSE as any, TransitionLogic.determineNextNode.bind(TransitionLogic), {
            [GraphPhase.COMPLETED]: END,
        });

        // AÑADIDO: El nodo de error siempre termina el grafo.
        workflow.addEdge(GraphPhase.ERROR_HANDLER as any, END);

        return workflow;
    }
}