export const ACTIONS = {
  SEND_MESSAGE: 'message:send',
  SET_MODEL: 'model:change',
  LOAD_CHAT: 'chat:load',
  LOAD_HISTORY: 'chat:list:load',
  NEW_CHAT: 'chat:new',
  MESSAGE_PROCESSING: 'message:processing',
  MESSAGE_RECEIVE: 'message:receive'
};

export const MESSAGE_TYPES = {
  ERROR: 'error',
  PROCESSING: 'processing',
  MODEL_CHANGED: 'model:changed',
  CHAT_LOADED: 'chat:loaded',
  HISTORY_LOADED: 'chat:list:loaded',
  CHAT_CREATED: 'chat:created',
  MODEL_INFO: 'model:info',
  ORCHESTRATION_RESULT: 'orchestration-result',
  PROGRESS_UPDATE: 'progress-update',
  ORCHESTRATION_MODE: 'orchestration-mode',
  MESSAGE: 'message' // Para mensajes regulares de chat
};

// Prefijo para comandos de VS Code
export const VS_CODE_PREFIX = 'extensionAssistant.';