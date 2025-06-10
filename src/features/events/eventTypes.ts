// src/features/events/eventTypes.ts

/**
 * Enum for all possible event types in the system.
 * Follows a 'domain:action:status' naming convention where applicable.
 */
export enum EventType {
  // == CONVERSATION LIFECYCLE ==
  CONVERSATION_STARTED = 'conversation:started',
  CONVERSATION_ENDED = 'conversation:ended',

  // == CONVERSATION TURN (User Query -> Final Response) ==
  CONVERSATION_TURN_STARTED = 'conversation:turn:started',
  CONVERSATION_TURN_COMPLETED = 'conversation:turn:completed',

  // == TASK EXECUTION (Core logic processing) ==
  TASK_EXECUTION_STARTED = 'task:execution:started',
  EXECUTION_MODE_CHANGED = 'task:execution:mode_changed',

  // == AGENT/PLANNER PHASES (For complex modes) ==
  AGENT_PHASE_STARTED = 'agent:phase:started',
  AGENT_PHASE_COMPLETED = 'agent:phase:completed',

  // == TOOL EXECUTION ==
  TOOL_EXECUTION_STARTED = 'tool:execution:started',
  TOOL_EXECUTION_COMPLETED = 'tool:execution:completed',
  TOOL_EXECUTION_ERROR = 'tool:execution:error',

  // == LLM INTERACTION ==
  LLM_REQUEST_STARTED = 'llm:request:started',
  LLM_REQUEST_COMPLETED = 'llm:request:completed',

  // == RESPONSE HANDLING ==
  RESPONSE_GENERATED = 'response:generated',

  // == SYSTEM & UI ==
  SYSTEM_INFO = 'system:info',
  SYSTEM_WARNING = 'system:warning',
  SYSTEM_ERROR = 'system:error',
  USER_INTERACTION_REQUIRED = 'ui:interaction:required',
  USER_INPUT_RECEIVED = 'ui:input:received',
}


// =================================================================
// BASE PAYLOADS
// =================================================================

export interface BaseEventPayload {
  timestamp: number;
  chatId?: string;
  source?: string;
  operationId?: string;
}

// =================================================================
// PAYLOAD DEFINITIONS
// =================================================================

// -- Conversation Payloads --

export interface ConversationStartedPayload extends BaseEventPayload {
  chatId: string;
  userMessage: string;
}

export interface ConversationEndedPayload extends BaseEventPayload {
  chatId: string;
  finalStatus: 'completed' | 'cleared_by_user' | 'error' | 'max_iterations_reached' | 'failed' | 'cancelled';
  duration?: number;
}

export interface ConversationTurnStartedPayload extends BaseEventPayload {
  chatId: string;
  userMessage: string;
  executionMode: string;
}

export interface ConversationTurnCompletedPayload extends BaseEventPayload {
  chatId: string;
  success: boolean;
  executionTime: number;
  mode: string;
  error?: string;
}

// -- Task & Execution Payloads --

export interface TaskExecutionStartedPayload extends BaseEventPayload {
  chatId: string;
  query: string;
  mode: string;
}

export interface ExecutionModeChangedPayload extends BaseEventPayload {
  mode: string;
}

// -- Agent/Planner Payloads --

export interface AgentPhaseStartedPayload extends BaseEventPayload {
  phase: string; // e.g., 'planning', 'reasoning', 'reflection'
  iteration?: number;
  data?: any;
}

export interface AgentPhaseCompletedPayload extends AgentPhaseStartedPayload {
  duration: number;
  error?: string;
}

// -- Tool Payloads --

export interface ToolExecutionStartedPayload extends BaseEventPayload {
  toolName: string;
  parameters: any;
  toolDescription: string;
  chatId?: string;
  operationId: string;
}

export interface ToolExecutionCompletedPayload extends BaseEventPayload {
  toolName: string;
  parameters: any;
  operationId: string;
  duration: number;
  toolSuccess: true;
  rawOutput: any;
}

export interface ToolExecutionErrorPayload extends BaseEventPayload {
  toolName: string;
  parameters: any;
  operationId: string;
  duration: number;
  toolSuccess: false;
  error: string;
}

// -- LLM Payloads --

export interface LlmRequestStartedPayload extends BaseEventPayload {
  llmRequestType: 'reasoning' | 'responseGeneration' | string;
  promptLength?: number;
  modelProvider?: string;
  modelName?: string;
}

export interface LlmRequestCompletedPayload extends LlmRequestStartedPayload {
  responseLength?: number;
  duration: number;
  success: boolean;
  error?: string;
  rawResponse?: string;
  tokenUsage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
}

// -- Response Payloads --

export interface ResponseGeneratedPayload extends BaseEventPayload {
  chatId: string;
  response: string;
  executionTime: number;
  mode: string;
  metadata?: Record<string, any>;
}

// -- System & UI Payloads --

export interface SystemEventPayload extends BaseEventPayload {
  message: string;
  level: 'info' | 'warning' | 'error';
  details?: Record<string, any>;
  error?: string; // Simplified from errorObject
  errorObject?: Error;
}

export interface UserInteractionRequiredPayload extends BaseEventPayload {
  interactionType: 'requestInput' | 'confirmation' | 'choiceSelection';
  promptMessage: string;
  options?: Array<{ label: string; value: any }>;
  title?: string;
}

export interface UserInputReceivedPayload extends BaseEventPayload {
  value?: any;
  wasCancelled?: boolean;
}


// =================================================================
// TYPE UNIONS
// =================================================================

/**
 * Union type for all possible event payloads.
 */
export type EventPayload =
  | ConversationStartedPayload
  | ConversationEndedPayload
  | ConversationTurnStartedPayload
  | ConversationTurnCompletedPayload
  | TaskExecutionStartedPayload
  | ExecutionModeChangedPayload
  | AgentPhaseStartedPayload
  | AgentPhaseCompletedPayload
  | ToolExecutionStartedPayload
  | ToolExecutionCompletedPayload
  | ToolExecutionErrorPayload
  | LlmRequestStartedPayload
  | LlmRequestCompletedPayload
  | ResponseGeneratedPayload
  | SystemEventPayload
  | UserInteractionRequiredPayload
  | UserInputReceivedPayload;

/**
 * The complete, structured event object that is dispatched and subscribed to.
 */
export interface WindsurfEvent {
  type: EventType;
  payload: EventPayload;
  timestamp: number;
  id: string;
}

/**
 * Interface for filtering events from the event history or subscriptions.
 */
export interface EventFilter {
  types?: EventType[];
  chatId?: string;
  source?: string;
  timeRange?: {
    start?: number;
    end?: number;
  };
  custom?: (event: WindsurfEvent) => boolean;
}