import * as vscode from 'vscode';
import { ToolDefinition, ToolResult, ToolExecutionContext, ToolPermission } from '../types';
import { exec } from 'child_process'; // Para getTerminalOutput si no usamos Pseudoterminal
import * as util from 'util';

const execPromise = util.promisify(exec);

export const runTerminalCommand: ToolDefinition = {
  name: 'runTerminalCommand',
  description: 'Runs a command in a new VS Code terminal. Does not capture output directly, user sees it in the terminal.',
  parameters: {
    command: { type: 'string', description: 'The command to run.', required: true },
    terminalName: { type: 'string', description: 'Optional name for the terminal.', default: 'Tool Execution', required: false },
    cwd: { type: 'string', description: 'Current working directory for the command.', required: false },
  },
  requiredPermissions: ['terminal.execute'],
  async execute(params: { command: string; terminalName?: string; cwd?: string }, context?: ToolExecutionContext): Promise<ToolResult> {
    if (!context?.vscodeAPI) return { success: false, error: 'VSCode API context not available.' };
    const { command, terminalName = 'Tool Execution', cwd } = params;
    
    try {
      // ANTES DE EJECUTAR: Verificar permisos
      const term = context.vscodeAPI.window.createTerminal({ 
        name: terminalName,
        cwd: cwd || context.vscodeAPI.workspace.workspaceFolders?.[0]?.uri.fsPath 
      });
      term.sendText(command, true); // true to execute immediately
      term.show();
      return { success: true, data: { message: `Command "${command}" sent to terminal "${terminalName}".` } };
    } catch (error: any) {
      return { success: false, error: `Failed to run command in terminal: ${error.message}` };
    }
  }
};

// getTerminalOutput es más complejo debido a la captura de salida.
// Opción 1: Usar child_process (no se ve en la terminal de VS Code)
// Opción 2: Pseudoterminal (complejo)
// Opción 3: Pedir al usuario que copie (usar askUserForInput)
// Aquí implemento Opción 1 como ejemplo, pero tiene desventajas.
export const getTerminalOutput: ToolDefinition = {
  name: 'getTerminalOutput',
  description: 'Executes a shell command and captures its stdout and stderr. Command runs in the background, not in a visible VS Code terminal.',
  parameters: {
    command: { type: 'string', description: 'The command to execute.', required: true },
    cwd: { type: 'string', description: 'Current working directory.', required: false },
    timeoutMs: { type: 'number', description: 'Timeout in milliseconds.', default: 30000, required: false },
  },
  requiredPermissions: ['terminal.execute'], // Considerar un permiso más granular si es necesario
  async execute(params: { command: string; cwd?: string; timeoutMs?: number }, context?: ToolExecutionContext): Promise<ToolResult> {
    const { command, cwd, timeoutMs = 30000 } = params;
    const workspaceFolder = context?.vscodeAPI.workspace.workspaceFolders?.[0]?.uri.fsPath;

    try {
      // ANTES DE EJECUTAR: Verificar permisos
      const { stdout, stderr } = await execPromise(command, { 
        cwd: cwd || workspaceFolder,
        timeout: timeoutMs 
      });

      if (stderr) {
        // Considerar si stderr siempre es un error o a veces es info/warning
        return { success: true, data: { stdout, stderr }, warnings: [`Command produced stderr: ${stderr}`] };
      }
      return { success: true, data: { stdout } };
    } catch (error: any) {
      // error de execPromise a menudo tiene stdout/stderr también
      return { 
        success: false, 
        error: `Command execution failed: ${error.message}`,
        data: { stdout: error.stdout, stderr: error.stderr } // Incluir si existen
      };
    }
  }
};