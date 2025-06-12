// src/features/tools/toolOutputTypes.ts

export interface BaseToolOutput<T = any> {
  title: string;
  summary: string;
  details: string;
  items: T[];
  meta: {
    executionTime: number;
    success: boolean;
    error?: string;
    warnings?: string[];
  };
}



export interface ProjectSummaryToolOutput extends BaseToolOutput<{
  projectName: string;
  rootPath: string;
  workspaceName: string;
  topLevelStructure: Array<{
    name: string;
    type: 'file' | 'directory' | 'other';
  }>;
  detectedPrimaryLanguage: string;
}> { }


export interface GitFileStatus {
  path: string;
  indexStatus: string;
  workTreeStatus: string;
  description: string;
}

export interface GitStatusToolOutput extends BaseToolOutput<{
  currentBranch: string | null;
  remoteTracking: {
    ahead: number;
    behind: number;
  };
  changedFilesCount: number;
  stagedFilesCount: number;
  unstagedFilesCount: number;
  untrackedFilesCount: number;
  conflictedFilesCount: number;
  files: GitFileStatus[];
}> { }

export interface FileCommitSummary {
  file: string;
  insertions: number;
  deletions: number;
}

export interface GitCommitToolOutput extends BaseToolOutput<{
  success: boolean;
  stdout: string;
  stderr?: string;
  committedFiles?: string[];
  commitHash?: string;
  commitSummary?: string;
  commitDate?: string;
  author?: string;
  filesChangedSummary?: FileCommitSummary[];
}> { }

export interface GitPushToolOutput extends BaseToolOutput<{
  success: boolean;
  stdout: string;
  stderr?: string;
  pushedTo?: string;
  remoteUrl?: string;
  branch?: string;
  commitHash?: string;
  pushedCommits?: number;
}> { }

export interface GitPullToolOutput extends BaseToolOutput<{
  success: boolean;
  stdout: string;
  stderr?: string;
  pulledFrom?: string;
  remoteUrl?: string;
  branch?: string;
  commitHash?: string;
  commitsPulled?: number;
}> { }

export interface FileDiffSummary {
  file: string;
  insertions: number;
  deletions: number;
}

export interface GitDiffToolOutput extends BaseToolOutput<{
  success: boolean;
  stdout: string;
  stderr?: string;
  diffSummary?: string;
  filesChanged?: FileDiffSummary[];
  isStaged: boolean;
}> { }



export interface FileContentsToolOutput extends BaseToolOutput<{
  filePath: string;
  content: string;
  availableFiles?: string[];
  fileSize: number;
  lastModified: string;
  encoding: string;
  mimeType: string;
  isBinary: boolean;
  lineCount: number;
}> { }

export interface CreateFileOrDirectoryToolOutput extends BaseToolOutput<{
  path: string;
  type: 'file' | 'directory';
  created: boolean;
  alreadyExists: boolean;
}> { }

export interface DeletePathToolOutput extends BaseToolOutput<{
  path: string;
  deleted: boolean;
  error?: string;
}> { }

export interface WriteToFileToolOutput extends BaseToolOutput<{
  filePath: string;
  success: boolean;
  bytesWritten: number;
  error?: string;
}> { }



export interface ActiveEditorInfoToolOutput extends BaseToolOutput<{
  filePath: string;
  languageId: string;
  lineCount: number;
  selection?: {
    startLine: number;
    startCharacter: number;
    endLine: number;
    endCharacter: number;
  };
  cursorPosition?: {
    line: number;
    character: number;
  };
  visibleRanges?: Array<{
    startLine: number;
    endLine: number;
  }>;
}> { }

export interface DocumentDiagnosticsToolOutput extends BaseToolOutput<{
  filePath: string;
  diagnostics: Array<{
    severity: 'error' | 'warning' | 'info' | 'hint';
    message: string;
    range: {
      startLine: number;
      startCharacter: number;
      endLine: number;
      endCharacter: number;
    };
    source?: string;
    code?: string | number;
  }>;
  hasErrors: boolean;
  hasWarnings: boolean;
}> { }


export interface RunInTerminalToolOutput extends BaseToolOutput<{
  command: string;
  cwd: string;
  exitCode: number;
  output: string;
  errorOutput: string;
  executionTime: number;
  pid?: number;
  shellProcessId?: string;
}> { }


export type ToolOutputMap = {
  // Workspace
  getProjectSummary: ProjectSummaryToolOutput;

  // Git
  getGitStatus: GitStatusToolOutput;
  gitCommit: GitCommitToolOutput;
  gitPush: GitPushToolOutput;
  gitPull: GitPullToolOutput;
  gitDiff: GitDiffToolOutput;

  // Filesystem
  getFileContents: FileContentsToolOutput;
  file_examine: FileContentsToolOutput;
  file_read: FileContentsToolOutput;
  createFileOrDirectory: CreateFileOrDirectoryToolOutput;
  deletePath: DeletePathToolOutput;
  writeToFile: WriteToFileToolOutput;

  // Edit
  getActiveEditorInfo: ActiveEditorInfoToolOutput;

  // Terminal
  terminal: RunInTerminalToolOutput;
  runInTerminal: RunInTerminalToolOutput;
  console_command: RunInTerminalToolOutput;
};


export type ToolName = keyof ToolOutputMap;


export type ToolOutputType<T extends ToolName> = ToolOutputMap[T];


export type AnyToolOutput = ToolOutputMap[ToolName];


export function createToolOutput<T extends ToolName>(
  toolName: T,
  data: ToolOutputMap[T]['items'][0],
  meta: {
    title: string;
    summary: string;
    details?: string;
    executionTime: number;
    success: boolean;
    error?: string;
    warnings?: string[];
  }
): ToolOutputMap[T] {
  return {
    title: meta.title,
    summary: meta.summary,
    details: meta.details ?? JSON.stringify(data, null, 2),
    items: [data],
    meta: {
      executionTime: meta.executionTime,
      success: meta.success,
      error: meta.error,
      warnings: meta.warnings
    }
  } as ToolOutputMap[T];
}
