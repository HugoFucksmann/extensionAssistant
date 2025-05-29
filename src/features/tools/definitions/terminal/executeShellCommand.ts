// src/features/tools/definitions/terminal/executeShellCommand.ts
import * as vscode from 'vscode';
import { z } from 'zod';
import { ToolDefinition, ToolResult, } from '../../types';
import { exec } from 'child_process';
import * as util from 'util';

const execPromise = util.promisify(exec);

// Esquema Zod para los parámetros
export const executeShellCommandParamsSchema = z.object({
  command: z.string().min(1, { message: "Command to execute cannot be empty." }),
  timeoutMs: z.number().int().positive().optional().default(30000).describe("Optional timeout in milliseconds for the command execution. Defaults to 30 seconds.")
  
}).strict();

type ShellCommandResultData = {
  stdout: string;
  stderr: string;
  exitCode: number | null; 
  signal?: string; 
};

export const executeShellCommand: ToolDefinition<typeof executeShellCommandParamsSchema, ShellCommandResultData> = {
  name: 'executeShellCommand',
  description: 'Executes a shell command silently in the background and captures its standard output and error. Runs in the workspace root by default. Use for non-interactive commands where output is needed by the AI.',
  parametersSchema: executeShellCommandParamsSchema,
  async execute(
    params,
    context
  ): Promise<ToolResult<ShellCommandResultData>> {
    const { command, timeoutMs } = params;
    const workspaceFolder = context.vscodeAPI.workspace.workspaceFolders?.[0]?.uri.fsPath;

    if (!workspaceFolder) {
      return { success: false, error: 'No workspace folder found. Cannot determine current working directory for shell command.' };
    }

    try {
      context.dispatcher.systemInfo(`Executing shell command: "${command}" in ${workspaceFolder}`, { toolName: 'executeShellCommand', command, cwd: workspaceFolder, timeoutMs }, context.chatId);

      const { stdout, stderr } = await execPromise(command, {
        cwd: workspaceFolder,
        timeout: timeoutMs,
        shell: process.env.SHELL || undefined 
      });
      
     
      return {
        success: true,
        data: { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: 0 }
      };

    } catch (error: any) {
     
      const stdout = error.stdout?.toString().trim() || '';
      const stderr = error.stderr?.toString().trim() || '';
      const exitCode = typeof error.code === 'number' ? error.code : null;
      const signal = error.signal?.toString() || undefined;

      const errorMessage = `Command "${command}" failed. Exit code: ${exitCode ?? 'N/A'}${signal ? `, Signal: ${signal}` : ''}. Stderr: ${stderr || 'N/A'}`;
      
   
      return {
        success: false,
        error: errorMessage,
        data: { stdout, stderr, exitCode, signal }
      };
    }
  }
};