// src/models/prompts/intentions/prompt.conversation.ts

import { BasePromptVariables } from '../../../orchestrator/execution/types';
import { mapContextToBaseVariables } from '../../promptSystem'; // Import the helper

// Define variables specific to the conversation prompt
export interface ConversationPromptVariables extends BasePromptVariables {
  // BasePromptVariables already includes: userMessage, chatHistory, objective, extractedEntities, projectContext, fileContent:*, searchResults:*
  // This prompt template uses 'recentMessages' instead of 'chatHistory'. We'll map it in the builder.
  recentMessages: string; // Alias for chatHistory
  summary?: string; // Alias for projectContext summary
  referencedFilesContent?: any; // Placeholder if we decide to aggregate file content here
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

// Builder function for ConversationPromptVariables
export function buildConversationVariables(contextData: Record<string, any>): ConversationPromptVariables {
    // Get base variables using the helper
    const baseVariables = mapContextToBaseVariables(contextData);

    // Map base variables and context data to ConversationPromptVariables structure
    const conversationVariables: ConversationPromptVariables = {
        ...baseVariables, // Include all base variables
        recentMessages: baseVariables.chatHistory, // Map chatHistory to recentMessages
        summary: baseVariables.projectContext ? `Project: ${JSON.stringify(baseVariables.projectContext, null, 2)}` : "No project context available.", // Map projectContext to summary
        // referencedFilesContent: baseVariables.fileContentsByPath // Example if we grouped file contents
    };

    // Clean up undefined values if necessary, though fillPromptTemplate handles null/undefined
    // Object.keys(conversationVariables).forEach(key => conversationVariables[key] === undefined && delete conversationVariables[key]);

    return conversationVariables;
}