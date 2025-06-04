// src/features/tools/definitions/git/gitPush.ts
import { z } from 'zod';
import { ToolDefinition, ToolResult } from '../../types';
import { exec } from 'child_process';
import * as util from 'util';

const execPromise = util.promisify(exec);

export const gitPushParamsSchema = z.object({
  remote: z.string().optional().default('origin'),
  branch: z.string().optional(),
  force: z.boolean().optional().default(false),
  setUpstream: z.boolean().optional().default(false)
}).strict();

type GitPushResult = {
  success: boolean;
  stdout: string;
  stderr?: string;
  pushedTo?: string;
  remoteUrl?: string;
  branch?: string;
  commitHash?: string;
  pushedCommits?: number;
};

export const gitPush: ToolDefinition<typeof gitPushParamsSchema, GitPushResult> = {
  getUIDescription: (params) => `Hacer git push a ${params?.remote || 'origin'}/${params?.branch || 'rama actual'}`,
  uiFeedback: true,
  name: 'gitPush',
  description: 'Envía los cambios locales al repositorio remoto especificado.',
  parametersSchema: gitPushParamsSchema,
  
  async execute(params, context): Promise<ToolResult<GitPushResult>> {
    const { remote, branch, force, setUpstream } = params;
    const workspaceFolder = context.vscodeAPI.workspace.workspaceFolders?.[0]?.uri.fsPath;
    
    if (!workspaceFolder) {
      return { 
        success: false, 
        error: 'No se encontró un directorio de trabajo para realizar el push.',
        data: undefined 
      };
    }

    let branchToPush = branch;
    if (!branchToPush) {
      try {
        // Obtener la rama actual si no se especifica
        const { stdout } = await execPromise('git rev-parse --abbrev-ref HEAD', { 
          cwd: workspaceFolder 
        });
        branchToPush = stdout.trim();
      } catch (e) {
        return { 
          success: false, 
          error: 'No se pudo determinar la rama actual para hacer push.',
          data: undefined 
        };
      }
    }

    try {
      // Construir el comando git push
      const forceFlag = force ? ' --force' : '';
      const upstreamFlag = setUpstream ? ' --set-upstream' : '';
      const pushCmd = `git push${upstreamFlag}${forceFlag} ${remote} ${branchToPush}`;
      
      // Ejecutar el comando
      const { stdout, stderr } = await execPromise(pushCmd, { 
        cwd: workspaceFolder,
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } // Evitar prompts interactivos
      });

      // Obtener información adicional sobre el push
      let remoteUrl: string | undefined;
      let commitHash: string | undefined;
      let pushedCommits: number | undefined;

      try {
        // Obtener URL del remoto
        const { stdout: remoteUrlOutput } = await execPromise(
          `git remote get-url ${remote}`, 
          { cwd: workspaceFolder }
        );
        remoteUrl = remoteUrlOutput.trim();

        // Obtener el hash del commit actual
        const { stdout: commitHashOutput } = await execPromise(
          'git rev-parse HEAD', 
          { cwd: workspaceFolder }
        );
        commitHash = commitHashOutput.trim();

        // Contar commits que se están enviando
        const { stdout: countOutput } = await execPromise(
          `git rev-list --count ${remote}/${branchToPush}..HEAD`,
          { cwd: workspaceFolder }
        );
        pushedCommits = parseInt(countOutput.trim(), 10) || 0;
      } catch (e) {
        // Si hay un error al obtener la información adicional, continuar sin ella
        console.warn('No se pudo obtener información adicional del push:', e);
      }

      return {
        success: true,
        data: {
          success: true,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          pushedTo: `${remote}/${branchToPush}`,
          remoteUrl,
          branch: branchToPush,
          commitHash,
          pushedCommits
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Error al hacer push: ${error.message || 'Error desconocido'}`,
        data: {
          success: false,
          stdout: error.stdout?.toString() || '',
          stderr: error.stderr?.toString() || error.message || 'Error desconocido',
          pushedTo: `${remote}/${branchToPush}`
        }
      };
    }
  }
};
