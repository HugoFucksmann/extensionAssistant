import { ToolDefinition, ToolResult, ToolExecutionContext, ToolPermission } from '../types';
import { exec } from 'child_process';
import * as util from 'util';
import * as vscode from 'vscode'; // Para obtener el workspaceFolder

const execPromise = util.promisify(exec);

export const getGitStatus: ToolDefinition = {
  name: 'getGitStatus',
  description: 'Gets the current Git status for the workspace (branch, modified files, etc.).',
  parameters: {},
  requiredPermissions: ['workspace.info.read'], // O un 'git.read'
  async execute(params: {}, context?: ToolExecutionContext): Promise<ToolResult> {
    const workspaceFolder = context?.vscodeAPI.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceFolder) {
      return { success: false, error: 'No workspace folder found to get Git status.' };
    }

    try {
      // ANTES DE EJECUTAR: Verificar permisos
      // Obtener rama actual
      const branchResult = await execPromise('git rev-parse --abbrev-ref HEAD', { cwd: workspaceFolder });
      const currentBranch = branchResult.stdout.trim();

      // Obtener estado
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
          rawPorcelainStatus: porcelainStatus // Opcional
        } 
      };
    } catch (error: any) {
      return { success: false, error: `Failed to get Git status: ${error.message}` };
    }
  }
};