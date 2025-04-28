export const AppCommands = {
    // Comandos de chat
    CHAT_NEW: 'chat:new',
    CHAT_LOAD: 'chat:load',
    CHAT_LOADED: 'chat:loaded',
    CHAT_LIST_LOAD: 'chat:list:load',
    CHAT_LIST_LOADED: 'chat:list:loaded',
    CHAT_OPEN: 'chat:open',
    
    // Comandos de mensaje
    MESSAGE_SEND: 'message:send',
    MESSAGE_RECEIVE: 'message:receive',
    MESSAGE_PROCESSING: 'message:processing',
    MESSAGE_TEST: 'message:test',
    
    // Comandos de modelo
    MODEL_CHANGE: 'model:change',
    MODEL_CHANGED: 'model:changed',
    
    // Comandos de memoria
    MEMORY_STORE: 'memory:store',
    MEMORY_GET: 'memory:get',
    
    // Comandos de proyecto
    PROJECT_FILES_GET: 'project:files:get',
    
    // Otros
    ERROR: 'error',
    CONFIG_CHANGED: 'config:changed'
};

// Prefijo para comandos de VS Code
export const VS_CODE_PREFIX = 'extensionAssistant.';