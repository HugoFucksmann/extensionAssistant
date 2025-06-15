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
    // MODIFICACIÓN: Este campo es gestionado por el PlannerNode. Sigue siendo útil para
    // que el Planner evite reintentar la misma tarea indefinidamente si el ErrorNode
    // decide 'retry'. Lo mantenemos.
    currentTaskRetryCount: number;
    toolsUsed: ToolExecution[]; // Este campo no parece ser usado activamente, pero puede ser útil para depuración. Lo mantenemos por ahora.
    workingMemory: string; // Gestionado por HybridMemoryService, pero no integrado en el flujo. Lo dejamos por si se integra en el futuro.
    retrievedMemory: string; // Ídem.

    // Control Flags
    // MODIFICACIÓN: Este campo no se usa en la nueva arquitectura. Lo eliminamos.
    // requiresValidation: boolean; 
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
    debugInfo?: Record<string, any>;
}