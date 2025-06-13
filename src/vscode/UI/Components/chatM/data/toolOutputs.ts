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

// --- Workspace Tool Outputs ---
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

// --- Filesystem Tool Outputs ---
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

// --- Editor Tool Outputs ---
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

// --- Terminal Tool Outputs ---
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

  // Filesystem
  getFileContents: FileContentsToolOutput;
  createFileOrDirectory: CreateFileOrDirectoryToolOutput;
  deletePath: DeletePathToolOutput;
  writeToFile: WriteToFileToolOutput;

  // Editor
  getActiveEditorInfo: ActiveEditorInfoToolOutput;

  // Terminal
  runInTerminal: RunInTerminalToolOutput;
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