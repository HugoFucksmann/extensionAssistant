// src/core/langgraph/state/GraphState.ts
import { BaseMessage } from "@langchain/core/messages";

export enum GraphPhase {
    // Fases del ciclo Planner/Executor
    PLANNER = 'PLANNER',
    EXECUTOR = 'EXECUTOR',
    TOOL_RUNNER = 'TOOL_RUNNER',

    // Fases Comunes
    RESPONSE = 'RESPONSE',
    ERROR_HANDLER = 'ERROR_HANDLER',
    COMPLETED = 'COMPLETED',
    ERROR = 'ERROR',

    // Fases Antiguas (pueden ser eliminadas si no se usan en ningún otro sitio)
    ANALYSIS = 'ANALYSIS',
    EXECUTION = 'EXECUTION',
    VALIDATION = 'VALIDATION',
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
    workingMemory: string; // Se puede mantener o eliminar si el plan es suficiente
    retrievedMemory: string;

    // Control Flags
    requiresValidation: boolean; // Probablemente ya no se use, pero se puede dejar por ahora
    isCompleted: boolean;
    lastToolOutput?: any;

    // Iteration Control
    iteration: number;
    nodeIterations: Record<string, number>; // Cambiado a string para flexibilidad
    maxGraphIterations: number;
    maxNodeIterations: Partial<Record<GraphPhase, number>>;

    // Metadata
    startTime: number;
    error?: string;
    debugInfo?: Record<string, any>;
}