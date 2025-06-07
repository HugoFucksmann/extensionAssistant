// src/core/langgraph/graph/GraphBuilder.ts
import { StateGraph, START, END, CompiledStateGraph } from "@langchain/langgraph";
import { DependencyContainer } from "../dependencies/DependencyContainer";
import { AnalyzeNode } from "../nodes/AnalyzeNode";
import { ExecuteNode } from "../nodes/ExecuteNode";
import { RespondNode } from "../nodes/RespondNode";
import { ValidateNode } from "../nodes/ValidateNode";
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
        // Creamos el grafo con los canales de estado definidos
        const workflow = new StateGraph<SimplifiedOptimizedGraphState>({
            channels: StateAnnotations.getAnnotations(),
        });

        // Instanciar nodos con dependencias
        const analyzeNode = new AnalyzeNode(this.dependencies, this.observability);
        const executeNode = new ExecuteNode(this.dependencies, this.observability);
        const validateNode = new ValidateNode(this.dependencies, this.observability);
        const respondNode = new RespondNode(this.dependencies, this.observability);

        // Agregar nodos al grafo
        workflow.addNode(GraphPhase.ANALYSIS, analyzeNode.execute.bind(analyzeNode));
        workflow.addNode(GraphPhase.EXECUTION, executeNode.execute.bind(executeNode));
        workflow.addNode(GraphPhase.VALIDATION, validateNode.execute.bind(validateNode));
        workflow.addNode(GraphPhase.RESPONSE, respondNode.execute.bind(respondNode));

        // Definir el flujo del grafo
        // Conectamos el nodo START al primer nodo del flujo
        workflow.addEdge(START, GraphPhase.ANALYSIS as any);

        // Agregar aristas condicionales
        workflow.addConditionalEdges(GraphPhase.ANALYSIS as any, TransitionLogic.determineNextNode.bind(TransitionLogic), {
            [GraphPhase.EXECUTION]: GraphPhase.EXECUTION as any,
            [GraphPhase.ERROR]: END,
        });
        workflow.addConditionalEdges(GraphPhase.EXECUTION as any, TransitionLogic.determineNextNode.bind(TransitionLogic), {
            [GraphPhase.EXECUTION]: GraphPhase.EXECUTION as any,
            [GraphPhase.VALIDATION]: GraphPhase.VALIDATION as any,
            [GraphPhase.RESPONSE]: GraphPhase.RESPONSE as any,
            [GraphPhase.ERROR]: END,
        });
        workflow.addConditionalEdges(GraphPhase.VALIDATION as any, TransitionLogic.determineNextNode.bind(TransitionLogic), {
            [GraphPhase.EXECUTION]: GraphPhase.EXECUTION as any,
            [GraphPhase.RESPONSE]: GraphPhase.RESPONSE as any,
            [GraphPhase.ERROR]: END,
        });
        workflow.addConditionalEdges(GraphPhase.RESPONSE as any, TransitionLogic.determineNextNode.bind(TransitionLogic), {
            [GraphPhase.COMPLETED]: END,
            [GraphPhase.ERROR]: END,
        });

        // En LangGraph v0.2.3, el método para obtener el grafo ejecutable puede variar
        // Simplemente devolvemos el workflow directamente, que debería ser ejecutable
        return workflow;
    }
}