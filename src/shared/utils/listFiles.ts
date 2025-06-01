// src/shared/utils/listFiles.ts

type ListedFile = { path: string; type: 'file' | 'directory' | 'symbolicLink' | 'unknown' };

// Utilidad para listar archivos en el workspace (NO como tool)
export async function listFilesUtil(vscodeAPI: typeof import('vscode'), pattern = '**/*', maxResults = 1000): Promise<ListedFile[]> {
  const workspaceFolder = vscodeAPI.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) return [];
  const relativePattern = new vscodeAPI.RelativePattern(workspaceFolder, pattern);
  const foundUris = await vscodeAPI.workspace.findFiles(relativePattern, null, maxResults);
  const filesPromises = foundUris.map(async (uri): Promise<ListedFile> => {
    let fileType: ListedFile['type'] = 'unknown';
    try {
      const stat = await vscodeAPI.workspace.fs.stat(uri);
      if (stat.type === vscodeAPI.FileType.File) fileType = 'file';
      else if (stat.type === vscodeAPI.FileType.Directory) fileType = 'directory';
      else if (stat.type === vscodeAPI.FileType.SymbolicLink) fileType = 'symbolicLink';
    } catch (e) {}
    return { path: vscodeAPI.workspace.asRelativePath(uri, false), type: fileType };
  });
  return Promise.all(filesPromises);
}