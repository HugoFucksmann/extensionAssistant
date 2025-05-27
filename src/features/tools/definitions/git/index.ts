// src/features/tools/definitions/git/getGitStatus.ts
import * as vscode from 'vscode';
import { ToolDefinition, ToolPermission, ToolResult, ToolExecutionContext } from '../../types';
import { exec } from 'child_process';
import * as util from 'util';

const execPromise = util.promisify(exec);

interface GitFileStatus {
  path: string;
  indexStatus: string; // Status en el área de staging (X)
  workTreeStatus: string; // Status en el directorio de trabajo (Y)
  description: string; // Descripción legible del estado
}

// Función para parsear la salida de 'git status --porcelain=v1 -b'
function parseGitPorcelainStatus(porcelainOutput: string): {
  branch: string | null;
  ahead: number;
  behind: number;
  files: GitFileStatus[];
} {
  const lines = porcelainOutput.trim().split('\n');
  let branch: string | null = null;
  let ahead = 0;
  let behind = 0;
  const files: GitFileStatus[] = [];

  if (lines.length > 0) {
    const branchLine = lines.shift(); // La primera línea es la información de la rama
    if (branchLine?.startsWith('##')) {
      const branchMatch = branchLine.match(/^##\s*([^.]+)(\.\.\.\S+\s*\[ahead (\d+)(?:, behind (\d+))?\]|\.\.\.\S+\s*\[behind (\d+)\]|\.\.\.\S+\s*\[ahead (\d+)\])?/);
      // Ejemplo: ## main...origin/main [ahead 1, behind 2]
      // Ejemplo: ## feature/test...origin/feature/test [ahead 1]
      // Ejemplo: ## main (sin upstream)
      // Ejemplo: ## HEAD (no branch)
      if (branchMatch) {
        branch = branchMatch[1].trim();
        if (branch === 'HEAD (no branch)') branch = null; // Caso de detached HEAD

        // Capturar ahead/behind
        if (branchMatch[3]) ahead = parseInt(branchMatch[3], 10); // [ahead X, behind Y]
        if (branchMatch[4]) behind = parseInt(branchMatch[4], 10);
        if (branchMatch[5]) behind = parseInt(branchMatch[5], 10); // solo [behind Y]
        if (branchMatch[6]) ahead = parseInt(branchMatch[6], 10); // solo [ahead X]
      }
    }
  }

  lines.forEach(line => {
    if (line.trim() === '') return;

    const xy = line.substring(0, 2);
    const path = line.substring(3);
    const X = xy[0];
    const Y = xy[1];
    let description = '';

    // Interpretación de los estados X e Y de `git status --porcelain`
    // X: Estado del índice (staging area)
    // Y: Estado del árbol de trabajo (working directory)
    // ' ' = no modificado, M = modificado, A = añadido, D = borrado, R = renombrado, C = copiado, U = actualizado pero no fusionado (conflicto)
    // ? = no rastreado, ! = ignorado (no debería aparecer con porcelain v1 a menos que se fuerce)

    if (X === 'M') description += 'Index: Modified. ';
    if (X === 'A') description += 'Index: Added. ';
    if (X === 'D') description += 'Index: Deleted. ';
    if (X === 'R') description += 'Index: Renamed. ';
    if (X === 'C') description += 'Index: Copied. ';
    if (X === 'U') description += 'Index: Unmerged (Conflict). ';

    if (Y === 'M') description += 'WorkTree: Modified. ';
    if (Y === 'D') description += 'WorkTree: Deleted. ';
    if (Y === 'A' && X !== 'A') description += 'WorkTree: Added (but not staged). '; // A veces 'A ' significa nuevo y no staged
    if (Y === 'U') description += 'WorkTree: Unmerged (Conflict). ';
    
    if (X === '?' && Y === '?') description = 'Untracked. ';
    if (X === ' ' && Y === 'M') description = 'WorkTree: Modified (not staged). ';
    if (X === ' ' && Y === 'D') description = 'WorkTree: Deleted (not staged). ';
    
    // Casos especiales para renombrados/copiados que pueden tener más info
    if ((X === 'R' || X === 'C') && line.includes('->')) {
        const parts = path.split(' -> ');
        description += `Original: ${parts[0]}, New: ${parts[1]}. `;
    }


    files.push({
      path,
      indexStatus: X,
      workTreeStatus: Y,
      description: description.trim() || 'Unknown status',
    });
  });

  return { branch, ahead, behind, files };
}


export const getGitStatus: ToolDefinition = {
  name: 'getGitStatus',
  description: 'Gets the current Git status for the workspace: current branch, remote tracking (ahead/behind), and a list of changed/staged/untracked files.',
  parameters: {}, // No parameters needed
  requiredPermissions: ['workspace.info.read'], // O un permiso 'git.read' más específico
  async execute(
    _params: {},
    context?: ToolExecutionContext
  ): Promise<ToolResult<any>> {
    if (!context?.vscodeAPI) {
      return { success: false, error: 'VSCode API context not available.' };
    }

    const workspaceFolder = context.vscodeAPI.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceFolder) {
      return { success: false, error: 'No workspace folder found to get Git status from.' };
    }

    try {
      context?.dispatcher?.systemInfo('Fetching Git status', { toolName: 'getGitStatus', cwd: workspaceFolder }, context.chatId);

      // Usamos '--porcelain=v1 -b' para obtener una salida fácil de parsear y la info de la rama
      const { stdout, stderr } = await execPromise('git status --porcelain=v1 -b', { cwd: workspaceFolder });

      if (stderr) {
        // stderr no siempre significa un error fatal para 'git status', a veces son advertencias.
        // Pero si es el único output, podría ser un problema (ej. no es un repo git).
        context?.dispatcher?.systemWarning('Git status command produced stderr', { stderr, toolName: 'getGitStatus' }, context.chatId);
        if (!stdout.trim() && stderr.toLowerCase().includes("not a git repository")) {
             return { success: false, error: `The folder ${workspaceFolder} is not a Git repository.` };
        }
      }
      
      const parsedStatus = parseGitPorcelainStatus(stdout);

      return { 
        success: true, 
        data: {
          currentBranch: parsedStatus.branch,
          remoteTracking: {
            ahead: parsedStatus.ahead,
            behind: parsedStatus.behind,
          },
          changedFiles: parsedStatus.files.filter(f => f.indexStatus !== '?' && f.workTreeStatus !== '?').length, // Excluye untracked
          stagedFilesCount: parsedStatus.files.filter(f => f.indexStatus !== ' ' && f.indexStatus !== '?').length,
          unstagedFilesCount: parsedStatus.files.filter(f => f.indexStatus === ' ' && (f.workTreeStatus === 'M' || f.workTreeStatus === 'D')).length,
          untrackedFilesCount: parsedStatus.files.filter(f => f.indexStatus === '?' && f.workTreeStatus === '?').length,
          conflictedFilesCount: parsedStatus.files.filter(f => f.indexStatus === 'U' || f.workTreeStatus === 'U').length,
          files: parsedStatus.files.slice(0, 50) // Limitar el número de archivos en la respuesta para no hacerla muy grande
        }
      };

    } catch (error: any) {
      // Si execPromise falla, es probable que no sea un repo git o git no esté instalado.
      let errorMessage = `Failed to get Git status: ${error.message}`;
      if (error.stderr && error.stderr.toLowerCase().includes("not a git repository")) {
        errorMessage = `The folder ${workspaceFolder} is not a Git repository.`;
        return { success: false, error: errorMessage }; // Devuelve false si no es un repo
      } else if (error.message.toLowerCase().includes("command not found")) {
        errorMessage = "Git command not found. Please ensure Git is installed and in your system's PATH.";
      }
      
      context?.dispatcher?.systemError('Error executing getGitStatus', error, 
        { toolName: 'getGitStatus', cwd: workspaceFolder, chatId: context.chatId }
      );
      return { success: false, error: errorMessage, data: { stderr: error.stderr } };
    }
  }
};