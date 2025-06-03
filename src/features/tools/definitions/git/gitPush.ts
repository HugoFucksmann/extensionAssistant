// src/features/tools/definitions/git/gitPush.ts
import { z } from 'zod';
import { ToolDefinition, ToolResult } from '../../types';
import { exec } from 'child_process';
import * as util from 'util';

const execPromise = util.promisify(exec);

export const gitPushParamsSchema = z.object({
  remote: z.string().optional().default('origin'),
  branch: z.string().optional()
}).strict();

type GitPushResult = {
  success: boolean;
  stdout: string;
  stderr?: string;
  pushedTo?: string;
  remoteUrl?: string;
  branch?: string;
  commitHash?: string;
  commitsPushed?: number;
};

export const gitPush: ToolDefinition<typeof gitPushParamsSchema, GitPushResult> = {
  getUIDescription: (params) => `Hacer git push a ${params?.remote || 'origin'}/${params?.branch || ''}`,
  uiFeedback: true,
  mapToOutput: (rawData, success, errorMsg) => success && rawData ? {
    title: 'Push realizado',
    summary: 'Push ejecutado correctamente.',
    details: `Branch: ${rawData.branch || 'desconocido'}\nCommits empujados: ${rawData.commitsPushed ?? 'N/A'}`,
    items: [],
    meta: {
      branch: rawData.branch,
      remote: rawData.pushedTo,
      commitsPushed: rawData.commitsPushed
    }
  } : {
    title: 'Error de push',
    summary: `Error: ${errorMsg || 'No se pudo hacer push.'}`,
    details: errorMsg,
    items: [],
    meta: {}
  },
  name: 'gitPush',
  description: 'Pushes the current branch to the specified remote.',
  parametersSchema: gitPushParamsSchema,
  async execute(params, context): Promise<ToolResult<GitPushResult>> {
    const { remote, branch } = params;
    const workspaceFolder = context.vscodeAPI.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceFolder) {
      return { success: false, error: 'No workspace folder found to push.', data: undefined };
    }
    let branchToPush = branch;
    if (!branchToPush) {
      try {
        const { stdout } = await execPromise('git rev-parse --abbrev-ref HEAD', { cwd: workspaceFolder });
        branchToPush = stdout.trim();
      } catch (e) {
        return { success: false, error: 'Could not determine current branch.', data: undefined };
      }
    }
    try {
      const pushCmd = `git push ${remote} ${branchToPush}`;
      const { stdout, stderr } = await execPromise(pushCmd, { cwd: workspaceFolder, timeout: 20000 });
      // Obtener metadatos adicionales
      let remoteUrl: string | undefined = undefined;
      let commitHash: string | undefined = undefined;
      let commitsPushed: number | undefined = undefined;
      try {
        const { stdout: urlOut } = await execPromise(`git remote get-url ${remote}`, { cwd: workspaceFolder });
        remoteUrl = urlOut.trim();
      } catch {}
      try {
        const { stdout: hashOut } = await execPromise('git rev-parse HEAD', { cwd: workspaceFolder });
        commitHash = hashOut.trim();
      } catch {}
      try {
        // Commits empujados = diferencia entre remoto y local antes del push
        const { stdout: countOut } = await execPromise(`git rev-list --count ${remote}/${branchToPush}..${branchToPush}`, { cwd: workspaceFolder });
        commitsPushed = parseInt(countOut.trim(), 10) || 0;
      } catch {}
      return {
        success: true,
        data: {
          success: true,
          stdout,
          stderr,
          pushedTo: `${remote}/${branchToPush}`,
          remoteUrl,
          branch: branchToPush,
          commitHash,
          commitsPushed
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to push: ${error.message}`,
        data: {
          success: false,
          stdout: error.stdout || '',
          stderr: error.stderr || ''
        }
      };
    }
  }
};
