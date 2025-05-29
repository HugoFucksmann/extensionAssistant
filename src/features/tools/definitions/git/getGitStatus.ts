// src/features/tools/definitions/git/getGitStatus.ts
import * as vscode from 'vscode';
import { z } from 'zod';
import { ToolDefinition, ToolResult,  } from '../../types';
import { exec } from 'child_process';
import * as util from 'util';

const execPromise = util.promisify(exec);


export const getGitStatusParamsSchema = z.object({}).strict();

// Tipos para la data retornada
interface GitFileStatus {
  path: string;
  indexStatus: string;
  workTreeStatus: string;
  description: string;
}
interface GitStatusData {
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
}


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

  if (lines.length > 0 && lines[0].startsWith('##')) {
    const branchLine = lines.shift()!; 
    const branchMatch = branchLine.match(/^##\s*([^.]+)(?:\.\.\.\S+\s*\[ahead (\d+)(?:, behind (\d+))?\]|\.\.\.\S+\s*\[behind (\d+)\]|\.\.\.\S+\s*\[ahead (\d+)\])?/);
    if (branchMatch) {
      branch = branchMatch[1].trim();
      if (branch === 'HEAD (no branch)') branch = null;

      if (branchMatch[2]) ahead = parseInt(branchMatch[2], 10); // [ahead X]
      if (branchMatch[3]) behind = parseInt(branchMatch[3], 10); // [, behind Y]
      if (branchMatch[4]) behind = parseInt(branchMatch[4], 10); // solo [behind Y]
      if (branchMatch[5]) ahead = parseInt(branchMatch[5], 10); // solo [ahead X] (cuando behind no está)
    } else if (branchLine.includes("no branch")) {
        branch = null; // Detached HEAD o similar sin info de tracking
    } else {
        // Caso: ## main (sin upstream) o ## initial (sin commits)
        const simpleBranchMatch = branchLine.match(/^##\s*([^\s.(]+)/);
        if (simpleBranchMatch) {
            branch = simpleBranchMatch[1].trim();
        }
    }
  }

  lines.forEach(line => {
    if (line.trim() === '') return;

    const xy = line.substring(0, 2);
    let pathPart = line.substring(3);
    const X = xy[0];
    const Y = xy[1];
    let description = '';
    let originalPath: string | undefined = undefined;

    // Handle renamed/copied files: R <original_path> -> <new_path> or C <original_path> -> <new_path>
    if ((X === 'R' || X === 'C') && pathPart.includes(' -> ')) {
        const parts = pathPart.split(' -> ');
        originalPath = parts[0];
        pathPart = parts[1];
    }

    if (X === 'M') description += 'Index: Modified. ';
    if (X === 'A') description += 'Index: Added. ';
    if (X === 'D') description += 'Index: Deleted. ';
    if (X === 'R') description += `Index: Renamed${originalPath ? ` from ${originalPath}` : ''}. `;
    if (X === 'C') description += `Index: Copied${originalPath ? ` from ${originalPath}` : ''}. `;
    if (X === 'U') description += 'Index: Unmerged (Conflict). ';

    if (Y === 'M') description += 'WorkTree: Modified. ';
    if (Y === 'D') description += 'WorkTree: Deleted. ';
    if (X === '?' && Y === '?') description = 'Untracked. ';
    else if (X === ' ' && Y === 'A') description += 'WorkTree: Added (Intent-to-add, not staged). '; // Raro, pero posible
    else if (X === 'A' && Y === 'A') description = 'Index & WorkTree: Added (Unmerged or new and staged). '; // Conflicto de adición o nuevo y staged
    
    if (X === 'U' || Y === 'U' || (X === 'A' && Y === 'A') || (X === 'D' && Y === 'D')) {
        description = 'Conflict: Unmerged. ';
        if (X === 'A' && Y === 'A') description += "Both added. ";
        if (X === 'D' && Y === 'D') description += "Both deleted. ";
        if (X === 'U' && Y === 'U') description += "Both modified. ";
      
    }


    files.push({
      path: pathPart,
      indexStatus: X,
      workTreeStatus: Y,
      description: description.trim() || `Status ${X}${Y}`,
    });
  });

  return { branch, ahead, behind, files };
}


export const getGitStatus: ToolDefinition<typeof getGitStatusParamsSchema, GitStatusData | { errorReason: string, stderr?: string }> = {
  uiFeedback: true,
  name: 'getGitStatus',
  description: 'Gets the current Git status for the workspace: current branch, remote tracking (ahead/behind), and a list of changed/staged/untracked files. Returns an error reason if not a Git repository or Git is not found.',
  parametersSchema: getGitStatusParamsSchema,
  async execute(
    _params,
    context
  ): Promise<ToolResult<GitStatusData | { errorReason: string, stderr?: string }>> {
    const workspaceFolder = context.vscodeAPI.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceFolder) {
      return { success: false, error: 'No workspace folder found to get Git status from.' };
    }

    try {
      context.dispatcher.systemInfo('Fetching Git status', { toolName: 'getGitStatus', cwd: workspaceFolder }, context.chatId);
      const { stdout, stderr } = await execPromise('git status --porcelain=v1 -b -u', { cwd: workspaceFolder, timeout: 10000 }); // -u para mostrar untracked files, timeout de 10s

      if (stderr && !stdout.trim() && stderr.toLowerCase().includes("not a git repository")) {
           return { success: false, data: { errorReason: `The folder ${workspaceFolder} is not a Git repository.` }, error: `The folder ${workspaceFolder} is not a Git repository.` };
      }
      if (stderr && !stdout.trim()) { // Otras advertencias de stderr sin stdout podrían ser problemáticas
          context.dispatcher.systemWarning('Git status command produced stderr without stdout', { stderr, toolName: 'getGitStatus' }, context.chatId);
      }
      
      const parsedStatus = parseGitPorcelainStatus(stdout);

      const data: GitStatusData = {
        currentBranch: parsedStatus.branch,
        remoteTracking: {
          ahead: parsedStatus.ahead,
          behind: parsedStatus.behind,
        },
        changedFilesCount: parsedStatus.files.filter(f => f.indexStatus !== '?' && f.workTreeStatus !== '?').length,
        stagedFilesCount: parsedStatus.files.filter(f => f.indexStatus !== ' ' && f.indexStatus !== '?').length,
        unstagedFilesCount: parsedStatus.files.filter(f => f.indexStatus === ' ' && (f.workTreeStatus === 'M' || f.workTreeStatus === 'D')).length,
        untrackedFilesCount: parsedStatus.files.filter(f => f.indexStatus === '?' && f.workTreeStatus === '?').length,
        conflictedFilesCount: parsedStatus.files.filter(f => f.indexStatus === 'U' || f.workTreeStatus === 'U' || (f.indexStatus === 'A' && f.workTreeStatus === 'A') || (f.indexStatus === 'D' && f.workTreeStatus === 'D')).length,
        files: parsedStatus.files.slice(0, 50) // Limitar el número de archivos en la respuesta
      };
      return { success: true, data };

    } catch (error: any) {
      let errorMessage = `Failed to get Git status: ${error.message}`;
      let errorReason = errorMessage;

      if (error.stderr?.toLowerCase().includes("not a git repository") || error.message?.toLowerCase().includes("not a git repository")) {
        errorReason = `The folder ${workspaceFolder} is not a Git repository.`;
        return { success: false, data: { errorReason }, error: errorReason };
      } else if (error.message?.toLowerCase().includes("command not found") || error.code === 'ENOENT') {
        errorReason = "Git command not found. Please ensure Git is installed and in your system's PATH.";
      }
      
      return { success: false, error: errorReason, data: { errorReason, stderr: error.stderr } };
    }
  }
};