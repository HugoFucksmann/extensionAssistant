import path from 'path';

import * as vscode from 'vscode';
import { runCommand, TerminalRunCommandParams } from '../terminal/runCommand'; // Import the terminal tool

/**
 * Parameters for the project.addDependency tool.
 */
export interface ProjectAddDependencyParams {
    /** The name of the package(s) to add (e.g., 'react', 'lodash @types/lodash'). Can be a single string or an array. */
    packageName: string | string[];
    /** Optional: Whether to save as a dev dependency. Defaults to false. */
    dev?: boolean;
    /** Optional: The package manager to use ('npm', 'yarn', 'pnpm'). Attempts to detect if not specified. */
    packageManager?: 'npm' | 'yarn' | 'pnpm';
    /** Optional: The path to the project directory (where package.json, etc., is). Defaults to workspace root. */
    projectPath?: string;
}

/**
 * Adds a package dependency using a package manager.
 * This tool wraps the terminal.runCommand tool.
 * @param params The parameters for adding the dependency.
 * @returns A promise resolving to the result of the terminal command.
 * @throws Error if no workspace is open, package name is missing, package manager detection fails, or the command fails.
 */
export async function addDependency(params: ProjectAddDependencyParams): Promise<any> {
    const { packageName, dev = false, packageManager, projectPath } = params;

    if (!packageName || (Array.isArray(packageName) && packageName.length === 0)) {
        throw new Error("Package name(s) must be specified.");
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        throw new Error("No workspace folder open.");
    }
    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const targetPath = projectPath ? path.join(workspaceRoot, projectPath) : workspaceRoot;

    // TODO: Implement package manager detection if 'packageManager' is not provided
    // For now, default to npm
    const manager = packageManager || 'npm';
    const packages = Array.isArray(packageName) ? packageName.join(' ') : packageName;

    let command: string;
    switch (manager) {
        case 'npm':
            command = `npm install ${packages}${dev ? ' --save-dev' : ''}`;
            break;
        case 'yarn':
            command = `yarn add ${packages}${dev ? ' --dev' : ''}`;
            break;
        case 'pnpm':
            command = `pnpm add ${packages}${dev ? ' --save-dev' : ''}`;
            break;
        default:
            throw new Error(`Unsupported package manager: ${manager}`);
    }

     // If targetPath is not workspaceRoot, we might need to change directory first
    // Let's keep it simple and assume workspace root for now, similar to installDependencies.
    if (projectPath && projectPath !== '.' && projectPath !== '/') {
         console.warn(`[Tool] project.addDependency: projectPath "${projectPath}" is specified but ignored. Running command in workspace root.`);
         // A more robust implementation would handle changing directory or using package manager options.
    }

    console.log(`[Tool] project.addDependency: Running "${command}" in workspace root.`);

    // Use the terminal.runCommand tool to execute the command
    const terminalParams: TerminalRunCommandParams = {
        command: command,
        terminalName: 'Assistant Install', // Use the same terminal name as install
        showTerminal: true
    };

    try {
        // The runCommand tool throws on failure, so we just await it
        const result = await runCommand(terminalParams);
        console.log(`[Tool] project.addDependency: Command sent via terminal tool.`);
        return result; // Return the result from the terminal tool
    } catch (error: any) {
        console.error(`[Tool] project.addDependency: Failed to send command via terminal tool:`, error);
        throw error; // Re-throw the error from the terminal tool
    }
}