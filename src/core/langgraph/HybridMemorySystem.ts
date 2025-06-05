// src/core/langgraph/HybridMemorySystem.ts
import { WindsurfState } from '@core/types';
import { MemoryManager, MemoryItem } from '../../features/memory/MemoryManager';
import { ModelManager } from '../../features/ai/ModelManager';
import { BaseMessage, SystemMessage, HumanMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

const CONVERSATION_SUMMARY_PROMPT_TEMPLATE = `
Eres un asistente encargado de resumir conversaciones. Dada la siguiente conversación, extrae los puntos clave, decisiones tomadas, información importante descubierta y el estado actual de la tarea. Sé conciso y objetivo.

CONVERSACIÓN:
{conversation_history}

RESUMEN CONCISO:
`;

export class HybridMemorySystem {
    private modelManager: ModelManager;

    constructor(
        private memoryManager: MemoryManager,
        modelManager: ModelManager
    ) {
        this.modelManager = modelManager;
    }

    async getRelevantContext(
        chatId: string,
        userQuery: string,
        objective?: string,
        currentConversationMessages?: BaseMessage[]
    ): Promise<string> {
        let memoryContext = '';

        // 1. Obtener memorias persistentes
        const relevantPersistentMemories: MemoryItem[] = await this.memoryManager.getRelevantMemories({
            objective: objective || userQuery,
            userMessage: userQuery,
            extractedEntities: { filesMentioned: [], functionsMentioned: [] }
        }, 2);

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

        // 2. Manejar contexto de conversación actual - FIXED
        if (currentConversationMessages && currentConversationMessages.length > 1) {
            // Solo usar los últimos mensajes relevantes, no toda la conversación
            const recentMessages = currentConversationMessages.slice(-6); // Últimos 6 mensajes

            if (recentMessages.length > 2) {
                // Generar contexto de los mensajes recientes
                const recentContext = recentMessages
                    .slice(0, -1) // Excluir el mensaje actual del usuario
                    .map(m => {
                        let prefix = m._getType() === 'human' ? "User" : "Assistant";
                        const messageContent = Array.isArray(m.content)
                            ? m.content.map(part => {
                                if (typeof part === 'string') return part;
                                if ('text' in part) return part.text;
                                if ('image_url' in part) return '[Image]';
                                if ('url' in part) return `[${part.type || 'File'}]`;
                                return '';
                            }).join(' ')
                            : String(m.content);
                        return `${prefix}: ${messageContent.substring(0, 200)}`;
                    })
                    .join('\n');

                if (recentContext.trim()) {
                    memoryContext += 'Recent conversation context:\n';
                    memoryContext += `${recentContext}\n\n`;
                }
            }
        } else {
            // Si no hay conversación previa, usar el objetivo reciente si existe
            const recentObjective = this.memoryManager.getRuntime<string>(chatId, 'lastObjective');
            if (recentObjective && recentObjective !== userQuery) {
                memoryContext += `Previous context: The last objective was "${recentObjective}".\n\n`;
            }
        }

        if (!memoryContext.trim()) {
            return "No specific relevant memories or current session summary found.";
        }

        // Limitar longitud del contexto
        const MAX_CONTEXT_LENGTH = 1500;
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

    // Método simplificado - ya no se usa para contexto principal
    public async generateAndStoreConversationSummary(
        chatId: string,
        messages: BaseMessage[],
        minMessagesToSummarize: number = 3
    ): Promise<string | null> {
        if (messages.length < minMessagesToSummarize) {
            return null;
        }

        // Solo resumir si hay muchos mensajes (>10)
        if (messages.length <= 10) {
            return null;
        }

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
            const model = this.modelManager.getActiveModel();
            const summaryPrompt = ChatPromptTemplate.fromTemplate(CONVERSATION_SUMMARY_PROMPT_TEMPLATE);
            const outputParser = new StringOutputParser();

            const chain = summaryPrompt.pipe(model).pipe(outputParser);

            const summary = await chain.invoke({
                conversation_history: conversationHistoryString
            });

            if (summary && summary.trim()) {
                this.updateWorkingMemory(chatId, 'current_conversation_summary', summary.trim());
                this.updateWorkingMemory(chatId, 'last_summary_message_count', messages.length);
                return summary.trim();
            }
            return null;
        } catch (error: any) {
            console.error(`[HybridMemorySystem] Error generating conversation summary for chat ${chatId}: ${error.message}`);
            return null;
        }
    }
}