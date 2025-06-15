// src/core/langgraph/services/interfaces/DependencyInterfaces.ts
import { BaseMessage } from "@langchain/core/messages";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { SimplifiedOptimizedGraphState } from "../../state/GraphState";

import { ModelManager } from "../../../../features/ai/ModelManager";
import { ToolRegistry } from "../../../../features/tools/ToolRegistry";
import { MemoryManager } from "../../../../features/memory/MemoryManager";
import { ObservabilityManager } from "../../observability/ObservabilityManager";

// --- SALIDAS DE PROMPTS ---
import { Plan } from '../../../../features/ai/prompts/plannerPrompt';
import { ExecutorOutput } from '../../../../features/ai/prompts/executorPrompt';
import { FinalResponse } from '../../../../features/ai/prompts/finalResponsePrompt';
import { ErrorCorrectionDecision } from "../../../../features/ai/prompts/errorCorrectionPrompt";

// --- CONTEXTOS DE SERVICIO ---
import { ErrorContext } from "../ErrorCorrectionService"; // <-- AÑADIR
import { PlannerContext, ExecutorContext, ResponderContext, ErrorHandlerContext } from "../ContextBuilderService"; // <-- AÑADIR

// --- SERVICIOS ---
export interface IPlannerService {
    updatePlan(context: PlannerContext): Promise<Plan>; // <-- MODIFICAR
}
export interface IExecutorService {
    generateToolCall(context: ExecutorContext): Promise<ExecutorOutput>; // <-- MODIFICAR
}
export interface IFinalResponseService {
    generateResponse(context: ResponderContext): Promise<FinalResponse>; // <-- MODIFICAR
}
export interface IErrorCorrectionService { // <-- AÑADIR
    analyzeError(context: ErrorContext): Promise<ErrorCorrectionDecision>;
}

// --- PROVEEDOR DE PROMPTS ---
export interface IPromptProvider {
    getPlannerPrompt(): ChatPromptTemplate;
    getExecutorPrompt(): ChatPromptTemplate;
    getFinalResponsePrompt(): ChatPromptTemplate;
    getErrorCorrectionPrompt(): ChatPromptTemplate; // <-- AÑADIR
}

// --- SERVICIOS DE INFRAESTRUCTURA ---
export interface StructuredMemoryContext { workingMemorySnapshot: string; retrievedKnowledgeChunks: string[]; }
export interface IMemoryService {
    getStructuredContext(chatId: string, query: string, objective?: string): Promise<StructuredMemoryContext>;
    updateWorkingMemory(chatId: string, newInfo: string, currentMessages: BaseMessage[], objective?: string): Promise<void>;
}
export interface IContextBuilderService { // <-- AÑADIR
    forPlanner(state: SimplifiedOptimizedGraphState): PlannerContext;
    forExecutor(state: SimplifiedOptimizedGraphState): ExecutorContext;
    forResponder(state: SimplifiedOptimizedGraphState): ResponderContext;
    forError(state: SimplifiedOptimizedGraphState): ErrorHandlerContext;
}

// --- DEPENDENCIAS PRINCIPALES ---
export type IModelManager = ModelManager;
export type IToolRegistry = ToolRegistry;
export type IMemoryManager = MemoryManager;
export type IObservabilityManager = ObservabilityManager;