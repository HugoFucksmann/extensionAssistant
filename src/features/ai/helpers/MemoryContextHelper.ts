// src/core/helpers/MemoryContextHelper.ts

import { WindsurfState } from "@core/types";
import { MemoryManager } from "@features/memory/MemoryManager";

export class MemoryContextHelper {
    constructor(private memoryManager: MemoryManager) { }

    async getMemoryContext(chatId: string, userMessage: string): Promise<string> {
        // Get relevant memories from persistent storage
        const relevantMemories = await this.memoryManager.getRelevantMemories({
            objective: userMessage,
            userMessage,
            // Assuming extractedEntities might not always be available or needed for this basic context
            extractedEntities: { filesMentioned: [], functionsMentioned: [] }
        }, 5);

        // Get recent conversation context from runtime
        const recentState = this.memoryManager.getRuntime<WindsurfState>(chatId, 'lastState');
        const recentObjective = this.memoryManager.getRuntime<string>(chatId, 'lastObjective');

        let memoryContext = '';

        if (relevantMemories.length > 0) {
            memoryContext += 'Relevant past experiences:\n';
            memoryContext += relevantMemories
                .map(item => `- ${typeof item.content === 'string' ? item.content : JSON.stringify(item.content)}`)
                .join('\n');
            memoryContext += '\n\n';
        }

        if (recentState && recentObjective) {
            memoryContext += `Recent context: Last objective was "${recentObjective}"\n`;
            // Optionally, add more details from recentState if needed, e.g., last few history entries
        }

        return memoryContext.trim();
    }
}