// src/features/events/eventTypes.ts

/**
 * All supported event types in the system
 */
export enum EventType {
  // Conversation lifecycle
  CONVERSATION_STARTED = 'conversation:started',
  CONVERSATION_ENDED = 'conversation:ended',

  // LLM Interaction Events (NEW)
  LLM_REQUEST_STARTED = 'llm:request:started',
  LLM_REQUEST_COMPLETED = 'llm:request:completed',

  // Agent/ReAct Cycle Events
  AGENT_PHASE_STARTED = 'agent:phase:started', // More generic than specific react phases initially
  AGENT_PHASE_COMPLETED = 'agent:phase:completed',
  // Old ReAct specific events (can be kept or removed if AGENT_PHASE_* is preferred)
  REASONING_STARTED = 'react:reasoning:started',
  REASONING_COMPLETED = 'react:reasoning:completed',
  ACTION_STARTED = 'react:action:started', 
  ACTION_COMPLETED = 'react:action:completed',
  REFLECTION_STARTED = 'react:reflection:started',
  REFLECTION_COMPLETED = 'react:reflection:completed',
  CORRECTION_STARTED = 'react:correction:started',
  CORRECTION_COMPLETED = 'react:correction:completed',
  
  // Tool execution
  TOOL_EXECUTION_STARTED = 'tool:execution:started',
  TOOL_EXECUTION_COMPLETED = 'tool:execution:completed',
  TOOL_EXECUTION_ERROR = 'tool:execution:error',
  // TOOL_EXECUTION_ATTEMPT = 'tool:execution:attempt', // Consider if needed vs. just STARTED

  // Response handling
  RESPONSE_GENERATED = 'response:generated',
  RESPONSE_DELIVERED = 'response:delivered',
  
  // Node execution (for LangGraph or similar)
  NODE_START = 'node:start',
  NODE_COMPLETE = 'node:complete',
  NODE_ERROR = 'node:error',
  
  // System events
  ERROR_OCCURRED = 'error:occurred',
  SYSTEM_INFO = 'system:info',
  SYSTEM_WARNING = 'system:warning',
  SYSTEM_ERROR = 'system:error',

  // UI Interaction events
  USER_INTERACTION_REQUIRED = 'ui:interaction:required',
  USER_INPUT_RECEIVED = 'ui:input:received'
}

/**
* Base interface for all event payloads
*/
export interface BaseEventPayload {
  timestamp?: number; 
  chatId?: string;    
  source?: string;    
  // operationId?: string; // Optional: for correlating events to a specific user operation
}

// ... (ConversationEventPayload, ConversationEndedPayload - keep as is) ...
export interface ConversationEventPayload extends BaseEventPayload {
  userMessage?: string; 
  finalStatus?: 'completed' | 'failed' | 'cancelled';
  duration?: number; 
}
export interface ConversationEndedPayload extends BaseEventPayload {
  reason: 'completed' | 'cleared_by_user' | 'error' | 'max_iterations_reached';
  duration?: number;
}


/**
* LLM Request Payloads (NEW)
*/
export interface LlmRequestStartedPayload extends BaseEventPayload {
  llmRequestType: 'reasoning' | 'responseGeneration' | string; // string for extensibility
  promptLength?: number;
  modelProvider?: string; // e.g., 'gemini', 'ollama'
  modelName?: string;
}

export interface LlmRequestCompletedPayload extends LlmRequestStartedPayload {
  responseLength?: number;
  duration: number; // ms
  success: boolean;
  error?: string;
  // rawPrompt?: string; // Optional for debugging, can be large
  rawResponse?: string; // Optional for debugging, can be large
  tokenUsage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
}

/**
* Agent Phase Event Payload (NEW or Refined ReActEventPayload)
*/
export interface AgentPhaseEventPayload extends BaseEventPayload {
  phase: 'reasoning' | 'action' | 'finalResponseGeneration' | 'reflection' | 'correction' | string; // string for extensibility
  iteration?: number;
  data?: any;       // Relevant data from the phase (e.g., reasoning output, action details)
  duration?: number;  // ms for this phase
  error?: string;     // If the phase failed
}

// ReActEventPayload can be an alias or be replaced by AgentPhaseEventPayload
export type ReActEventPayload = AgentPhaseEventPayload;


// ... (ToolExecutionEventPayload, ResponseEventPayload, NodeEventPayload, ErrorOccurredEventPayload, SystemEventPayload, UserInteractionRequiredPayload, UserInputReceivedPayload - keep as is or ensure they extend BaseEventPayload correctly) ...
export interface ToolExecutionEventPayload extends BaseEventPayload {
  toolName: string; 
  parameters?: Record<string, any>; 
  result?: any;     
  error?: string;     
  duration?: number;  
}
export interface ResponseEventPayload extends BaseEventPayload {
  responseContent: string; 
  isFinal?: boolean;      
  metadata?: Record<string, any>; 
  duration?: number;      
}
export interface NodeEventPayload extends BaseEventPayload {
  nodeType: string;  
  nodeId?: string;    
  input?: any;      
  output?: any;     
  duration?: number;  
  error?: string;     
}
export interface ErrorOccurredEventPayload extends BaseEventPayload {
  errorMessage: string;
  errorStack?: string;
  errorType?: string; 
  details?: Record<string, any>; 
}
export interface SystemEventPayload extends BaseEventPayload {
  message: string;
  level: 'info' | 'warning' | 'error'; 
  details?: Record<string, any>;
  errorObject?: { name?: string; message: string; stack?: string }; 
}
export interface UserInteractionRequiredPayload extends BaseEventPayload {
  interactionType: 'requestInput' | 'confirmation' | 'choiceSelection';
  uiOperationId: string; 
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
  uiOperationId: string; 
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
  | LlmRequestStartedPayload        // <-- ADDED
  | LlmRequestCompletedPayload      // <-- ADDED
  | AgentPhaseEventPayload          // <-- ADDED (or ReActEventPayload if you keep that name)
  | ToolExecutionEventPayload
  | ResponseEventPayload
  | NodeEventPayload
  | ErrorOccurredEventPayload
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