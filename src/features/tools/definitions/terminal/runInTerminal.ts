import { ToolDefinition } from '@features/tools/types';
import { z } from 'zod';

// No importes 'child_process' o 'util' en el nivel superior.
// Los cargaremos dinámicamente dentro de la función.

export const runInTerminal: ToolDefinition<any, any> = {
  name: 'runInTerminal',
  description: 'Executes a shell command in the workspace root and returns its output. Use for installations (npm, pip), running scripts, git commands, etc.',
  parametersSchema: z.object({
    command: z.string().describe('The command to execute (e.g., "npm install", "ls -l").'),
  }),
  execute: async (params, context) => {
    // --- Carga dinámica de módulos de Node.js ---
    const cp = await import('node:child_process');
    const util = await import('node:util');
    const execPromise = util.promisify(cp.exec);
    // ---------------------------------------------

    const workspaceFolder = context.vscodeAPI.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return {
        success: false,
        error: "No workspace folder is open. Cannot determine where to run the command.",
      };
    }

    try {
      context.dispatcher.systemInfo(`Executing command in terminal: ${params.command}`, { command: params.command }, 'runInTerminal');

      const { stdout, stderr } = await execPromise(params.command, {
        cwd: workspaceFolder.uri.fsPath, // Ejecutar en la raíz del workspace
      });

      if (stderr && !stdout) { // A veces hay warnings en stderr pero el comando funciona
        console.warn(`[runInTerminal] Command "${params.command}" produced an error output:`, stderr);
        return {
          success: true, // La herramienta funcionó, pero el comando puede haber fallado
          data: {
            message: "Command executed, but produced errors or warnings.",
            output: stderr.trim(),
          }
        };
      }

      const output = stdout.trim();
      const truncatedOutput = output.length > 2000 ? output.substring(0, 2000) + "\n... (output truncated)" : output;

      return {
        success: true,
        data: {
          message: "Command executed successfully.",
          // Si hay stderr (warnings) y stdout, los combinamos
          output: (stderr ? `Warnings:\n${stderr.trim()}\n\nOutput:\n` : '') + (truncatedOutput || "Command executed with no output."),
        }
      };

    } catch (error: any) {
      console.error(`[runInTerminal] Failed to execute command "${params.command}":`, error);
      // El error de exec a menudo incluye stdout/stderr, que es información valiosa
      const errorMessage = `Failed to execute command. Reason: ${error.message}\n\nSTDOUT:\n${error.stdout}\n\nSTDERR:\n${error.stderr}`;
      return {
        success: false,
        error: errorMessage,
      };
    }
  },
};