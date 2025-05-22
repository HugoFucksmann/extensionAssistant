/**
 * Unified event types for the Windsurf architecture
 * Single source of truth for all event definitions
 */

/**
 * All supported event types in the system
 */
export enum EventType {
    // Conversation lifecycle
    CONVERSATION_STARTED = 'conversation:started',
    CONVERSATION_ENDED = 'conversation:ended',
    
    // ReAct cycle events
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
    
    // Response handling
    RESPONSE_GENERATED = 'response:generated',
    RESPONSE_DELIVERED = 'response:delivered',
    
    // Node execution
    NODE_START = 'node:start',
    NODE_COMPLETE = 'node:complete',
    NODE_ERROR = 'node:error',
    
    // System events
    ERROR_OCCURRED = 'error:occurred',
    SYSTEM_INFO = 'system:info',
    SYSTEM_WARNING = 'system:warning',
    SYSTEM_ERROR = 'system:error'
  }
  
  /**
   * Base interface for all event payloads
   */
  export interface BaseEventPayload {
    timestamp?: number;
    chatId?: string;
    source?: string;
  }
  
  /**
   * Conversation event payload
   */
  export interface ConversationEventPayload extends BaseEventPayload {
    userMessage?: string;
    response?: string;
    success?: boolean;
    duration?: number;
  }
  
  /**
   * ReAct phase event payload
   */
  export interface ReActEventPayload extends BaseEventPayload {
    phase?: string;
    nodeType?: string;
    result?: any;
    duration?: number;
  }
  
  /**
   * Tool execution event payload
   */
  export interface ToolExecutionEventPayload extends BaseEventPayload {
    tool?: string;
    parameters?: Record<string, any>;
    result?: any;
    error?: string;
    duration?: number;
  }
  
  /**
   * Response event payload
   */
  export interface ResponseEventPayload extends BaseEventPayload {
    response?: string;
    success?: boolean;
    duration?: number;
    metadata?: Record<string, any>;
  }
  
  /**
   * Node execution event payload
   */
  export interface NodeEventPayload extends BaseEventPayload {
    nodeType?: string;
    state?: any;
    duration?: number;
    error?: Error;
  }
  
  /**
   * Error event payload
   */
  export interface ErrorEventPayload extends BaseEventPayload {
    error?: string;
    stack?: string;
    message?: string;
  }
  
  /**
   * System event payload
   */
  export interface SystemEventPayload extends BaseEventPayload {
    message?: string;
    details?: Record<string, any>;
    error?: Error;
    level?: 'info' | 'warning' | 'error';
  }
  
  /**
   * Conversation ended event payload
   */
  export interface ConversationEndedPayload extends BaseEventPayload {
    cleared: boolean;
  }
  
  /**
   * Union type for all event payloads
   */
  export type EventPayload = 
    | BaseEventPayload
    | ConversationEventPayload
    | ReActEventPayload
    | ToolExecutionEventPayload
    | ResponseEventPayload
    | NodeEventPayload
    | ErrorEventPayload
    | SystemEventPayload
    | ConversationEndedPayload;
  
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
    timeRange?: {
      start?: number;
      end?: number;
    };
    custom?: (event: WindsurfEvent) => boolean;
  }