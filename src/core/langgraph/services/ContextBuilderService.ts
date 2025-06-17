// src/core/langgraph/services/ContextBuilderService.ts
import { BaseMessage, isAIMessage, isHumanMessage, isToolMessage } from "@langchain/core/messages";
import { SimplifiedOptimizedGraphState } from "../state/GraphState";
import { IToolRegistry } from "./interfaces/DependencyInterfaces";

// Tipos para los contextos de salida, para mayor claridad.
export type PlannerContext = { userQuery: string; currentPlan: string[]; chatHistory: string; executionHistory: string; };
export type ExecutorContext = { userQuery: string; task: string; availableTools: string; };
export type ResponderContext = {
    userQuery: string;
    chatHistory: string;
    executionHistory: string;
    workingMemorySnapshot?: string;
};
export type ErrorHandlerContext = { userQuery: string; currentPlan: string[]; failedTask: string; errorDetails: string; executionHistory: string; };

export class ContextBuilderService {
    constructor(private toolRegistry: IToolRegistry) { }

    /**
     * Permite pasar previousSummary, maxMessages y maxToolResults para ventanas dinámicas.
     */
    public forPlanner(
        state: SimplifiedOptimizedGraphState,
        previousSummary?: string,
        maxMessages: number = 10,
        maxToolResults: number = 5
    ): PlannerContext {
        const { chatHistory, executionHistory } = this.formatMessagesForHistory(
            state.messages,
            false,
            maxMessages,
            maxToolResults,
            previousSummary
        );
        return {
            userQuery: state.userInput,
            currentPlan: state.currentPlan,
            chatHistory,
            executionHistory,
        };
    }

    /**
     * Permite pasar previousSummary, maxMessages y maxToolResults para ventanas dinámicas.
     */
    public forExecutor(
        state: SimplifiedOptimizedGraphState,
        previousSummary?: string,
        maxMessages: number = 10,
        maxToolResults: number = 5
    ): ExecutorContext {
        if (!state.currentTask) {
            throw new Error("ContextBuilder: No currentTask found in state for Executor.");
        }
        // Proporcionamos una descripción más rica de las herramientas.
        const availableTools = this.toolRegistry.getAllTools().map(tool =>
            `Tool: ${tool.name}\nDescription: ${tool.description}\nParameters (Zod Schema): ${JSON.stringify(tool.parametersSchema.description || tool.parametersSchema._def, null, 2)}`
        ).join('\n\n---\n\n');

        // Solo para consistencia, aunque normalmente el executor no usa chatHistory.
        this.formatMessagesForHistory(state.messages, false, maxMessages, maxToolResults, previousSummary);

        return {
            userQuery: state.userInput,
            task: state.currentTask,
            availableTools,
        };
    }

    /**
     * Permite pasar previousSummary, maxMessages y maxToolResults para ventanas dinámicas.
     */
    public forResponder(
        state: SimplifiedOptimizedGraphState,
        previousSummary?: string,
        maxMessages: number = 10,
        maxToolResults: number = 5
    ): ResponderContext {
        const { chatHistory, executionHistory } = this.formatMessagesForHistory(
            state.messages,
            true,
            maxMessages,
            maxToolResults,
            previousSummary
        );
        return {
            userQuery: state.userInput || '',
            chatHistory: chatHistory || '',
            executionHistory: executionHistory || '',
            workingMemorySnapshot: state.workingMemory || '',
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
    /**
     * Formatea el historial de mensajes para los prompts, separando la conversación
     * de los resultados de las herramientas y truncando salidas largas.
     * Permite limitar la cantidad de mensajes y herramientas recientes enviados (últimos N),
     * y anteponer un resumen previo si se proporciona.
     */
    private formatMessagesForHistory(
        messages: BaseMessage[],
        includeSystemThoughts = false,
        maxMessages: number = 10,
        maxToolResults: number = 5,
        previousSummary?: string
    ) {
        const chatHistory: string[] = [];
        const executionHistory: string[] = [];

        // Filtra solo los últimos N mensajes
        const recentMessages = messages.slice(-maxMessages);

        for (const msg of recentMessages) {
            if (isHumanMessage(msg)) {
                chatHistory.push(`User: ${msg.content}`);
            } else if (isAIMessage(msg)) {
                // Opcionalmente incluir los "thoughts" del sistema para el prompt final.
                if (includeSystemThoughts || !/^(Planner|Executor) Thought:/.test(msg.content as string)) {
                    chatHistory.push(`Assistant: ${msg.content}`);
                }
            } else if (isToolMessage(msg)) {
                let contentStr = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
                // Si es getFileContents, intenta mostrar el nombre del archivo y los primeros 1000 caracteres del contenido
                if (msg.name === 'getFileContents') {
                    try {
                        const parsed = JSON.parse(contentStr);
                        if (parsed && parsed.filePath && parsed.content) {
                            contentStr = `Archivo: ${parsed.filePath}\nContenido completo:\n${parsed.content}`;
                        }
                    } catch (e) {
                        // Si no es JSON, dejar como está
                    }
                }
                // Ya no truncar salidas de herramientas para getFileContents
                // Para otras tools, puedes dejar el truncamiento si lo deseas
                executionHistory.push(`Tool: ${msg.name}\nResult: ${contentStr}`);
            }
        }

        // Limita solo los últimos N resultados de tools
        const limitedExecutionHistory = executionHistory.slice(-maxToolResults);

        return {
            chatHistory: (previousSummary ? previousSummary + '\n' : '') + chatHistory.join('\n'),
            executionHistory: limitedExecutionHistory.join('\n\n---\n\n') || "No tools have been executed yet.",
        };
    }
}