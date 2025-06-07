// src/core/langgraph/state/StateFactory.ts
import { HumanMessage } from "@langchain/core/messages";
// Se eliminó la dependencia de 'config2.ts'
import { GraphPhase, SimplifiedOptimizedGraphState } from "./GraphState";

// La configuración del motor se pasa directamente, eliminando la necesidad de importar archivos de config.
interface EngineConfig {
    maxGraphIterations: number;
    maxNodeIterations: Partial<Record<GraphPhase, number>>;
}

export class StateFactory {
    static createInitialState(
        userInput: string,
        chatId: string,
        config: EngineConfig // La configuración del motor se pasará aquí
    ): SimplifiedOptimizedGraphState {
        return {
            messages: [new HumanMessage(userInput)],
            userInput,
            chatId,
            currentPhase: GraphPhase.ANALYSIS,
            currentPlan: [],
            toolsUsed: [],
            workingMemory: `User wants to: ${userInput.substring(0, 100)}`,
            retrievedMemory: '',
            requiresValidation: false,
            isCompleted: false,
            iteration: 0,
            nodeIterations: {
                [GraphPhase.ANALYSIS]: 0,
                [GraphPhase.EXECUTION]: 0,
                [GraphPhase.VALIDATION]: 0,
                [GraphPhase.RESPONSE]: 0,
                [GraphPhase.COMPLETED]: 0,
                [GraphPhase.ERROR]: 0
            },
            maxGraphIterations: config.maxGraphIterations,
            maxNodeIterations: config.maxNodeIterations,
            startTime: Date.now()
        };
    }
}