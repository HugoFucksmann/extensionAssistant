// src/features/tools/definitions/git/gitCommit.ts
import { z } from 'zod';
import { ToolDefinition, ToolResult } from '../../types';
import { exec } from 'child_process';
import * as util from 'util';

const execPromise = util.promisify(exec);

export const gitCommitParamsSchema = z.object({
  message: z.string().min(1, { message: 'Commit message cannot be empty.' }),
  all: z.boolean().optional().default(true)
}).strict();

type FileCommitSummary = {
  file: string;
  insertions: number;
  deletions: number;
};

type GitCommitResult = {
  success: boolean;
  stdout: string;
  stderr?: string;
  committedFiles?: string[];
  commitHash?: string;
  commitSummary?: string;
  commitDate?: string;
  author?: string;
  filesChangedSummary?: FileCommitSummary[];
};

export const gitCommit: ToolDefinition<typeof gitCommitParamsSchema, GitCommitResult> = {
  uiFeedback: true,
  name: 'gitCommit',
  description: 'Commits staged changes (or all changes if --all) with the provided commit message.',
  parametersSchema: gitCommitParamsSchema,
  async execute(params, context): Promise<ToolResult<GitCommitResult>> {
    const { message, all } = params;
    const workspaceFolder = context.vscodeAPI.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceFolder) {
      return { success: false, error: 'No workspace folder found to commit.', data: undefined };
    }
    try {
      const commitCmd = `git commit${all ? ' -a' : ''} -m ${JSON.stringify(message)}`;
      const { stdout, stderr } = await execPromise(commitCmd, { cwd: workspaceFolder, timeout: 15000 });
      // Parse committed files and hash
      const summaryMatch = stdout.match(/\[([\w\d]+)\] (.*)/);
      let commitHash = undefined;
      let commitSummary = undefined;
      if (summaryMatch) {
        commitHash = summaryMatch[1];
        commitSummary = summaryMatch[2];
      }
      const committedFiles = stdout
        .split('\n')
        .filter(line => /^\s*\w+\s+.+/.test(line))
        .map(line => line.trim().split(/\s+/).pop()!);
      // Obtener metadatos adicionales del último commit
      let commitDate: string | undefined = undefined;
      let author: string | undefined = undefined;
      let filesChangedSummary: FileCommitSummary[] = [];
      if (commitHash) {
        try {
          // Obtener fecha y autor
          const { stdout: logOut } = await execPromise(`git log -1 --pretty=format:"%H|%an|%ad"`, { cwd: workspaceFolder });
          const [hash, authorName, date] = logOut.split('|');
          if (hash === commitHash) {
            commitDate = date;
            author = authorName;
          }
          // Obtener resumen de archivos cambiados
          const { stdout: statOut } = await execPromise(`git show --numstat --pretty="" ${commitHash}`, { cwd: workspaceFolder });
          filesChangedSummary = statOut.split('\n').filter(l => l.trim().length > 0 && /^\d+/.test(l)).map(l => {
            const [ins, del, ...rest] = l.trim().split(/\s+/);
            return { file: rest.join(' '), insertions: parseInt(ins, 10) || 0, deletions: parseInt(del, 10) || 0 };
          });
        } catch {}
      }
      return {
        success: true,
        data: {
          success: true,
          stdout,
          stderr,
          committedFiles,
          commitHash,
          commitSummary,
          commitDate,
          author,
          filesChangedSummary
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to commit: ${error.message}`,
        data: {
          success: false,
          stdout: error.stdout || '',
          stderr: error.stderr || ''
        }
      };
    }
  }
};
