// src/models/prompts/intentions/prompt.conversation.ts
// MODIFIED: Use ChatPromptTemplate

import { ChatPromptTemplate } from "@langchain/core/prompts";
import { BasePromptVariables } from "../../../orchestrator/types";
import { mapContextToBaseVariables } from "../builders/baseVariables";


// Keep interface for variable structure
export interface ConversationPromptVariables extends BasePromptVariables {
  recentMessages: string; // Redundant with chatHistory but explicit
  summary?: string; // Redundant with projectContext/summary but explicit
  // referencedFilesContent?: any; // Removed - redundant, handled by dynamic placeholders
}

// Define the prompt template using LangChain
export const conversationPrompt = ChatPromptTemplate.fromMessages([
    ["system", `Eres un asistente conversacional. El usuario desea continuar una conversación previa o iniciar una nueva. Responde en español.

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
    {{projectContext}}
    {{summary}}

    Código y Archivos Referenciados:
    {{activeEditorContent}}
    {{fileContent:.*}}
    {{searchResults:.*}}


    Responde con un mensaje útil y coherente con la conversación.

    Salida esperada:
    {
      "messageToUser": string
    }`], // Simplified output structure based on Planner
     ["human", "{{userMessage}}"] // User's actual message
]);

// Keep builder function
export function buildConversationVariables(contextData: Record<string, any>): ConversationPromptVariables {
     const baseVariables = mapContextToBaseVariables(contextData);

     const conversationVariables: ConversationPromptVariables = {
         ...baseVariables,
         recentMessages: baseVariables.chatHistory, // Map chatHistory to recentMessages
         summary: baseVariables.projectContext ? `Project: ${JSON.stringify(baseVariables.projectContext, null, 2)}` : "No project context available." // Map project context to summary
     };

     return conversationVariables;
}