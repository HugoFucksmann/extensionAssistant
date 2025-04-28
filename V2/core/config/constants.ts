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
    
    // Comandos de planificación y orquestación
    PLAN_CREATE: 'plan:create',
    PLAN_EXECUTE: 'plan:execute',
    PLAN_PAUSE: 'plan:pause',
    PLAN_RESUME: 'plan:resume',
    PLAN_CANCEL: 'plan:cancel',
    PLAN_STATUS_GET: 'plan:status:get',
    
    // Eventos de plan
    PLAN_CREATED: 'plan:created',
    PLAN_UPDATED: 'plan:updated',
    PLAN_COMPLETED: 'plan:completed',
    PLAN_FAILED: 'plan:failed',
    
    // Eventos de pasos de plan
    STEP_STARTED: 'step:started',
    STEP_UPDATED: 'step:updated',
    STEP_COMPLETED: 'step:completed',
    STEP_FAILED: 'step:failed',
    STEP_SKIPPED: 'step:skipped',
    
    // Comandos de herramientas
    TOOL_EXECUTE: 'tool:execute',
    TOOL_LIST: 'tool:list',
    
    // Otros
    ERROR: 'error',
    CONFIG_CHANGED: 'config:changed'
};

// Prefijo para comandos de VS Code
export const VS_CODE_PREFIX = 'extensionAssistant.';

// Tipos de análisis de entrada
export const InputAnalysisTypes = {
    DIRECT_ACTION: 'DIRECT_ACTION',
    PLANNING_NEEDED: 'PLANNING_NEEDED',
    CLARIFICATION_NEEDED: 'CLARIFICATION_NEEDED',
    UNKNOWN: 'UNKNOWN'
};

// Estados de plan
export const PlanStatus = {
    PENDING: 'pending',
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
    NEEDS_REFINEMENT: 'needs_refinement'
};

// Estados de paso
export const StepStatus = {
    PENDING: 'pending',
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
    SKIPPED: 'skipped',
    NEEDS_CORRECTION: 'needs_correction'
};