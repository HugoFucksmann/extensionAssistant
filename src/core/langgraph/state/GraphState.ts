// src/core/langgraph/state/GraphState.ts
import { BaseMessage } from "@langchain/core/messages";

export enum GraphPhase {
    PLANNER = 'PLANNER',
    EXECUTOR = 'EXECUTOR',
    TOOL_RUNNER = 'TOOL_RUNNER',
    RESPONSE = 'RESPONSE',
    ERROR_HANDLER = 'ERROR_HANDLER',
    COMPLETED = 'COMPLETED',
    ERROR = 'ERROR',
}

export interface ToolExecution {
    toolName: string;
    input: any;
    output: any;
    timestamp: number;
    success: boolean;
    error?: string;
}

export interface SimplifiedOptimizedGraphState {
    // Core
    messages: BaseMessage[];
    userInput: string;
    chatId: string;
    currentPhase: GraphPhase;

    // Execution & Context
    currentPlan: string[];
    currentTask?: string | null;
    currentTaskRetryCount: number;
    toolsUsed: ToolExecution[];
    workingMemory: string;
    retrievedMemory: string;

    // Control Flags
    isCompleted: boolean;
    lastToolOutput?: any;

    // Iteration Control
    iteration: number;
    nodeIterations: Record<string, number>;
    maxGraphIterations: number;
    maxNodeIterations: Partial<Record<GraphPhase, number>>;

    // Metadata
    startTime: number;
    error?: string;
    debugInfo?: DebugInfo;
}


export interface DebugInfo {
    pendingToolCall?: {
        tool: string;
        parameters: any;
    };
    rawResponseFromFailedNode?: string;
    [key: string]: any; // Permite extensibilidad
}