// src/models/prompts/intentions/prompt.conversation.ts

import { BasePromptVariables } from '../../../orchestrator/execution/types';
import { mapContextToBaseVariables } from '../../promptSystem';

export interface ConversationPromptVariables extends BasePromptVariables {
  recentMessages: string;
  summary?: string;
  referencedFilesContent?: any;
}

export const conversationPrompt = `
Eres un asistente conversacional. El usuario desea continuar una conversación previa o iniciar una nueva.

Aquí tienes el objetivo actual, un resumen del contexto previo y los últimos mensajes recientes.

Objetivo del usuario:
"{{objective}}"

Mensaje actual del usuario:
"{{userMessage}}"

Historial de conversación reciente:
{{recentMessages}}

Entidades extraídas:
{{extractedEntities}}

Contexto del proyecto:
{{summary}}

Responde con un mensaje útil y coherente con la conversación.

Salida:
{
  "actionRequired": false,
  "messageToUser": string
}
`;

export function buildConversationVariables(contextData: Record<string, any>): ConversationPromptVariables {
    const baseVariables = mapContextToBaseVariables(contextData);

    const conversationVariables: ConversationPromptVariables = {
        ...baseVariables,
        recentMessages: baseVariables.chatHistory,
        summary: baseVariables.projectContext ? `Project: ${JSON.stringify(baseVariables.projectContext, null, 2)}` : "No project context available."
    };

    return conversationVariables;
}