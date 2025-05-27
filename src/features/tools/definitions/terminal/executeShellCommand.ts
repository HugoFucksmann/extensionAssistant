// src/features/tools/definitions/terminal/executeShellCommand.ts
import * as vscode from 'vscode';
import { ToolDefinition, ToolPermission, ToolResult, ToolExecutionContext } from '../../types';
import { exec } from 'child_process'; // Usaremos child_process para capturar salida directamente
import * as util from 'util';

const execPromise = util.promisify(exec);

export const executeShellCommand: ToolDefinition = {
  name: 'executeShellCommand',
  description: 'Executes a shell command silently in the background and captures its standard output and error. Runs in the workspace root by default. Use for non-interactive commands where output is needed.',
  parameters: {
    command: { type: 'string', description: 'The shell command to execute.', required: true },
    // cwd: { type: 'string', description: 'Optional current working directory relative to workspace. Defaults to workspace root.', required: false } // Omitido por simplicidad
    timeoutMs: { type: 'number', description: 'Optional timeout in milliseconds for the command execution.', default: 30000, required: false }
  },
  requiredPermissions: ['terminal.execute'], // Podría ser un permiso más granular si se diferencia de 'runInTerminal'
  async execute(
    params: { command: string; timeoutMs?: number },
    context?: ToolExecutionContext
  ): Promise<ToolResult<{ stdout: string; stderr: string; exitCode: number | null }>> {
    if (!context?.vscodeAPI) {
      return { success: false, error: 'VSCode API context not available.' };
    }
    const { command, timeoutMs = 30000 } = params;
    const workspaceFolder = context.vscodeAPI.workspace.workspaceFolders?.[0]?.uri.fsPath;

    if (!workspaceFolder) {
      return { success: false, error: 'No workspace folder found to determine current working directory.' };
    }

    try {
      context?.dispatcher?.systemInfo(`Executing shell command: ${command}`, { toolName: 'executeShellCommand', command, cwd: workspaceFolder, timeoutMs }, context.chatId);

      const { stdout, stderr } = await execPromise(command, { 
        cwd: workspaceFolder, // Siempre ejecuta en la raíz del workspace
        timeout: timeoutMs,
        shell: process.env.SHELL || undefined // Usa el shell del sistema para mejor compatibilidad con pipes, etc.
      });

      // Incluso si hay stderr, el comando puede haber tenido éxito (código de salida 0)
      // Algunas herramientas usan stderr para mensajes de progreso o advertencias.
      return { 
        success: true, // Asumimos éxito si no hay error de execPromise
        data: { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: 0 } // exitCode 0 si execPromise no falla
      };

    } catch (error: any) {
      // 'error' de execPromise suele ser un objeto con stdout, stderr, code, signal, etc.
      const stdout = error.stdout?.toString().trim() || '';
      const stderr = error.stderr?.toString().trim() || '';
      const exitCode = typeof error.code === 'number' ? error.code : null;

      context?.dispatcher?.systemError('Error executing shell command', error, 
        { toolName: 'executeShellCommand', command, cwd: workspaceFolder, stdout, stderr, exitCode, chatId: context.chatId }
      );
      
      // Devolvemos success: false porque el comando falló (exit code != 0 o error de ejecución)
      // pero incluimos stdout/stderr porque pueden ser útiles para el LLM.
      return { 
        success: false, 
        error: `Command "${command}" failed with exit code ${exitCode || 'unknown'}. Stderr: ${stderr || 'N/A'}`,
        data: { stdout, stderr, exitCode }
      };
    }
  }
};