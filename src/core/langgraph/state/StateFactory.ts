// src/core/langgraph/state/StateFactory.ts
import { HumanMessage } from "@langchain/core/messages";
import { GraphPhase, SimplifiedOptimizedGraphState } from "./GraphState";

interface EngineConfig {
    maxGraphIterations: number;
    maxNodeIterations: Partial<Record<GraphPhase, number>>;
}

export class StateFactory {
    static createInitialState(
        userInput: string,
        chatId: string,
        config: EngineConfig
    ): SimplifiedOptimizedGraphState {
        return {
            // CAMBIO: Inicializamos los mensajes como un array vacío.
            // El ApplicationLogicService se encargará de poblarlo con el historial + el nuevo mensaje.
            messages: [],
            userInput,
            chatId,
            currentPhase: GraphPhase.ANALYSIS,
            currentPlan: [],
            toolsUsed: [],
            // CAMBIO: El working memory se inicializará en el servicio, que tiene el contexto previo.
            workingMemory: '',
            retrievedMemory: '',
            requiresValidation: false,
            isCompleted: false,
            iteration: 0,
            nodeIterations: {
                [GraphPhase.ANALYSIS]: 0,
                [GraphPhase.EXECUTION]: 0,
                [GraphPhase.VALIDATION]: 0,
                [GraphPhase.RESPONSE]: 0,
                [GraphPhase.ERROR_HANDLER]: 0,
                [GraphPhase.COMPLETED]: 0,
                [GraphPhase.ERROR]: 0
            },
            maxGraphIterations: config.maxGraphIterations,
            maxNodeIterations: config.maxNodeIterations,
            startTime: Date.now()
        };
    }
}