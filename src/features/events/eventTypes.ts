// src/features/events/eventTypes.ts
import { ActionOutput } from '@features/ai/prompts/optimized/actionPrompt';
import { ToolOutput } from '@vscode/webView/utils/toolResponseMapper';


/**
 * All supported event types in the system
 */
export enum EventType {
  // Conversation lifecycle
  CONVERSATION_STARTED = 'conversation:started',
  CONVERSATION_ENDED = 'conversation:ended',

  // LLM Interaction Events
  LLM_REQUEST_STARTED = 'llm:request:started',
  LLM_REQUEST_COMPLETED = 'llm:request:completed',

  // Agent/ReAct Cycle Events
  AGENT_PHASE_STARTED = 'agent:phase:started',
  AGENT_PHASE_COMPLETED = 'agent:phase:completed',

  // Tool execution
  TOOL_EXECUTION_STARTED = 'tool:execution:started',
  TOOL_EXECUTION_COMPLETED = 'tool:execution:completed',
  TOOL_EXECUTION_ERROR = 'tool:execution:error',


  // Response handling
  RESPONSE_GENERATED = 'response:generated',
  RESPONSE_DELIVERED = 'response:delivered',

  // System events
  SYSTEM_INFO = 'system:info',
  SYSTEM_WARNING = 'system:warning',
  SYSTEM_ERROR = 'system:error',

  // UI Interaction events
  USER_INTERACTION_REQUIRED = 'ui:interaction:required',
  USER_INPUT_RECEIVED = 'ui:input:received'
}


export interface BaseEventPayload {
  timestamp?: number;
  chatId?: string;
  source?: string;

  operationId?: string;
}


export interface ConversationEventPayload extends BaseEventPayload {
  userMessage?: string;
  finalStatus?: 'completed' | 'failed' | 'cancelled';
  duration?: number;
}
export interface ConversationEndedPayload extends BaseEventPayload {
  finalStatus: 'completed' | 'cleared_by_user' | 'error' | 'max_iterations_reached' | 'failed' | 'cancelled'; // Added 'failed', 'cancelled' and changed 'reason' to 'finalStatus'
  duration?: number;
}


/**
* LLM Request Payloads
*/
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


export interface AgentPhaseEventPayload extends BaseEventPayload {
  phase: 'reasoning' | 'action' | 'finalResponseGeneration' | 'reflection' | 'correction' | 'toolOutputAnalysis' | 'initialAnalysis' | 'toolExecution' | string; // Added toolOutputAnalysis, initialAnalysis, toolExecution
  iteration?: number;
  data?: any;
  duration?: number;
  error?: string;
}



export interface ToolExecutionEventPayload extends BaseEventPayload {
  toolName: string;
  parameters?: Record<string, any>;
  result?: ToolOutput;
  error?: string;
  duration?: number;
  toolDescription?: string;
  isProcessingStep?: boolean;
  modelAnalysis?: ActionOutput | any;
  rawToolOutput?: any;
  toolSuccess?: boolean;
}


export interface ResponseEventPayload extends BaseEventPayload {
  responseContent: string;
  isFinal?: boolean;
  metadata?: Record<string, any>;
  duration?: number;
}


export interface SystemEventPayload extends BaseEventPayload {
  message: string;
  level: 'info' | 'warning' | 'error';
  details?: Record<string, any>;
  errorObject?: { name?: string; message: string; stack?: string };
}
export interface UserInteractionRequiredPayload extends BaseEventPayload {
  interactionType: 'requestInput' | 'confirmation' | 'choiceSelection';

  promptMessage: string;
  inputType?: 'text' | 'password' | 'number';
  placeholder?: string;
  defaultValue?: string;
  options?: Array<{ label: string; value: any }>;
  confirmButtonText?: string;
  cancelButtonText?: string;
  title?: string;
}
export interface UserInputReceivedPayload extends BaseEventPayload {
  value?: any;
  wasCancelled?: boolean;
}


/**
* Union type for all event payloads
*/
export type EventPayload =
  | BaseEventPayload
  | ConversationEventPayload
  | ConversationEndedPayload
  | LlmRequestStartedPayload
  | LlmRequestCompletedPayload
  | AgentPhaseEventPayload
  | ToolExecutionEventPayload
  | ResponseEventPayload
  | SystemEventPayload
  | UserInteractionRequiredPayload
  | UserInputReceivedPayload;

/**
* Complete event structure
*/
export interface WindsurfEvent {
  type: EventType;
  payload: EventPayload;
  timestamp: number;
  id: string;
}

/**
* Event filter interface
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