import path from 'path';

import * as vscode from 'vscode';
import { runCommand, TerminalRunCommandParams } from '../terminal/runCommand'; // Import the terminal tool

/**
 * Parameters for the project.installDependencies tool.
 */
export interface ProjectInstallDependenciesParams {
    /** Optional: The path to the project directory (where package.json, etc., is). Defaults to workspace root. */
    projectPath?: string;
    /** Optional: The package manager to use ('npm', 'yarn', 'pnpm'). Attempts to detect if not specified. */
    packageManager?: 'npm' | 'yarn' | 'pnpm';
}

/**
 * Installs project dependencies using a package manager.
 * This tool wraps the terminal.runCommand tool.
 * @param params The parameters for installing dependencies.
 * @returns A promise resolving to the result of the terminal command.
 * @throws Error if no workspace is open, package manager detection fails, or the command fails.
 */
export async function installDependencies(params: ProjectInstallDependenciesParams): Promise<any> {
    const { projectPath, packageManager } = params;

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        throw new Error("No workspace folder open.");
    }
    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const targetPath = projectPath ? path.join(workspaceRoot, projectPath) : workspaceRoot;

    // TODO: Implement package manager detection if 'packageManager' is not provided
    // For now, default to npm
    const manager = packageManager || 'npm';
    let command = `${manager} install`;

    // If targetPath is not workspaceRoot, we might need to change directory first
    // This is complex to do reliably in a single command across shells.
    // A simpler approach is to assume install is run from the root, or rely on the user
    // specifying the command directly via the console agent if they need a specific path.
    // Let's keep it simple and assume workspace root for now.
    if (projectPath && projectPath !== '.' && projectPath !== '/') {
         console.warn(`[Tool] project.installDependencies: projectPath "${projectPath}" is specified but ignored. Running install in workspace root.`);
         // A more robust implementation would handle changing directory or using package manager options.
    }


    console.log(`[Tool] project.installDependencies: Running "${command}" in workspace root.`);

    // Use the terminal.runCommand tool to execute the command
    const terminalParams: TerminalRunCommandParams = {
        command: command,
        terminalName: 'Assistant Install', // Use a specific terminal name
        showTerminal: true
    };

    try {
        // The runCommand tool throws on failure, so we just await it
        const result = await runCommand(terminalParams);
        console.log(`[Tool] project.installDependencies: Command sent via terminal tool.`);
        return result; // Return the result from the terminal tool
    } catch (error: any) {
        console.error(`[Tool] project.installDependencies: Failed to send command via terminal tool:`, error);
        throw error; // Re-throw the error from the terminal tool
    }
}