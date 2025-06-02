// src/core/types.ts
import { ChatMessage } from '../features/chat/types';
import { ToolOutput, ToolExecution } from '../features/tools/types';


export interface WindsurfState {
  objective: string;
  userMessage: string;
  chatId: string;
  iterationCount: number;
  maxIterations: number;
  completionStatus: 'in_progress' | 'completed' | 'failed';
  error?: string;
  reasoningResult?: ReasoningResult;
  actionResult?: ActionResult;
  reflectionResult?: ReflectionResult;
  correctionResult?: CorrectionResult;
  history: HistoryEntry[];
  projectContext?: any;
  editorContext?: any;
  finalOutput?: any;
  timestamp?: number; // Added from ConversationManager logic
  _executedTools?: Set<string>; // Added from OptimizedReActEngine logic
  [key: string]: any;
}

export interface ReasoningResult {
  reasoning: string;
  plan: PlanStep[];
  nextAction: NextAction;
}

export interface PlanStep {
  id: string;
  stepDescription: string;
  toolToUse?: string;
  expectedOutcome: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  resultSummary?: string;
  startTime?: number;
  endTime?: number;
}

export interface NextAction {
  toolName: string;
  params: Record<string, any>;
  thought?: string;
}

export interface ActionResult {
  toolName: string;
  params: Record<string, any>;
  success: boolean;
  result?: any; // This is raw result from tool, history will store ToolOutput
  error?: string;
  timestamp: number;
}

export interface ReflectionResult {
  reflection: string;
  isSuccessfulSoFar: boolean;
  confidence?: number; // 0-1
  needsCorrection: boolean;
  correctionSuggestion?: string;
}

export interface CorrectionResult {
  correctionDescription: string;
  updatedPlan?: PlanStep[];
  nextActionAfterCorrection?: NextAction;
}

export interface HistoryEntry extends Omit<ChatMessage, 'id' | 'sender' | 'timestamp' | 'files'> {
  phase: 'user_input' | 'reasoning' | 'action_planning' | 'action' | 'reflection' | 'correction' | 'responseGeneration' | 'system_message' | 'toolOutputAnalysis';
  iteration?: number;
  content: string;
  timestamp: number;
  metadata: {
    tool_executions?: ToolExecution[];
    processingTime?: number;
    status?: 'success' | 'error' | 'skipped';
    error_message?: string;
    // For toolOutputAnalysis phase
    toolName?: string;
    toolOutput?: ToolOutput;
    modelDecision?: any;
    // For OptimizedReActEngine history entries
    phase_details?: string;
    [key: string]: any;
  };
}

export interface ProcessingStatus {
  phase: string;
  status: 'active' | 'completed' | 'inactive' | 'error';
  startTime?: number;
  endTime?: number;
  tools?: ToolExecution[];
  error?: string;
}