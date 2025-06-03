// src/features/tools/definitions/git/gitPull.ts
import { z } from 'zod';
import { ToolDefinition, ToolResult } from '../../types';
import { exec } from 'child_process';
import * as util from 'util';

const execPromise = util.promisify(exec);

export const gitPullParamsSchema = z.object({
  remote: z.string().optional().default('origin'),
  branch: z.string().optional()
}).strict();

type GitPullResult = {
  success: boolean;
  stdout: string;
  stderr?: string;
  pulledFrom?: string;
  remoteUrl?: string;
  branch?: string;
  commitHash?: string;
  commitsPulled?: number;
};

export const gitPull: ToolDefinition<typeof gitPullParamsSchema, GitPullResult> = {
  getUIDescription: (params) => `Hacer git pull de ${params?.remote || 'origin'}/${params?.branch || ''}`,
  uiFeedback: true,
  mapToOutput: (rawData, success, errorMsg) => success && rawData ? {
    title: 'Pull realizado',
    summary: 'Pull ejecutado correctamente.',
    details: `Branch: ${rawData.branch || 'desconocido'}\nCommits traídos: ${rawData.commitsPulled ?? 'N/A'}`,
    items: [],
    meta: {
      branch: rawData.branch,
      remote: rawData.pulledFrom,
      commitsPulled: rawData.commitsPulled
    }
  } : {
    title: 'Error de pull',
    summary: `Error: ${errorMsg || 'No se pudo hacer pull.'}`,
    details: errorMsg,
    items: [],
    meta: {}
  },
  name: 'gitPull',
  description: 'Pulls changes from the specified remote and branch.',
  parametersSchema: gitPullParamsSchema,
  async execute(params, context): Promise<ToolResult<GitPullResult>> {
    const { remote, branch } = params;
    const workspaceFolder = context.vscodeAPI.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceFolder) {
      return { success: false, error: 'No workspace folder found to pull.', data: undefined };
    }
    let branchToPull = branch;
    if (!branchToPull) {
      try {
        const { stdout } = await execPromise('git rev-parse --abbrev-ref HEAD', { cwd: workspaceFolder });
        branchToPull = stdout.trim();
      } catch (e) {
        return { success: false, error: 'Could not determine current branch.', data: undefined };
      }
    }
    try {
      const pullCmd = `git pull ${remote} ${branchToPull}`;
      const { stdout, stderr } = await execPromise(pullCmd, { cwd: workspaceFolder, timeout: 20000 });
      // Obtener metadatos adicionales
      let remoteUrl: string | undefined = undefined;
      let commitHash: string | undefined = undefined;
      let commitsPulled: number | undefined = undefined;
      try {
        const { stdout: urlOut } = await execPromise(`git remote get-url ${remote}`, { cwd: workspaceFolder });
        remoteUrl = urlOut.trim();
      } catch {}
      try {
        const { stdout: hashOut } = await execPromise('git rev-parse HEAD', { cwd: workspaceFolder });
        commitHash = hashOut.trim();
      } catch {}
      try {
        // Commits traídos = diferencia entre local y remoto antes del pull
        const { stdout: countOut } = await execPromise(`git rev-list --count ${branchToPull}..${remote}/${branchToPull}`, { cwd: workspaceFolder });
        commitsPulled = parseInt(countOut.trim(), 10) || 0;
      } catch {}
      return {
        success: true,
        data: {
          success: true,
          stdout,
          stderr,
          pulledFrom: `${remote}/${branchToPull}`,
          remoteUrl,
          branch: branchToPull,
          commitHash,
          commitsPulled
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to pull: ${error.message}`,
        data: {
          success: false,
          stdout: error.stdout || '',
          stderr: error.stderr || ''
        }
      };
    }
  }
};
