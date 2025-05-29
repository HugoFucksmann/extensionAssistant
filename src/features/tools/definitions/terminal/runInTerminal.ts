// src/features/tools/definitions/terminal/runInTerminal.ts
import * as vscode from 'vscode';
import { z } from 'zod';
import { ToolDefinition, ToolResult, ToolExecutionContext, ToolPermission } from '../../types';

// Esquema Zod para los parámetros
export const runInTerminalParamsSchema = z.object({
  command: z.string().min(1, { message: "Command to run cannot be empty." }),
  terminalName: z.string().optional().default('AI Assistant Task').describe("Optional name for the terminal. If a terminal with this name exists, it will be reused. Defaults to 'AI Assistant Task'."),
  focus: z.boolean().optional().default(true).describe("Whether to show and focus the terminal panel after sending the command. Defaults to true.")
}).strict();

type RunInTerminalResultData = {
  terminalName: string;
  commandSent: boolean;
};

export const runInTerminal: ToolDefinition<typeof runInTerminalParamsSchema, RunInTerminalResultData> = {
  name: 'runInTerminal',
  description: 'Opens a new VS Code terminal (or uses/creates one with the specified name) and runs the given command. Does not capture output for the AI. Use for interactive commands, long-running tasks, or when output capture by the AI is not needed.',
  parametersSchema: runInTerminalParamsSchema,
  async execute(
    params,
    context
  ): Promise<ToolResult<RunInTerminalResultData>> {
    const { command, terminalName, focus } = params;
    const workspaceFolderUri = context.vscodeAPI.workspace.workspaceFolders?.[0]?.uri;

    try {
      context.dispatcher.systemInfo(`Running command in terminal: "${command}"`, { toolName: 'runInTerminal', command, terminalName, focus }, context.chatId);

      let term = context.vscodeAPI.window.terminals.find(t => t.name === terminalName && !t.exitStatus);
      if (!term) {
        term = context.vscodeAPI.window.createTerminal({
          name: terminalName,
          cwd: workspaceFolderUri // undefined si no hay workspace, el terminal se abrirá en el home del usuario
        });
      }
      
      term.sendText(command); // sendText se encarga de añadir el salto de línea si es necesario para ejecutar
      if (focus) {
        term.show(false); // false para no robar el foco del editor de texto, solo mostrar el panel
      }
      
      return { success: true, data: { terminalName: term.name, commandSent: true } };
    } catch (error: any) {
      return { success: false, error: `Failed to run command "${command}" in terminal: ${error.message}` };
    }
  }
};