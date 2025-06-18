// src/features/tools/definitions/terminal/runInTerminal.ts
import { ToolDefinition, ToolResult } from '@features/tools/types';
import { z } from 'zod';
import { RunInTerminalToolOutput } from '@features/tools/toolOutputTypes';

// --- CAMBIO CLAVE: Se añade un esquema de parámetros explícito ---
export const runInTerminalParamsSchema = z.object({
  command: z.string().describe('The command to execute in the terminal (e.g., "npm install", "ls -l").'),
});

// --- CAMBIO CLAVE: Se usan los tipos correctos en la definición ---
export const runInTerminal: ToolDefinition<typeof runInTerminalParamsSchema, RunInTerminalToolOutput['items'][0]> = {
  name: 'runInTerminal',
  description: 'Executes a shell command in a new, visible VS Code terminal named "Extension Assistant". Use for installations (npm, pip), running scripts, git commands, etc. This command does not return the output, it only confirms execution.',
  parametersSchema: runInTerminalParamsSchema,
  getUIDescription: (params) => `Ejecutar en terminal: ${params.command}`,
  uiFeedback: true,
  execute: async (params, context): Promise<ToolResult<RunInTerminalToolOutput['items'][0]>> => {
    const { command } = params;
    const workspaceFolder = context.vscodeAPI.workspace.workspaceFolders?.[0];

    if (!workspaceFolder) {
      return {
        success: false,
        error: "No workspace folder is open. Cannot determine where to run the command.",
      };
    }

    try {
      // --- CAMBIO CLAVE: Lógica de ejecución en terminal de VS Code ---
      context.dispatcher.systemInfo(`Executing command in VS Code terminal: ${command}`, { command }, 'runInTerminal');

      // Busca una terminal existente o crea una nueva.
      let terminal = context.vscodeAPI.window.terminals.find(t => t.name === 'Extension Assistant');
      if (!terminal) {
        terminal = context.vscodeAPI.window.createTerminal({
          name: 'Extension Assistant',
          cwd: workspaceFolder.uri,
        });
      }

      // Muestra la terminal y envía el comando.
      terminal.show();
      terminal.sendText(command, true); // El segundo argumento 'true' ejecuta el comando.

      return {
        success: true,
        data: {
          terminalName: 'Extension Assistant',
          commandSent: true,
        },
      };
      // --- FIN DEL CAMBIO CLAVE ---

    } catch (error: any) {
      console.error(`[runInTerminal] Failed to execute command "${command}":`, error);
      const errorMessage = `Failed to send command to terminal. Reason: ${error.message}`;
      return {
        success: false,
        error: errorMessage,
      };
    }
  },
};