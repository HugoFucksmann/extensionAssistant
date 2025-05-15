// src/tools/terminal/runCommand.ts

import * as vscode from 'vscode';

/**
 * Parameters for the terminal.runCommand tool.
 */
export interface TerminalRunCommandParams {
    /** The command string to run in the terminal. */
    command: string;
    /** Optional: The name of the terminal to use. Creates a new one if not found. */
    terminalName?: string;
    /** Optional: Whether to show the terminal after running the command. Defaults to true. */
    showTerminal?: boolean;
}

/**
 * Runs a command in a VS Code terminal.
 * @param params The parameters for the command.
 * @returns A promise that resolves when the command is sent to the terminal.
 *          Note: Capturing output is more complex and not implemented here.
 */
export async function runCommand(params: TerminalRunCommandParams): Promise<{ success: boolean; command: string; terminalName: string; message?: string }> {
    const { command, terminalName = 'Assistant Terminal', showTerminal = true } = params;

    console.log(`[Tool] terminal.runCommand: Running command "${command}" in terminal "${terminalName}"`);

    try {
        let terminal = vscode.window.terminals.find(t => t.name === terminalName);

        if (!terminal) {
            console.log(`[Tool] terminal.runCommand: Creating new terminal "${terminalName}"`);
            terminal = vscode.window.createTerminal(terminalName);
        }

        if (showTerminal) {
            terminal.show(true); // Preserve focus if already focused
        }

        // Send the command text followed by a newline to execute it
        terminal.sendText(command + '\n');

        console.log(`[Tool] terminal.runCommand: Command sent successfully.`);

        // Note: This tool currently doesn't wait for command completion or capture output.
        // A more advanced version would need to monitor the terminal or use tasks API.
        return {
            success: true,
            command: command,
            terminalName: terminalName,
            message: `Command "${command}" sent to terminal "${terminalName}".`
        };

    } catch (error: any) {
        console.error(`[Tool] terminal.runCommand: Failed to run command "${command}":`, error);
        throw new Error(`Failed to run command "${command}": ${error.message || String(error)}`);
    }
}