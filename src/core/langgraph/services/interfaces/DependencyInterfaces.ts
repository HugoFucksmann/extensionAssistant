// src/core/langgraph/services/interfaces/DependencyInterfaces.ts
import { BaseMessage } from "@langchain/core/messages";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { SimplifiedOptimizedGraphState } from "../../state/GraphState";

import { ModelManager } from "../../../../features/ai/ModelManager";
import { ToolRegistry } from "../../../../features/tools/ToolRegistry";
import { MemoryManager } from "../../../../features/memory/MemoryManager";
import { ObservabilityManager } from "../../observability/ObservabilityManager";

// --- SALIDAS DE PROMPTS (Arquitectura Planner/Executor) ---
import { Plan } from '../../../../features/ai/prompts/plannerPrompt';
import { ExecutorOutput } from '../../../../features/ai/prompts/executorPrompt';
import { FinalResponse } from '../../../../features/ai/prompts/finalResponsePrompt';

// --- SERVICIOS (Arquitectura Planner/Executor) ---
export interface IPlannerService {
    updatePlan(userQuery: string, chatHistory: string, currentPlan: string[], executionHistory: string): Promise<Plan>;
}
export interface IExecutorService {
    generateToolCall(task: string, userQuery: string, availableTools: string): Promise<ExecutorOutput>;
}
export interface IFinalResponseService {
    generateResponse(userQuery: string, chatHistory: string): Promise<FinalResponse>;
}

// --- PROVEEDOR DE PROMPTS (Simplificado) ---
export interface IPromptProvider {
    getPlannerPrompt(): ChatPromptTemplate;
    getExecutorPrompt(): ChatPromptTemplate;
    getFinalResponsePrompt(): ChatPromptTemplate;
}

// --- SERVICIOS COMUNES (Se mantienen) ---
export interface StructuredMemoryContext { workingMemorySnapshot: string; retrievedKnowledgeChunks: string[]; }
export interface IMemoryService {
    getStructuredContext(chatId: string, query: string, objective?: string): Promise<StructuredMemoryContext>;
    updateWorkingMemory(chatId: string, newInfo: string, currentMessages: BaseMessage[], objective?: string): Promise<void>;
}

// --- DEPENDENCIAS PRINCIPALES (Se mantienen) ---
export type IModelManager = ModelManager;
export type IToolRegistry = ToolRegistry;
export type IMemoryManager = MemoryManager;
export type IObservabilityManager = ObservabilityManager;