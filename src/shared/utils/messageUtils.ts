// src/shared/utils/messageUtils.ts
import { BaseMessage } from "@langchain/core/messages";

/**
 * Deduplicates an array of LangChain messages based on type, content, and name.
 */
export function deduplicateMessages(messages: BaseMessage[]): BaseMessage[] {
    if (!Array.isArray(messages) || messages.length < 2) return messages;
    const seen = new Set<string>();
    const result: BaseMessage[] = [];
    for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        const type = msg._getType ? msg._getType() : 'unknown';
        const name = (msg as any).name || (msg as any).tool_call_id || '';
        const hash = `${type}|${msg.content}|${name}`;
        if (!seen.has(hash)) {
            seen.add(hash);
            result.unshift(msg);
        }
    }
    return result;
}