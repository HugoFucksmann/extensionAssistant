// src/core/langgraph/graph/StateAnnotations.ts

import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { SimplifiedOptimizedGraphState, GraphPhase, ToolExecution } from "../state/GraphState";
import { deduplicateMessages } from "../../../shared/utils/messageUtils";

/**
 * Defines the channels for the StateGraph and how updates to each channel are handled.
 * This is a critical part of the LangGraph setup, controlling how the state object
 * is merged and maintained as it flows through the graph.
 */
export class StateAnnotations {
    public static getAnnotations() {
        return {
            // Core state fields
            messages: {
                // Appends new messages to the existing list and removes duplicates.
                reducer: (current: BaseMessage[], update?: BaseMessage[]) =>
                    deduplicateMessages([...(current || []), ...(update || [])]),
                default: () => [],
            },
            userInput: {
                // Overwrites the value. Should only be set once at the beginning.
                reducer: (current: string, update?: string) => update ?? current,
                default: () => "",
            },
            chatId: {
                // Overwrites the value. Should only be set once at the beginning.
                reducer: (current: string, update?: string) => update ?? current,
                default: () => "",
            },
            currentPhase: {
                // Overwrites with the latest phase from the executing node.
                reducer: (current: GraphPhase, update?: GraphPhase) => update ?? current,
                default: () => GraphPhase.ANALYSIS,
            },

            // Execution & Context
            currentPlan: {
                // A new plan from a node (e.g., Analysis or Validation) replaces the old one.
                reducer: (current: string[], update?: string[]) => update ?? current,
                default: () => [],
            },
            currentTask: {
                // The current task is always overwritten by the latest decision.
                reducer: (current: string | undefined, update?: string) => update !== undefined ? update : current,
                default: () => undefined,
            },
            toolsUsed: {
                // Accumulates the list of all tools used in the run.
                reducer: (current: ToolExecution[], update?: ToolExecution[]) =>
                    [...(current || []), ...(update || [])],
                default: () => [],
            },
            workingMemory: {
                // The working memory/understanding is overwritten by the latest node's output.
                reducer: (current: string, update?: string) => update ?? current,
                default: () => "",
            },
            retrievedMemory: {
                // Retrieved memory is typically fetched once and then replaced if re-fetched.
                reducer: (current: string, update?: string) => update ?? current,
                default: () => "",
            },

            // Control Flags
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

            // Iteration Control
            iteration: {
                // Increments the total step count for every successful node execution.
                reducer: (current: number) => (current || 0) + 1,
                default: () => 0,
            },
            nodeIterations: {
                // Merges updates to the node-specific iteration counters.
                reducer: (current: Record<GraphPhase, number>, update?: Partial<Record<GraphPhase, number>>) =>
                    ({ ...(current || {}), ...(update || {}) }),
                default: () => ({ ANALYSIS: 0, EXECUTION: 0, VALIDATION: 0, RESPONSE: 0, COMPLETED: 0, ERROR: 0 }),
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