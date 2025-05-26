
import * as vscode from 'vscode';


export interface WindsurfState {
 
  objective: string;
  userMessage: string;
  chatId: string;
  
 
  iterationCount: number;
  maxIterations: number;
  completionStatus: 'in_progress' | 'completed' | 'failed';
  
  reasoningResult?: ReasoningResult;
  actionResult?: ActionResult;
  reflectionResult?: ReflectionResult;
  correctionResult?: CorrectionResult;
  
  history: HistoryEntry[];
  projectContext?: any;
  editorContext?: any;
  
  
  metrics?: PerformanceMetrics;
  
  
  [key: string]: any;
}


export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant' | 'system' | 'tool'; // 'system' se usará para feedback
  timestamp: number;
  files?: string[];
  metadata?: {
    processingTime?: number;
    success?: boolean;
    tools?: ToolExecution[];
    metrics?: PerformanceMetrics;
    status?: 'info' | 'success' | 'error' | 'thinking' | 'tool_executing'; // <--- ASEGÚRATE QUE ESTÉ ASÍ O SIMILAR
    [key: string]: any; // Para flexibilidad
  };
}


export interface ToolExecution {
  name: string;
  status: 'started' | 'completed' | 'error';
  parameters?: Record<string, any>;
  result?: any;
  error?: string;
  startTime?: number;
  endTime?: number;
}


export interface PerformanceMetrics {
  totalDuration?: number;
  reasoningTime?: number;
  actionTime?: number;
  reflectionTime?: number;
  toolExecutions?: number;
  averageToolTime?: number;
  memoryUsage?: number;
  [key: string]: any;
}


export interface ProcessingStatus {
  phase: string;
  status: 'active' | 'completed' | 'inactive' | 'error';
  startTime?: number;
  endTime?: number;
  tools: ToolExecution[];
  metrics?: PerformanceMetrics;
  error?: string;
}


export interface ReasoningResult {
  reasoning: string;
  plan: PlanStep[];
  nextAction: NextAction;
  metrics?: PerformanceMetrics;
}


export interface PlanStep {
  id: string;
  step: string;
  rationale: string;
  isCompleted?: boolean;
  result?: any;
  status?: 'pending' | 'in_progress' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
}

export interface NextAction {
  toolName: string;
  params: Record<string, any>;
  expectedOutcome: string;
  requiredContext?: string[];
}


export interface ActionResult {
  toolName: string;
  params: Record<string, any>;
  success: boolean;
  result?: any;
  error?: string;
  timestamp: number;
  metrics?: PerformanceMetrics;
  execution?: ToolExecution;
}


export interface ReflectionResult {
  reflection: string;
  isSuccessful: boolean;
  confidence: number;
  evaluationReasons: string[];
  needsCorrection: boolean;
  correctionStrategy?: string;
  insights: Insight[];
  metrics?: PerformanceMetrics;
}


export interface Insight {
  id: string;
  type: 'observation' | 'learning' | 'warning' | 'suggestion';
  content: string;
  timestamp: number;
  context?: Record<string, any>;
}


export interface CorrectionResult {
  needsCorrection: boolean;
  correctionDescription?: string;
  rootCause?: string;
  updatedPlan?: PlanStep[];
  nextAction?: NextAction;
  metrics?: PerformanceMetrics;
}


export interface HistoryEntry extends Omit<ChatMessage, 'metadata'> {
  phase: 'reasoning' | 'action' | 'reflection' | 'correction' | 'user_input' | 'system';
  iteration: number;
  metadata: { 
    processingTime?: number;
    success?: boolean;
    tools?: ToolExecution[];
    metrics?: PerformanceMetrics;
    status?: 'info' | 'success' | 'error' | 'thinking' | 'tool_executing'; 
    [key: string]: any;
  };
}


export interface VSCodeContext {
  extensionUri: vscode.Uri;
  extensionPath: string;
  subscriptions: vscode.Disposable[];
  outputChannel: vscode.OutputChannel;
  workspaceFolders?: vscode.WorkspaceFolder[];
  activeTextEditor?: vscode.TextEditor;
  state: vscode.Memento;
}

export interface Chat {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  metadata?: {
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
