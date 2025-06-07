// src/features/chat/types.ts
import { ToolExecution } from '../tools/types';
import { SimplifiedOptimizedGraphState } from '../../core/langgraph/state/GraphState';

// [MIGRACIÓN] El historial ahora refleja las fases reales del motor LangGraph.
// Actualiza cualquier lógica de historial/visualización para consumir GraphPhase.
import { GraphPhase } from '../../core/langgraph/state/GraphState';

export interface HistoryEntry extends Omit<ChatMessage, 'id' | 'sender' | 'timestamp' | 'files'> {
  phase: GraphPhase; // 'ANALYSIS' | 'EXECUTION' | 'VALIDATION' | 'RESPONSE' | 'COMPLETED' | 'ERROR'
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
    toolOutput?: any;
    isFinalToolResponse?: boolean;
    status?: 'info' | 'success' | 'error' | 'thinking' | 'tool_executing' | 'user_input_pending' | 'skipped' | 'processing_tool_result' | 'phase_started' | 'phase_completed'; // Added phase statuses
    phase?: string;
    iteration?: number;
    source?: string;
    phaseData?: any;
    details?: any;
    errorObject?: any;
    level?: 'info' | 'warning' | 'error';
    rawToolOutput?: any;
    modelAnalysis?: any;
    toolSuccess?: boolean;
    toolError?: string;
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
    graphState?: SimplifiedOptimizedGraphState;
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