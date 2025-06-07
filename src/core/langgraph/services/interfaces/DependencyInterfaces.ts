// src/core/langgraph/services/interfaces/DependencyInterfaces.ts
import { BaseMessage } from "@langchain/core/messages";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { SimplifiedOptimizedGraphState } from "../../state/GraphState";
import { ToolResult } from "../../../../features/tools/types";
import { ModelManager } from "../../../../features/ai/ModelManager";
import { ToolRegistry } from "../../../../features/tools/ToolRegistry";
import { MemoryManager } from "../../../../features/memory/MemoryManager";
import { ObservabilityManager } from "../../observability/ObservabilityManager";

// Placeholder para la salida de los servicios de LLM
import type { AnalysisOutput } from '../../../../features/ai/prompts/optimized/analysisPrompt';
import type { ReasoningOutput } from '../../../../features/ai/prompts/optimized/reasoningPrompt';
import type { ResponseOutput } from '../../../../features/ai/prompts/optimized/responsePrompt';

export interface DeepValidationResult { passed: boolean; stateUpdates: Partial<SimplifiedOptimizedGraphState>; error?: string; }

// Placeholder para el contexto de memoria
export interface StructuredMemoryContext { workingMemorySnapshot: string; retrievedKnowledgeChunks: string[]; }

// Interfaces de Servicio
export interface IMemoryService {
    getStructuredContext(chatId: string, query: string, objective?: string): Promise<StructuredMemoryContext>;
    updateWorkingMemory(chatId: string, newInfo: string, currentMessages: BaseMessage[], objective?: string): Promise<void>;
}

export interface IAnalysisService {
    analyzeQuery(query: string, context: StructuredMemoryContext, availableTools: string[]): Promise<AnalysisOutput>;
}

export interface IReasoningService {
    generateReasoningAndAction(state: SimplifiedOptimizedGraphState): Promise<ReasoningOutput>;
}

export interface IValidationService {
    performDeepValidation(state: SimplifiedOptimizedGraphState): Promise<DeepValidationResult>;
}

export interface IResponseService {
    generateResponse(state: SimplifiedOptimizedGraphState): Promise<ResponseOutput>;
}

export interface IPromptProvider {
    getAnalysisPrompt(): ChatPromptTemplate;
    getReasoningPrompt(): ChatPromptTemplate;
    getValidationPrompt(): ChatPromptTemplate;
    getResponsePrompt(): ChatPromptTemplate;
}

// Interfaces de Componentes Core (para claridad en la inyección)
export type IModelManager = ModelManager;
export type IToolRegistry = ToolRegistry;
export type IMemoryManager = MemoryManager;
export type IObservabilityManager = ObservabilityManager;