// src/features/tools/definitions/git.ts
import { ToolDefinition, ToolResult, ToolExecutionContext, ToolPermission } from '../types';
import { exec } from 'child_process';
import * as util from 'util';
// import * as vscode from 'vscode'; // No es necesario si obtenemos workspaceFolder de context

const execPromise = util.promisify(exec);

export const getGitStatus: ToolDefinition = {
  name: 'getGitStatus',
  description: 'Gets the current Git status for the workspace (branch, modified files, etc.).',
  parameters: {},
  requiredPermissions: ['workspace.info.read'],
  async execute(params: {}, context?: ToolExecutionContext): Promise<ToolResult> {
    if (!context?.vscodeAPI) { // COMPROBACIÓN CLAVE
      return { success: false, error: 'VSCode API context not available for getGitStatus.' };
    }
    const vscodeInstance = context.vscodeAPI;

    const workspaceFolder = vscodeInstance.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceFolder) {
      return { success: false, error: 'No workspace folder found to get Git status.' };
    }

    try {
      const branchResult = await execPromise('git rev-parse --abbrev-ref HEAD', { cwd: workspaceFolder });
      const currentBranch = branchResult.stdout.trim();

      const statusResult = await execPromise('git status --porcelain', { cwd: workspaceFolder });
      const porcelainStatus = statusResult.stdout.trim();

      const changedFiles: { status: string, path: string }[] = [];
      if (porcelainStatus) {
        porcelainStatus.split('\n').forEach(line => {
          if (line.trim()) {
            const statusMarker = line.substring(0, 2).trim();
            const filePath = line.substring(3).trim();
            changedFiles.push({ status: statusMarker, path: filePath });
          }
        });
      }

      return {
        success: true,
        data: {
          currentBranch,
          changedFiles,
          rawPorcelainStatus: porcelainStatus
        }
      };
    } catch (error: any) {
      // Si git no está instalado o no es un repo git, execPromise fallará.
      let errorMessage = `Failed to get Git status: ${error.message}`;
      if (error.stderr) {
         errorMessage += `\nStderr: ${error.stderr}`;
      }
      if (error.stdout) { // A veces git puede dar info útil en stdout incluso en error
         errorMessage += `\nStdout: ${error.stdout}`;
      }
      return { success: false, error: errorMessage };
    }
  }
};