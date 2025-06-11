// src/core/langgraph/GraphBuilder.ts
import { StateGraph, END } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { AgentState, agentState } from './GraphState';
import { analysisNode, reasoningNode, responseNode } from './nodes/graphNodes';
import { ComponentFactory } from '@core/ComponentFactory';
import { AIMessage } from '@langchain/core/messages';
import { InternalEventDispatcher } from '@core/events/InternalEventDispatcher';
import { EventType } from '../../features/events/eventTypes';

// --- CORRECCIÓN: El dispatcher no debe ser instanciado aquí, sino obtenido de la ComponentFactory ---
// para asegurar que es el mismo singleton que usa el resto de la aplicación.
const getEventDispatcher = () => ComponentFactory.getInternalEventDispatcher();

function shouldContinue(state: AgentState): 'tool_executor' | 'generate_response' {
    const { messages, errorCount, maxIterations } = state;
    const lastMessage = messages[messages.length - 1];

    if (errorCount > 2 || messages.length > maxIterations) {
        console.warn('[GraphBuilder] Límite de errores o iteraciones alcanzado. Forzando finalización.');
        getEventDispatcher().systemWarning('Límite de errores o iteraciones alcanzado. Finalizando la ejecución.', {}, 'GraphBuilder');
        return 'generate_response';
    }

    if (lastMessage instanceof AIMessage && lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
        return 'tool_executor';
    }

    return 'generate_response';
}

export class GraphBuilder {
    private graph: StateGraph<AgentState>;

    constructor() {
        this.graph = new StateGraph({ channels: agentState });
    }

    private buildGraph(): void {
        const toolRegistry = ComponentFactory.getToolRegistry();
        const tools = toolRegistry.asDynamicTools();
        const toolExecutorNode = new ToolNode(tools);

        // 1. Definir los nodos del grafo
        this.graph.addNode('analysis', analysisNode);
        this.graph.addNode('reason_and_plan', reasoningNode);
        this.graph.addNode('tool_executor', toolExecutorNode);
        this.graph.addNode('generate_response', responseNode);

        // 2. Definir las conexiones (edges)
        // Usando type assertions para compatibilidad con LangGraph v0.2.3
        (this.graph as any).setEntryPoint('analysis');
        (this.graph as any).addEdge('analysis', 'reason_and_plan');
        (this.graph as any).addEdge('tool_executor', 'reason_and_plan'); // Bucle de ejecución

        // 3. Definir la conexión condicional
        (this.graph as any).addConditionalEdges(
            'reason_and_plan',
            shouldContinue,
            {
                tool_executor: 'tool_executor',
                generate_response: 'generate_response',
            }
        );

        // 4. Definir el punto final
        (this.graph as any).addEdge('generate_response', END);

        // Registrar eventos para depuración
        const eventDispatcher = getEventDispatcher();
        eventDispatcher.systemInfo('Grafo LangGraph construido correctamente', {
            nodes: Object.keys(this.graph.nodes),
            entryPoint: 'analysis'
        }, 'GraphBuilder');
    }



    /**
     * Compila el grafo. La lógica de eventos ha sido eliminada
     * ya que es manejada por ConcreteExecutionEngine al consumir el stream.
     * @returns El grafo compilado listo para ejecutar.
     */
    public getCompiledGraph() {
        // Inicializamos el grafo bajo demanda para evitar problemas de dependencias cíclicas
        if (Object.keys(this.graph.nodes).length === 0) {
            this.buildGraph();
        }

        return this.graph.compile();
    }
}