// src/features/tools/definitions/terminal/runInTerminal.ts
import { ToolDefinition, ToolResult } from '../../types';
import { z } from 'zod';

export const runInTerminalParamsSchema = z.object({
  command: z.string().min(1, { message: "Command cannot be empty." }).describe('The command to execute in the terminal (e.g., "npm install", "ls -l").'),
});

type RunInTerminalResultData = {
  terminalName: string;
  commandSent: boolean;
};

export const runInTerminal: ToolDefinition<typeof runInTerminalParamsSchema, RunInTerminalResultData> = {
  name: 'runInTerminal',
  description: 'Executes a shell command in a new, visible VS Code terminal named "Extension Assistant". Use for installations (npm, pip), running scripts, git commands, etc. This command does not return the output, it only confirms execution.',
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

    try {
      context.dispatcher.systemInfo(`Executing command in VS Code terminal: ${command}`, { command }, 'runInTerminal');

      let terminal = context.vscodeAPI.window.terminals.find(t => t.name === 'Extension Assistant');
      if (!terminal || terminal.exitStatus) { // Create new if not found or if it was closed
        terminal = context.vscodeAPI.window.createTerminal({
          name: 'Extension Assistant',
          cwd: workspaceFolder.uri,
        });
      }

      terminal.show();
      terminal.sendText(command, true); // true to execute the command immediately

      return {
        success: true,
        data: {
          terminalName: 'Extension Assistant',
          commandSent: true,
        },
      };
    } catch (error: any) {
      console.error(`[runInTerminal] Failed to execute command "${command}":`, error);
      return {
        success: false,
        error: `Failed to send command to terminal. Reason: ${error.message}`,
      };
    }
  },
};