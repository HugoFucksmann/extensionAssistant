// src/models/prompts/intentions/prompt.conversation.ts

import { BasePromptVariables } from '../../../orchestrator/execution/types';
import { mapContextToBaseVariables } from '../../promptSystem';

export interface ConversationPromptVariables extends BasePromptVariables {
  recentMessagesString: string; // Renamed from recentMessages for clarity
  summary?: string;
  // removed referencedFilesContent as it's not used in this prompt
}

export const conversationPrompt = `
Eres un asistente conversacional. El usuario desea continuar una conversación previa o iniciar una nueva.

Aquí tienes un resumen del contexto previo y los últimos mensajes recientes.

Objetivo del usuario:
"{{objective}}"

Mensaje actual del usuario:
"{{userMessage}}"

Resumen de la conversación:
{{summary}}

Historial de conversación reciente (últimos mensajes):
{{recentMessagesString}}

Entidades extraídas:
{{extractedEntities}}

Contexto del proyecto:
{{projectContext}}

Responde con un mensaje útil y coherente con la conversación.

Salida (JSON):
{
  "actionRequired": false, // Indicates if further steps are needed (usually false for pure conversation)
  "messageToUser": string
}
`;

export function buildConversationVariables(contextData: Record<string, any>): ConversationPromptVariables {
    const baseVariables = mapContextToBaseVariables(contextData); // Provides chatHistoryString

    // Get the full conversation history string
    const fullHistoryString = baseVariables.chatHistory || '';

    // Take only the last few lines/messages for "recentMessagesString"
    const historyLines = fullHistoryString.split('\n').filter(line => line.trim() !== '');
    const recentMessagesLines = historyLines.slice(-8); // Take last 8 lines (approx 4 turns)
    const recentMessagesString = recentMessagesLines.join('\n');

    const conversationVariables: ConversationPromptVariables = {
        ...baseVariables,
        summary: contextData.summary || 'No summary available.', // <-- Get summary from context
        recentMessagesString: recentMessagesString, // <-- Pass only the last few messages
        // projectContext is already included via baseVariables
    };

    return conversationVariables;
}