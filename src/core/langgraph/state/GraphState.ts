// src/core/langgraph/state/GraphState.ts
import { BaseMessage } from "@langchain/core/messages";

export enum GraphPhase {
    ANALYSIS = 'ANALYSIS',
    EXECUTION = 'EXECUTION',
    VALIDATION = 'VALIDATION',
    RESPONSE = 'RESPONSE',
    COMPLETED = 'COMPLETED',
    ERROR = 'ERROR'
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
    currentTask?: string;
    toolsUsed: ToolExecution[];
    workingMemory: string;
    retrievedMemory: string;

    // Control Flags
    requiresValidation: boolean;
    isCompleted: boolean;
    lastToolOutput?: any;

    // Iteration Control
    iteration: number;
    nodeIterations: Record<GraphPhase, number>;
    maxGraphIterations: number;
    maxNodeIterations: Partial<Record<GraphPhase, number>>;

    // Metadata
    startTime: number;
    error?: string;
    debugInfo?: Record<string, any>;
}