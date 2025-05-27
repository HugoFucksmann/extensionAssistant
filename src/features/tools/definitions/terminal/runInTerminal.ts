// src/features/tools/definitions/terminal/runInTerminal.ts
import * as vscode from 'vscode';
import { ToolDefinition, ToolPermission, ToolResult, ToolExecutionContext } from '../../types';

export const runInTerminal: ToolDefinition = {
  name: 'runInTerminal',
  description: 'Opens a new VS Code terminal (or uses/creates one with the specified name) and runs the given command. Does not capture output. Use for interactive commands or when output capture by the AI is not needed.',
  parameters: {
    command: { type: 'string', description: 'The command to run in the VS Code terminal.', required: true },
    terminalName: { type: 'string', description: 'Optional name for the terminal. If a terminal with this name exists, it will be reused.', default: 'AI Assistant Task', required: false },
    // cwd: { type: 'string', description: 'Optional current working directory relative to workspace. Defaults to workspace root.', required: false } // Omitido por simplicidad
    focus: { type: 'boolean', description: 'Whether to focus the terminal after sending the command.', default: true, required: false }
  },
  requiredPermissions: ['terminal.execute'],
  async execute(
    params: { command: string; terminalName?: string; focus?: boolean },
    context?: ToolExecutionContext
  ): Promise<ToolResult<{ terminalName: string; commandSent: boolean }>> {
    if (!context?.vscodeAPI) {
      return { success: false, error: 'VSCode API context not available.' };
    }
    const { command, terminalName = 'AI Assistant Task', focus = true } = params;
    const workspaceFolderUri = context.vscodeAPI.workspace.workspaceFolders?.[0]?.uri;

    try {
      context?.dispatcher?.systemInfo(`Running command in terminal: ${command}`, { toolName: 'runInTerminal', command, terminalName, focus }, context.chatId);

      let term = context.vscodeAPI.window.terminals.find(t => t.name === terminalName);
      if (!term) {
        term = context.vscodeAPI.window.createTerminal({ 
          name: terminalName,
          cwd: workspaceFolderUri // Ejecuta en la raíz del workspace por defecto
        });
      }
      
      term.sendText(command); // No añadir \r o \n, sendText lo maneja o el comando debe incluirlo si es multilínea
      if (focus) {
        term.show(false); // false para no tomar el foco del cursor de texto, solo mostrar el panel
      }
      
      return { success: true, data: { terminalName: term.name, commandSent: true } };
    } catch (error: any) {
      context?.dispatcher?.systemError('Error running command in terminal', error, 
        { toolName: 'runInTerminal', params, chatId: context.chatId }
      );
      return { success: false, error: `Failed to run command "${command}" in terminal: ${error.message}` };
    }
  }
};