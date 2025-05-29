// src/shared/types.ts
import * as vscode from 'vscode';

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
  [key: string]: any;
}


export interface ChatMessage {
  id: string;
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
 
    status?: 'info' | 'success' | 'error' | 'thinking' | 'tool_executing' | 'user_input_pending' | 'skipped';
    [key: string]: any;
  };
}


export interface ToolExecution { 
  name: string;
  status: 'started' | 'completed' | 'error' | 'permission_denied';
  parameters?: Record<string, any>;
  result?: any;
  error?: string;
  startTime?: number;
  endTime?: number;
  duration?: number;
}

export interface ProcessingStatus {
  phase: string; 
  status: 'active' | 'completed' | 'inactive' | 'error';
  startTime?: number;
  endTime?: number;
  tools?: ToolExecution[]; 

  error?: string;
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
  result?: any; 
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



export interface Insight {
  id: string;
  type: 'observation' | 'learning' | 'warning' | 'suggestion';
  content: string;
  timestamp: number;
  context?: Record<string, any>;
}


export interface CorrectionResult {
  correctionDescription: string; 
  updatedPlan?: PlanStep[]; 
  nextActionAfterCorrection?: NextAction; 

}


export interface HistoryEntry extends Omit<ChatMessage, 'id' | 'sender' | 'timestamp' | 'files'> { // Omitir campos que ya están o se manejan diferente
  phase: 'user_input' | 'reasoning' | 'action_planning' | 'action' | 'reflection' | 'correction' | 'responseGeneration' | 'system_message'; // <--- 'responseGeneration' AÑADIDO, 'action_planning' y 'system_message' añadidos para más granularidad
  iteration?: number;
  content: string; 
  timestamp: number; 
  metadata: {
    tool_executions?: ToolExecution[]; 
  
    processingTime?: number; 
    status?: 'success' | 'error' | 'skipped';
    error_message?: string; 
    [key: string]: any;
  };
}


export interface VSCodeContext {
  extensionUri: vscode.Uri;
  extensionPath: string;
  subscriptions: vscode.Disposable[];
  outputChannel: vscode.OutputChannel; 
  workspaceFolders?: readonly vscode.WorkspaceFolder[]; 
  activeTextEditor?: vscode.TextEditor;
  globalState: vscode.Memento; 
  workspaceState: vscode.Memento; 
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