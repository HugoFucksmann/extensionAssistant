// src/core/langgraph/HybridMemorySystem.ts
import { WindsurfState } from '@core/types';
import { MemoryManager, MemoryItem } from '../../features/memory/MemoryManager';
import { ModelManager } from '../../features/ai/ModelManager'; // NUEVA DEPENDENCIA
import { BaseMessage, SystemMessage, HumanMessage } from '@langchain/core/messages'; // Para formatear el prompt de resumen
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

const CONVERSATION_SUMMARY_PROMPT_TEMPLATE = `
Eres un asistente encargado de resumir conversaciones. Dada la siguiente conversación, extrae los puntos clave, decisiones tomadas, información importante descubierta y el estado actual de la tarea. Sé conciso y objetivo.

CONVERSACIÓN:
{conversation_history}

RESUMEN CONCISO:
`;

export class HybridMemorySystem {
    private modelManager: ModelManager; // NUEVA PROPIEDAD

    constructor(
        private memoryManager: MemoryManager,
        modelManager: ModelManager // INYECTAR ModelManager
    ) {
        this.modelManager = modelManager;
    }

    async getRelevantContext(
        chatId: string,
        userQuery: string,
        objective?: string,
        currentConversationMessages?: BaseMessage[] // NUEVO: Mensajes de la conversación actual para resumen
    ): Promise<string> {
        let memoryContext = '';

        // 1. Obtener memorias persistentes (como antes)
        const relevantPersistentMemories: MemoryItem[] = await this.memoryManager.getRelevantMemories({
            objective: objective || userQuery,
            userMessage: userQuery,
            extractedEntities: { filesMentioned: [], functionsMentioned: [] }
        }, 2); // Reducir un poco para dar espacio al resumen

        if (relevantPersistentMemories.length > 0) {
            memoryContext += 'Relevant past experiences or information (from knowledge base):\n';
            memoryContext += relevantPersistentMemories
                .map(item => {
                    const content = typeof item.content === 'string'
                        ? item.content
                        : JSON.stringify(item.content);
                    return `- ${content.substring(0, 150)}${content.length > 150 ? '...' : ''}`;
                })
                .join('\n');
            memoryContext += '\n\n';
        }

        // 2. Obtener/Generar resumen de la conversación actual (memoria de trabajo)
        let conversationSummary: string | null = null;
        if (currentConversationMessages && currentConversationMessages.length > 0) {
            // Intentar obtener un resumen previamente almacenado para esta sesión
            conversationSummary = this.getWorkingMemory(chatId, 'current_conversation_summary') as string | null;

            // Si no hay resumen o la conversación ha avanzado significativamente, regenerar
            // (Aquí una lógica simple: regenerar si hay más de X nuevos mensajes desde el último resumen)
            // Para una lógica más avanzada, se podría comparar el hash de los mensajes.
            const lastSummaryMessageCount = this.getWorkingMemory(chatId, 'last_summary_message_count') as number || 0;
            if (!conversationSummary || (currentConversationMessages.length - lastSummaryMessageCount > 3)) { // Regenerar si hay >3 mensajes nuevos
                conversationSummary = await this.generateAndStoreConversationSummary(chatId, currentConversationMessages);
            }
        }

        if (conversationSummary) {
            memoryContext += 'Summary of the current conversation:\n';
            memoryContext += `${conversationSummary}\n\n`;
        } else {
            // Si no hay resumen, usar el objetivo más reciente de la sesión si existe
            const recentObjective = this.memoryManager.getRuntime<string>(chatId, 'lastObjective');
            if (recentObjective) {
                memoryContext += `Context from the current session: The last objective was "${recentObjective}".\n\n`;
            }
        }

        if (!memoryContext.trim()) {
            return "No specific relevant memories or current session summary found.";
        }

        // Asegurar que el contexto no sea demasiado largo
        const MAX_CONTEXT_LENGTH = 1500; // Ajustar según sea necesario
        if (memoryContext.length > MAX_CONTEXT_LENGTH) {
            memoryContext = memoryContext.substring(0, MAX_CONTEXT_LENGTH) + "... (context truncated)";
        }

        return memoryContext.trim();
    }

    public updateWorkingMemory(chatId: string, key: string, value: any): void {
        this.memoryManager.setRuntime(chatId, `langGraphWorking_${key}`, value);
    }

    public getWorkingMemory(chatId: string, key: string): any | undefined {
        return this.memoryManager.getRuntime(chatId, `langGraphWorking_${key}`);
    }

    public async generateAndStoreConversationSummary(
        chatId: string,
        messages: BaseMessage[],
        minMessagesToSummarize: number = 3 // No resumir si es muy corto
    ): Promise<string | null> {
        if (messages.length < minMessagesToSummarize) {
            // Si la conversación es muy corta, quizás el último mensaje del usuario o IA es suficiente
            const lastMessage = messages[messages.length - 1];
            if (lastMessage) {
                const messageContent = Array.isArray(lastMessage.content)
                    ? lastMessage.content.map(part => {
                        if (typeof part === 'string') return part;
                        if ('text' in part) return part.text;
                        if ('image_url' in part) return '[Image]'; // Handle image URLs
                        if ('url' in part) return `[${part.type || 'File'}]`; // Handle other URL types
                        return '';
                    }).join(' ')
                    : String(lastMessage.content);
                const shortSummary = `Current focus: ${messageContent.substring(0, 100)}...`;
                this.updateWorkingMemory(chatId, 'current_conversation_summary', shortSummary);
                this.updateWorkingMemory(chatId, 'last_summary_message_count', messages.length);
                return shortSummary;
            }
            return null;
        }

        // Formatear el historial para el prompt de resumen
        const conversationHistoryString = messages
            .map(m => {
                let prefix = m._getType().toUpperCase();
                if (m._getType() === 'human') prefix = "User";
                if (m._getType() === 'ai') prefix = "Assistant";
                if (m._getType() === 'tool') prefix = `Tool (${(m as any).name || 'unknown'})`;
                return `${prefix}: ${m.content}`;
            })
            .join('\n');

        try {
            const model = this.modelManager.getActiveModel(); // Usar el modelo activo
            const summaryPrompt = ChatPromptTemplate.fromTemplate(CONVERSATION_SUMMARY_PROMPT_TEMPLATE);
            const outputParser = new StringOutputParser();

            const chain = summaryPrompt.pipe(model).pipe(outputParser);

            const summary = await chain.invoke({
                conversation_history: conversationHistoryString
            });

            if (summary && summary.trim()) {
                this.updateWorkingMemory(chatId, 'current_conversation_summary', summary.trim());
                this.updateWorkingMemory(chatId, 'last_summary_message_count', messages.length); // Guardar con cuántos mensajes se generó
                return summary.trim();
            }
            return null;
        } catch (error: any) {
            console.error(`[HybridMemorySystem] Error generating conversation summary for chat ${chatId}: ${error.message}`);
            // No almacenar un resumen fallido
            this.updateWorkingMemory(chatId, 'current_conversation_summary', null);
            return null;
        }
    }
}