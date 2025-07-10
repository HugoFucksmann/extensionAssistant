// src/features/tools/definitions/terminal/runInTerminal.ts
import { ToolDefinition, ToolResult } from '../../types';
import { z } from 'zod';

export const runInTerminalParamsSchema = z.object({
  command: z.string().min(1, { message: "Command cannot be empty." }).describe('The command to execute in the terminal (e.g., "npm install", "ls -l").'),
});

type RunInTerminalResultData = {
  stdout: string;
  stderr: string;
};

export const runInTerminal: ToolDefinition<typeof runInTerminalParamsSchema, RunInTerminalResultData> = {
  name: 'runInTerminal',
  description: 'Executes a shell command and returns its standard output and error. Use for non-interactive commands like `ls`, `git status`, `cat file`, etc.',
  parametersSchema: runInTerminalParamsSchema,
  uiFeedback: true,
  getUIDescription: (params) => `Ejecutar en terminal: ${params.command}`,

  async execute(params, context): Promise<ToolResult<RunInTerminalResultData>> {
    const { command } = params;
    const workspaceFolder = context.vscodeAPI.workspace.workspaceFolders?.[0];

    if (!workspaceFolder) {
      return {
        success: false,
        error: "No workspace folder is open. Cannot determine where to run the command.",
      };
    }

    const { exec } = await import('child_process');
    const util = await import('util');
    const execPromise = util.promisify(exec);

    try {
      context.dispatcher.systemInfo(`Executing command: ${command}`, { command }, 'runInTerminal');
      
      const { stdout, stderr } = await execPromise(command, { cwd: workspaceFolder.uri.fsPath });

      if (stderr) {
        console.warn(`[runInTerminal] Command "${command}" produced stderr:`, stderr);
        // We'll return stderr along with stdout, as some tools use stderr for progress info
      }

      return {
        success: true,
        data: {
          stdout,
          stderr,
        },
      };
    } catch (error: any) {
      console.error(`[runInTerminal] Failed to execute command "${command}":`, error);
      return {
        success: false,
        error: `Command execution failed: ${error.message}`,
        data: {
          stdout: error.stdout,
          stderr: error.stderr,
        }
      };
    }
  },
};