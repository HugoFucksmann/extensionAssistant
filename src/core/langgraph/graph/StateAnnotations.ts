// src/core/langgraph/graph/StateAnnotations.ts
import { BaseMessage } from "@langchain/core/messages";
import { GraphPhase, ToolExecution } from "../state/GraphState";
import { deduplicateMessages } from "../../../shared/utils/messageUtils";


export class StateAnnotations {
    public static getAnnotations() {
        return {
            // Core state fields
            messages: {

                reducer: (current: BaseMessage[], update?: BaseMessage[]) =>
                    deduplicateMessages([...(current || []), ...(update || [])]),
                default: () => [],
            },
            userInput: {

                reducer: (current: string, update?: string) => update ?? current,
                default: () => "",
            },
            chatId: {

                reducer: (current: string, update?: string) => update ?? current,
                default: () => "",
            },
            currentPhase: {

                reducer: (current: GraphPhase, update?: GraphPhase) => update ?? current,
                default: () => GraphPhase.ANALYSIS,
            },


            currentPlan: {

                reducer: (current: string[], update?: string[]) => update ?? current,
                default: () => [],
            },
            currentTask: {

                reducer: (current: string | undefined, update?: string) => update !== undefined ? update : current,
                default: () => undefined,
            },
            toolsUsed: {

                reducer: (current: ToolExecution[], update?: ToolExecution[]) =>
                    [...(current || []), ...(update || [])],
                default: () => [],
            },
            workingMemory: {

                reducer: (current: string, update?: string) => update ?? current,
                default: () => "",
            },
            retrievedMemory: {

                reducer: (current: string, update?: string) => update ?? current,
                default: () => "",
            },


            requiresValidation: {
                reducer: (current: boolean, update?: boolean) => update ?? current,
                default: () => false,
            },
            isCompleted: {
                reducer: (current: boolean, update?: boolean) => update ?? current,
                default: () => false,
            },
            lastToolOutput: {
                reducer: (current: any, update?: any) => update ?? current,
                default: () => undefined,
            },

            iteration: {

                reducer: (current: number) => (current || 0) + 1,
                default: () => 0,
            },
            nodeIterations: {

                reducer: (current: Record<GraphPhase, number>, update?: Partial<Record<GraphPhase, number>>) =>
                    ({ ...(current || {}), ...(update || {}) }),
                default: () => ({
                    [GraphPhase.ANALYSIS]: 0,
                    [GraphPhase.EXECUTION]: 0,
                    [GraphPhase.VALIDATION]: 0,
                    [GraphPhase.RESPONSE]: 0,
                    [GraphPhase.ERROR_HANDLER]: 0,
                    [GraphPhase.COMPLETED]: 0,
                    [GraphPhase.ERROR]: 0
                }),
            },
            maxGraphIterations: {
                reducer: (current: number, update?: number) => update ?? current,
                default: () => 20,
            },
            maxNodeIterations: {
                reducer: (current: Partial<Record<GraphPhase, number>>, update?: Partial<Record<GraphPhase, number>>) => update ?? current,
                default: () => ({}),
            },

            // Metadata
            startTime: {
                // The start time is immutable and should never be updated.
                reducer: (current: number) => current,
                default: () => Date.now(),
            },
            error: {
                reducer: (current: string | undefined, update?: string) => update ?? current,
                default: () => undefined,
            },
            debugInfo: {
                reducer: (current: Record<string, any> | undefined, update?: Partial<Record<string, any>>) =>
                    ({ ...(current ?? {}), ...(update ?? {}) }),
                default: () => ({}),
            },
        };
    }
}