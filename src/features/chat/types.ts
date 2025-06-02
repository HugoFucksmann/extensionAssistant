// src/features/chat/types.ts
import { ToolOutput, ToolExecution } from '../tools/types';
import { WindsurfState } from '../../core/types';

export interface HistoryEntry extends Omit<ChatMessage, 'id' | 'sender' | 'timestamp' | 'files'> {
  phase: 'user_input' | 'reasoning' | 'action_planning' | 'action' | 'reflection' | 'correction' | 'responseGeneration' | 'system_message' | 'toolOutputAnalysis';
  iteration?: number;
  content: string;
  timestamp: number;
  metadata: {
    tool_executions?: ToolExecution[];
    processingTime?: number;
    [key: string]: any;
  };
}

export interface ChatMessage {
  id: string;
  operationId?: string;
  content: string;
  sender: 'user' | 'assistant' | 'system';
  timestamp: number;
  files?: string[];
  metadata?: {
    processingTime?: number;
    success?: boolean;
    toolName?: string;
    toolInput?: any;
    toolOutput?: ToolOutput;
    isFinalToolResponse?: boolean;
    status?: 'info' | 'success' | 'error' | 'thinking' | 'tool_executing' | 'user_input_pending' | 'skipped' | 'processing_tool_result' | 'phase_started' | 'phase_completed'; // Added phase statuses
    phase?: string; // Added for agent phase updates
    iteration?: number; // Added for agent phase updates
    source?: string; // Added for agent phase updates
    phaseData?: any; // Added for agent phase updates
    details?: any; // For system errors
    errorObject?: any; // For system errors
    level?: 'info' | 'warning' | 'error'; // For system errors
    rawToolOutput?: any; // From ToolExecutionCompleted
    modelAnalysis?: any; // From ToolExecutionCompleted
    toolSuccess?: boolean; // From ToolExecutionCompleted
    toolError?: string; // From ToolExecutionCompleted
    [key: string]: any;
  };
}

export interface Chat {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  metadata?: {
    windsurfState?: WindsurfState;
    [key: string]: any;
  };
}

export interface ChatHistory {
  chats: Chat[];
  currentChatId?: string;
  metadata?: {
    [key: string]: any;
  };
}