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

// Tipos específicos para cada herramienta
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

export interface RunInTerminalToolOutput extends BaseToolOutput<{
  terminalName: string;
  commandSent: boolean;
}> { }

export interface CreateFileOrDirectoryToolOutput extends BaseToolOutput<{
  path: string;
  type: 'file' | 'directory';
  operation: 'created' | 'overwritten' | 'exists';
  absolutePath: string;
  size?: number;
  encoding: string;
  mimeType?: string;
  lastModified: string;
  parentDirectory: string;
  children?: string[];
}> { }

export interface DeletePathToolOutput extends BaseToolOutput<{
  path: string;
  deleted: boolean;
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

export interface ActiveEditorInfoToolOutput extends BaseToolOutput<{
  filePath: string | undefined;
  content: string;
  languageId: string;
  lineCount: number;
  selection: {
    text: string;
    startLine: number;
    startChar: number;
    endLine: number;
    endChar: number;
    isEmpty: boolean;
  } | null;
}> { }

// Mapeo de herramientas a sus tipos de salida
export type ToolOutputMap = {
  getProjectSummary: ProjectSummaryToolOutput;
  runInTerminal: RunInTerminalToolOutput;
  createFileOrDirectory: CreateFileOrDirectoryToolOutput;
  deletePath: DeletePathToolOutput;
  getFileContents: FileContentsToolOutput;
  getActiveEditorInfo: ActiveEditorInfoToolOutput;
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