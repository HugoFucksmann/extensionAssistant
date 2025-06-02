// src/features/tools/definitions/git/gitDiff.ts
import { z } from 'zod';
import { ToolDefinition, ToolResult } from '../../types';
import { exec } from 'child_process';
import * as util from 'util';

const execPromise = util.promisify(exec);

export const gitDiffParamsSchema = z.object({
  file: z.string().optional(),
  staged: z.boolean().optional().default(false)
}).strict();

type FileDiffSummary = {
  file: string;
  insertions: number;
  deletions: number;
};

type GitDiffResult = {
  success: boolean;
  stdout: string;
  stderr?: string;
  diffSummary?: string;
  filesChanged?: FileDiffSummary[];
  isStaged: boolean;
};

export const gitDiff: ToolDefinition<typeof gitDiffParamsSchema, GitDiffResult> = {
  uiFeedback: true,
  name: 'gitDiff',
  description: 'Shows the diff for the whole repo or a specific file. Optionally shows only staged changes.',
  parametersSchema: gitDiffParamsSchema,
  async execute(params, context): Promise<ToolResult<GitDiffResult>> {
    const { file, staged } = params;
    const workspaceFolder = context.vscodeAPI.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceFolder) {
      return { success: false, error: 'No workspace folder found to diff.', data: undefined };
    }
    let diffCmd = 'git diff';
    if (staged) diffCmd += ' --cached';
    if (file) diffCmd += ` -- "${file}"`;
    try {
      const { stdout, stderr } = await execPromise(diffCmd, { cwd: workspaceFolder, timeout: 15000 });
      // Obtener resumen de archivos cambiados usando git diff --numstat
      let filesChanged: FileDiffSummary[] = [];
      try {
        let numstatCmd = 'git diff --numstat';
        if (staged) numstatCmd += ' --cached';
        if (file) numstatCmd += ` -- "${file}"`;
        const { stdout: numstatOut } = await execPromise(numstatCmd, { cwd: workspaceFolder, timeout: 10000 });
        filesChanged = numstatOut
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .map(line => {
            const [insertions, deletions, ...rest] = line.split(/\s+/);
            return {
              file: rest.join(' '),
              insertions: parseInt(insertions, 10) || 0,
              deletions: parseInt(deletions, 10) || 0
            };
          });
      } catch (e) {
        // Si falla el numstat, filesChanged queda vacío
      }
      return {
        success: true,
        data: {
          success: true,
          stdout,
          stderr,
          diffSummary: stdout.split('\n').slice(0, 10).join('\n'),
          filesChanged,
          isStaged: !!staged
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to get diff: ${error.message}`,
        data: {
          success: false,
          stdout: error.stdout || '',
          stderr: error.stderr || '',
          isStaged: !!staged
        }
      };
    }
  }
};
