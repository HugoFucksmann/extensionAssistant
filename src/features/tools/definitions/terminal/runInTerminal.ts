// src/features/tools/definitions/terminal/runInTerminal.ts
import { z } from 'zod';
import { ToolDefinition, ToolResult, } from '../../types';


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
  getUIDescription: (params) => `Ejecutar en terminal: ${params?.command || ''}`,
  uiFeedback: false,
  mapToOutput: (rawData, success, errorMsg) => success && rawData ? {
    title: 'Comando enviado a terminal',
    summary: 'Comando enviado correctamente.',
    details: `Terminal: ${rawData.terminalName}`,
    items: [],
    meta: { terminalName: rawData.terminalName, commandSent: rawData.commandSent }
  } : {
    title: 'Error al ejecutar en terminal',
    summary: `Error: ${errorMsg || 'No se pudo ejecutar el comando.'}`,
    details: errorMsg,
    items: [],
    meta: {}
  },
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
          cwd: workspaceFolderUri
        });
      }

      term.sendText(command);
      if (focus) {
        term.show(false);
      }

      return { success: true, data: { terminalName: term.name, commandSent: true } };
    } catch (error: any) {
      return { success: false, error: `Failed to run command "${command}" in terminal: ${error.message}`, data: undefined };
    }
  }
};