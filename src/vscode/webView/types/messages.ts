// src/vscode/webView/types/messages.ts
export interface BaseMessage {
    type: string;
    payload?: any;
}

// UI -> Extension messages
export interface UIReadyMessage extends BaseMessage {
    type: 'uiReady';
}

export interface UserMessageSentMessage extends BaseMessage {
    type: 'userMessageSent';
    payload: {
        text: string;
        files?: string[];
    };
}

export interface SwitchModelMessage extends BaseMessage {
    type: 'switchModel';
    payload: {
        modelType: string;
    };
}

export interface NewChatRequestMessage extends BaseMessage {
    type: 'newChatRequestedByUI';
}

export interface CommandMessage extends BaseMessage {
    type: 'command';
    payload: {
        command: string;
        [key: string]: any;
    };
}

// Extension -> UI messages
export interface SessionReadyMessage extends BaseMessage {
    type: 'sessionReady';
    payload: {
        chatId: string;
        messages: any[];
    };
}

export interface AgentActionUpdateMessage extends BaseMessage {
    type: 'agentActionUpdate';
    payload: any; // ChatMessage
}

export interface AssistantResponseMessage extends BaseMessage {
    type: 'assistantResponse';
    payload: any; // ChatMessage
}

export interface AgentPhaseUpdateMessage extends BaseMessage {
    type: 'agentPhaseUpdate';
    payload: any; // ChatMessage
}

export interface SystemErrorMessage extends BaseMessage {
    type: 'systemError';
    payload: any; // ChatMessage
}

export interface NewChatStartedMessage extends BaseMessage {
    type: 'newChatStarted';
    payload: {
        chatId: string;
        activeChatId: string | null;
    };
}

export interface ModelSwitchedMessage extends BaseMessage {
    type: 'modelSwitched';
    payload: {
        modelType: string;
    };
}

export interface ProjectFilesMessage extends BaseMessage {
    type: 'projectFiles';
    payload: {
        files: string[];
    };
}

export interface ShowHistoryMessage extends BaseMessage {
    type: 'showHistory';
    payload: Record<string, any>;
}

// Union types for type safety
export type UIToExtensionMessage =
    | UIReadyMessage
    | UserMessageSentMessage
    | SwitchModelMessage
    | NewChatRequestMessage
    | CommandMessage;

export type ExtensionToUIMessage =
    | SessionReadyMessage
    | AgentActionUpdateMessage
    | AssistantResponseMessage
    | AgentPhaseUpdateMessage
    | SystemErrorMessage
    | NewChatStartedMessage
    | ModelSwitchedMessage
    | ProjectFilesMessage
    | ShowHistoryMessage;