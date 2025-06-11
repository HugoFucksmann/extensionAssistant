// src/core/langgraph/services/HybridMemoryService.ts
import { BaseMessage } from "@langchain/core/messages";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { IMemoryManager, IMemoryService, IModelManager, StructuredMemoryContext } from "./interfaces/DependencyInterfaces";

const MEMORY_INTEGRATION_PROMPT = `
Eres un asistente de IA que integra nueva información en una memoria de trabajo existente.
Tu objetivo es crear un resumen coherente y actualizado, eliminando redundancias y manteniendo los hechos clave.

MEMORIA DE TRABAJO EXISTENTE:
{existing_memory}

NUEVA INFORMACIÓN A INTEGRAR:
{new_info}

OBJETIVO ACTUAL (si aplica): {objective}

INSTRUCCIONES:
1. Lee la memoria existente y la nueva información.
2. Fusiona ambas, eliminando datos obsoletos o repetidos.
3. El resultado debe ser un resumen conciso y actualizado del estado del conocimiento.
4. Si la memoria existente está vacía, la nueva información es el nuevo resumen.
5. Responde ÚNICAMENTE con el texto del nuevo resumen de memoria. No añadas explicaciones.

NUEVO RESUMEN DE MEMORIA DE TRABAJO:
`;

export class HybridMemoryService implements IMemoryService {
    constructor(
        private memoryManager: IMemoryManager,
        private modelManager: IModelManager
    ) { }

    async getStructuredContext(
        chatId: string,
        query: string,
        objective?: string
    ): Promise<StructuredMemoryContext> {
        const relevantPersistentMemories = await this.memoryManager.getRelevantMemories({
            objective: objective || query,
            userMessage: query,
        }, 3);

        const retrievedKnowledgeChunks = relevantPersistentMemories.map(item =>
            typeof item.content === 'string' ? item.content : JSON.stringify(item.content)
        );

        const workingMemorySnapshot = this.memoryManager.getRuntime<string>(chatId, 'working_memory') || '';

        return {
            workingMemorySnapshot,
            retrievedKnowledgeChunks,
        };
    }

    async updateWorkingMemory(
        chatId: string,
        newInfo: string,
        currentMessages: BaseMessage[],
        objective?: string
    ): Promise<void> {
        const existingMemory = this.memoryManager.getRuntime<string>(chatId, 'working_memory') || '';


        try {
            const model = this.modelManager.getActiveModel();
            const prompt = ChatPromptTemplate.fromTemplate(MEMORY_INTEGRATION_PROMPT);
            const chain = prompt.pipe(model).pipe(new StringOutputParser());

            const updatedMemory = await chain.invoke({
                existing_memory: existingMemory,
                new_info: newInfo,
                objective: objective || "Resolver la consulta del usuario."
            });

            this.memoryManager.setRuntime(chatId, 'working_memory', updatedMemory.trim());
        } catch (error) {
            console.error("[HybridMemoryService] Failed to update working memory with LLM. Falling back to concatenation.", error);

            const fallbackMemory = `${existingMemory}\n- ${new Date().toISOString()}: ${newInfo}`.trim();
            this.memoryManager.setRuntime(chatId, 'working_memory', fallbackMemory);
        }
    }
}