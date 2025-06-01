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

export interface ToolOutput {
  // ========== Resultados de búsqueda (searchInWorkspace) ==========
  query?: string;
  results?: Array<{
    filePath: string;
    line: number; // 1-based
    character: number; // 0-based
    length: number;
    preview: string;
  }>;
  totalFound?: number;
  searchLimited?: boolean;
  
  // ========== Operaciones de archivos (getFileContents, createFileOrDirectory, deletePath, writeToFile) ==========
  filePath?: string; // Path afectado por la operación (read, write, delete) o creado (createFile)
  content?: string; // Contenido leído (getFileContents)
  availableFiles?: string[]; // Específico de getFileContents
  fileOperationType?: 'file' | 'directory'; // Para createFileOrDirectory
  fileOperationStatus?: 'created' | 'overwritten' | 'exists' | 'deleted' | 'error_not_deleted'; // Para createFileOrDirectory, deletePath, writeToFile
  
  // ========== Editor activo (getActiveEditorInfo) ==========
  activeEditor_filePath?: string; 
  activeEditor_content?: string;
  activeEditor_languageId?: string;
  activeEditor_lineCount?: number;
  activeEditor_selection?: {
    text: string;
    startLine: number;
    startChar: number;
    endLine: number;
    endChar: number;
    isEmpty: boolean;
  } | null;
  
  // ========== Diagnósticos del documento (getDocumentDiagnostics) ==========
  diagnostics_documentPath?: string; 
  diagnostics_list?: Array<{
    message: string;
    severity: string;
    range: { startLine: number; startChar: number; endLine: number; endChar: number; };
    source?: string;
    code?: string | number;
  }>;
  
  // ========== Terminal (runInTerminal) ==========
  terminal_name?: string; 
  terminal_commandSent?: boolean;
  
  // ========== Información del workspace/proyecto (getProjectSummary) ==========
  project_name?: string; 
  project_rootPath?: string;
  project_workspaceName?: string;
  project_topLevelStructure?: Array<{ name: string; type: 'file' | 'directory' | 'other' }>;
  project_detectedPrimaryLanguage?: string;
  
  // ========== Git (getGitStatus) ==========
  git_currentBranch?: string | null; 
  git_remoteTracking?: { ahead: number; behind: number; };
  git_changedFilesCount?: number;
  git_stagedFilesCount?: number;
  git_unstagedFilesCount?: number;
  git_untrackedFilesCount?: number;
  git_conflictedFilesCount?: number;
  git_files?: Array<{ path: string; indexStatus: string; workTreeStatus: string; description: string; }>;
  
  // ========== Mensaje genérico / Fallback ==========
  message?: string; 
  details?: Record<string, any>; 
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
    toolOutput?: ToolOutput; // <--- UPDATED
    isFinalToolResponse?: boolean; 
 
    status?: 'info' | 'success' | 'error' | 'thinking' | 'tool_executing' | 'user_input_pending' | 'skipped' | 'processing_tool_result'; // Added 'processing_tool_result'
    [key: string]: any;
  };
}


export interface ToolExecution { 
  name: string;
  status: 'started' | 'completed' | 'error' | 'permission_denied';
  parameters?: Record<string, any>;
  result?: ToolOutput; // <--- UPDATED
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
  phase: 'user_input' | 'reasoning' | 'action_planning' | 'action' | 'reflection' | 'correction' | 'responseGeneration' | 'system_message' | 'toolOutputAnalysis'; // Added 'toolOutputAnalysis'
  iteration?: number;
  content: string; 
  timestamp: number; 
  metadata: {
    tool_executions?: ToolExecution[]; // This will contain ToolOutput in its 'result' field
    processingTime?: number; 
    status?: 'success' | 'error' | 'skipped';
    error_message?: string; 
    // For toolOutputAnalysis phase
    toolName?: string;
    toolOutput?: ToolOutput;
    modelDecision?: any; // Model's decision after analyzing tool output
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