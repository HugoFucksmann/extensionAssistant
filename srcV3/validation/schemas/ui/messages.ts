// src/validation/schemas/ui/messages.ts

import { z } from 'zod';

// Base schema for a message coming from the webview
const BaseWebviewMessageSchema = z.object({
    type: z.string(), // Type of the message (e.g., 'chat', 'command')
    payload: z.any().optional(), // The message payload, schema defined per type
});

// Schema for a 'chat' message payload
export const ChatMessageInputPayloadSchema = z.object({
    text: z.string().min(1, "Message text cannot be empty"),
    files: z.array(z.string()).optional().default([]),
});

// Schema for a general 'command' message payload
export const CommandMessageInputPayloadSchema = z.object({
    command: z.string().min(1, "Command name cannot be empty"),
    // Additional parameters depend on the specific command
    params: z.record(z.any()).optional().default({}),
});

// Define schemas for specific command payloads if they have required params
export const LoadChatCommandPayloadSchema = CommandMessageInputPayloadSchema.extend({
    command: z.literal('loadChat'),
    params: z.object({
        chatId: z.string().min(1, "chatId is required for loadChat command"),
    }),
});

export const UpdateChatTitleCommandPayloadSchema = CommandMessageInputPayloadSchema.extend({
     command: z.literal('updateChatTitle'),
     params: z.object({
         chatId: z.string().min(1, "chatId is required for updateChatTitle command"),
         title: z.string().min(1, "title is required for updateChatTitle command"),
     }),
});

export const DeleteChatCommandPayloadSchema = CommandMessageInputPayloadSchema.extend({
    command: z.literal('deleteChat'),
    params: z.object({
        chatId: z.string().min(1, "chatId is required for deleteChat command"),
    }),
});

export const SwitchModelCommandPayloadSchema = CommandMessageInputPayloadSchema.extend({
    command: z.literal('switchModel'),
    params: z.object({
        modelType: z.union([z.literal('ollama'), z.literal('gemini')]), // Assuming these are the only valid model types
    }),
});

export const GetFileContentsCommandPayloadSchema = CommandMessageInputPayloadSchema.extend({
     command: z.literal('getFileContents'),
     params: z.object({
         filePath: z.string().min(1, "filePath is required for getFileContents command"),
     }),
});


// Union schema for all expected messages from webview
export const WebviewMessageSchema = z.discriminatedUnion('type', [
    BaseWebviewMessageSchema.extend({
        type: z.literal('chat'),
        payload: ChatMessageInputPayloadSchema,
    }),
    BaseWebviewMessageSchema.extend({
        type: z.literal('command'),
        // Further discriminate commands if needed, or validate specific commands within UIBridge
        // For now, validate general command structure
        payload: CommandMessageInputPayloadSchema,
    }),
    // Add other message types if necessary
]);

// Helper type for incoming messages
export type WebviewMessage = z.infer<typeof WebviewMessageSchema>;
export type ChatMessageInputPayload = z.infer<typeof ChatMessageInputPayloadSchema>;
export type CommandMessageInputPayload = z.infer<typeof CommandMessageInputPayloadSchema>;
export type LoadChatCommandPayload = z.infer<typeof LoadChatCommandPayloadSchema>;
export type UpdateChatTitleCommandPayload = z.infer<typeof UpdateChatTitleCommandPayloadSchema>;
export type DeleteChatCommandPayload = z.infer<typeof DeleteChatCommandPayloadSchema>;
export type SwitchModelCommandPayload = z.infer<typeof SwitchModelCommandPayloadSchema>;
export type GetFileContentsCommandPayload = z.infer<typeof GetFileContentsCommandPayloadSchema>;


// --- Schemas for messages sent *to* the webview ---
// (These are used by UIBridge when emitting events, not for validation of incoming)

export const UIUpdateMessagePayloadSchema = z.object({
     type: z.string(), // Type of UI update (e.g., 'chatResponse', 'chatListUpdated', 'modelChanged')
     payload: z.any(), // The data for the UI update
});

export type UIUpdateMessagePayload = z.infer<typeof UIUpdateMessagePayloadSchema>;