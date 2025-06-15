// src/core/langgraph/services/ContextBuilderService.ts
import { BaseMessage, isAIMessage, isHumanMessage, isToolMessage } from "@langchain/core/messages";
import { SimplifiedOptimizedGraphState } from "../state/GraphState";
import { IToolRegistry } from "./interfaces/DependencyInterfaces";

// Tipos para los contextos de salida, para mayor claridad.
export type PlannerContext = { userQuery: string; currentPlan: string[]; chatHistory: string; executionHistory: string; };
export type ExecutorContext = { userQuery: string; task: string; availableTools: string; };
export type ResponderContext = { userQuery: string; chatHistory: string; };
export type ErrorHandlerContext = { userQuery: string; currentPlan: string[]; failedTask: string; errorDetails: string; executionHistory: string; };

export class ContextBuilderService {
    constructor(private toolRegistry: IToolRegistry) { }

    public forPlanner(state: SimplifiedOptimizedGraphState): PlannerContext {
        const { chatHistory, executionHistory } = this.formatMessagesForHistory(state.messages);
        return {
            userQuery: state.userInput,
            currentPlan: state.currentPlan,
            chatHistory,
            executionHistory,
        };
    }

    public forExecutor(state: SimplifiedOptimizedGraphState): ExecutorContext {
        if (!state.currentTask) {
            throw new Error("ContextBuilder: No currentTask found in state for Executor.");
        }
        // Proporcionamos una descripción más rica de las herramientas.
        const availableTools = this.toolRegistry.getAllTools().map(tool =>
            `Tool: ${tool.name}\nDescription: ${tool.description}\nParameters (Zod Schema): ${JSON.stringify(tool.parametersSchema.description || tool.parametersSchema._def, null, 2)}`
        ).join('\n\n---\n\n');

        return {
            userQuery: state.userInput,
            task: state.currentTask,
            availableTools,
        };
    }

    public forResponder(state: SimplifiedOptimizedGraphState): ResponderContext {
        const { chatHistory } = this.formatMessagesForHistory(state.messages, true);
        return {
            userQuery: state.userInput,
            chatHistory,
        };
    }

    public forError(state: SimplifiedOptimizedGraphState): ErrorHandlerContext {
        const { executionHistory } = this.formatMessagesForHistory(state.messages);
        return {
            userQuery: state.userInput,
            currentPlan: state.currentPlan,
            failedTask: state.currentTask || "No specific task was being executed.",
            errorDetails: state.error || "Unknown error.",
            executionHistory,
        };
    }

    /**
     * Formatea el historial de mensajes para los prompts, separando la conversación
     * de los resultados de las herramientas y truncando salidas largas.
     */
    private formatMessagesForHistory(messages: BaseMessage[], includeSystemThoughts = false) {
        const chatHistory: string[] = [];
        const executionHistory: string[] = [];

        for (const msg of messages) {
            if (isHumanMessage(msg)) {
                chatHistory.push(`User: ${msg.content}`);
            } else if (isAIMessage(msg)) {
                // Opcionalmente incluir los "thoughts" del sistema para el prompt final.
                if (includeSystemThoughts || !/^(Planner|Executor) Thought:/.test(msg.content as string)) {
                    chatHistory.push(`Assistant: ${msg.content}`);
                }
            } else if (isToolMessage(msg)) {
                let contentStr = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
                // Truncar salidas de herramientas muy largas para ahorrar tokens.
                if (contentStr.length > 1500) {
                    contentStr = contentStr.substring(0, 1500) + "\n... (output truncated)";
                }
                executionHistory.push(`Tool: ${msg.name}\nResult: ${contentStr}`);
            }
        }

        return {
            chatHistory: chatHistory.join('\n'),
            executionHistory: executionHistory.join('\n\n---\n\n') || "No tools have been executed yet.",
        };
    }
}