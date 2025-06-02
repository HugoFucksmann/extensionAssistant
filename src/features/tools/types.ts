// src/features/tools/types.ts
import { InternalEventDispatcher } from '@core/events/InternalEventDispatcher';
import * as vscode from 'vscode';
import { z, ZodObject, ZodEffects, ZodTypeAny } from 'zod';

// ========== ToolOutput: Moved from shared/types.ts ==========
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
  filePath?: string;
  content?: string;
  availableFiles?: string[];
  fileOperationType?: 'file' | 'directory';
  fileOperationStatus?: 'created' | 'overwritten' | 'exists' | 'deleted' | 'error_not_deleted';
  // For getFileContents detailed metadata
  fileSize?: number;
  lastModified?: string;
  encoding?: string;
  mimeType?: string;
  isBinary?: boolean;
  lineCount?: number;
  // For createFileOrDirectory detailed metadata
  absolutePath?: string;
  parentDirectory?: string;
  children?: string[];


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

  // ========== Git (getGitStatus, gitCommit, gitPush, gitPull, gitDiff) ==========
  git_currentBranch?: string | null;
  git_remoteTracking?: { ahead: number; behind: number; };
  git_changedFilesCount?: number;
  git_stagedFilesCount?: number;
  git_unstagedFilesCount?: number;
  git_untrackedFilesCount?: number;
  git_conflictedFilesCount?: number;
  git_files?: Array<{ path: string; indexStatus: string; workTreeStatus: string; description: string; }>;
  // For gitCommit
  git_committedFiles?: string[];
  git_commitHash?: string;
  git_commitSummary?: string;
  git_commitDate?: string;
  git_author?: string;
  git_filesChangedSummary?: Array<{ file: string; insertions: number; deletions: number; }>;
  // For gitPush/gitPull
  git_pushedTo?: string; // for push
  git_pulledFrom?: string; // for pull
  git_remoteUrl?: string;
  git_branch?: string;
  git_commitsPushed?: number; // for push
  git_commitsPulled?: number; // for pull
  // For gitDiff
  git_diffSummary?: string;
  // git_filesChanged already covered by git_filesChangedSummary
  git_isStaged?: boolean; // for diff
  // General git command output
  git_stdout?: string;
  git_stderr?: string;
  git_success?: boolean; // For commands like push/pull/commit where success is part of data

  // ========== Mensaje genérico / Fallback ==========
  message?: string;
  details?: Record<string, any>;
}

// ========== ToolExecution: Moved from shared/types.ts ==========
export interface ToolExecution {
  name: string;
  status: 'started' | 'completed' | 'error' | 'permission_denied';
  parameters?: Record<string, any>;
  result?: ToolOutput;
  error?: string;
  startTime?: number;
  endTime?: number;
  duration?: number;
}

// ========== Existing types in src/features/tools/types.ts ==========
export type ZodSchemaType = ZodObject<any, any, any, any, any> | ZodEffects<ZodObject<any, any, any, any, any>, any, any> | ZodTypeAny;

export interface ToolResult<T = any> {
  success: boolean;
  data?: T;
  mappedOutput?: ToolOutput; // Now directly uses the ToolOutput defined above
  error?: string;
  executionTime?: number;
  warnings?: string[];
}

export interface ToolExecutionContext {
  vscodeAPI: typeof vscode;
  dispatcher: InternalEventDispatcher;
  chatId?: string;
  [key: string]: any;
}

export interface ToolDefinition<P_SCHEMA extends ZodSchemaType = ZodSchemaType, R = any> {
  uiFeedback: boolean;
  name: string;
  description: string;
  parametersSchema: P_SCHEMA;
  execute: (params: z.infer<P_SCHEMA>, context: ToolExecutionContext) => Promise<ToolResult<R>>;
}