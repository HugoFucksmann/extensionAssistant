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
            messages: [new HumanMessage(userInput)],
            userInput,
            chatId,
            currentPhase: GraphPhase.ANALYSIS,
            currentPlan: [],
            toolsUsed: [],
            workingMemory: '',
            retrievedMemory: '',
            currentTaskRetryCount: 0,
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


    static prepareStateForNewTurn(
        previousState: SimplifiedOptimizedGraphState,
        newUserInput: string,
        config: EngineConfig
    ): SimplifiedOptimizedGraphState {
        return {

            chatId: previousState.chatId,
            messages: [...previousState.messages, new HumanMessage(newUserInput)],
            workingMemory: previousState.error ? '' : (previousState.workingMemory || ''),

            currentTaskRetryCount: 0,
            maxGraphIterations: config.maxGraphIterations,
            maxNodeIterations: config.maxNodeIterations,

            userInput: newUserInput,
            currentPhase: GraphPhase.ANALYSIS,
            currentPlan: [],
            currentTask: undefined,
            toolsUsed: [],
            retrievedMemory: '',
            isCompleted: false,
            lastToolOutput: undefined,
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
            startTime: Date.now(),
            error: undefined,
            debugInfo: {},
        };
    }
}