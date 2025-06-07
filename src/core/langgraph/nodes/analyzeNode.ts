// src/core/langgraph/nodes/AnalyzeNode.ts
import { AIMessage } from "@langchain/core/messages";
import { IAnalysisService, IMemoryService, IToolRegistry } from "../services/interfaces/DependencyInterfaces";
import { GraphPhase, SimplifiedOptimizedGraphState } from "../state/GraphState";
import { BaseNode, NodeExecutionContext } from "./BaseNode";

export class AnalyzeNode extends BaseNode {
    private analysisService: IAnalysisService;
    private memoryService: IMemoryService;
    private toolRegistry: IToolRegistry;

    constructor(dependencies: any, observability: any) {
        super(GraphPhase.ANALYSIS, dependencies, observability);
        this.analysisService = dependencies.get('IAnalysisService') as IAnalysisService;
        this.memoryService = dependencies.get('IMemoryService') as IMemoryService;
        this.toolRegistry = dependencies.get('IToolRegistry') as IToolRegistry;
    }

    protected async executeCore(
        state: SimplifiedOptimizedGraphState,
        context: NodeExecutionContext
    ): Promise<Partial<SimplifiedOptimizedGraphState>> {

        const memoryContext = await this.memoryService.getStructuredContext(
            state.chatId,
            state.userInput
        );

        // Obtener las herramientas disponibles para pasarlas al servicio de análisis
        const availableTools = this.toolRegistry.getToolNames();

        // Llamada corregida con los 3 argumentos requeridos
        const analysisResult = await this.analysisService.analyzeQuery(
            state.userInput,
            memoryContext,
            availableTools
        );

        await this.memoryService.updateWorkingMemory(
            state.chatId,
            analysisResult.understanding,
            state.messages
        );

        return {
            currentPlan: analysisResult.initialPlan,
            currentTask: analysisResult.initialPlan[0],
            workingMemory: analysisResult.understanding,
            retrievedMemory: memoryContext.retrievedKnowledgeChunks.join('\n'),
            messages: [
                ...state.messages,
                new AIMessage(`Analysis complete. Understanding: ${analysisResult.understanding}. Plan: ${analysisResult.initialPlan.join(', ')}`)
            ]
        };
    }
}