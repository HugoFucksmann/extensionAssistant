// src/tools/interfaces.ts

/**
 * Interface for a service that executes registered tools.
 */
export interface IToolRunner {
    /**
     * Executes a specific tool after validating its parameters.
     * @param toolName The full name of the tool (e.g., 'filesystem.getFileContents')
     * @param params Parameters object for the tool. Defaults to an empty object.
     * @returns The result of the tool execution.
     * @throws Error if the tool is not found, validation fails, or the tool execution fails.
     */
    runTool(toolName: string, params?: Record<string, any>): Promise<any>;

    /**
     * Executes multiple tools sequentially (concurrency limit is ignored in this version).
     * @param toolsToRun Array of tools to execute (with full name and optional params).
     * @param concurrencyLimit Number maximum of tools to execute simultaneously (ignored).
     * @returns A record mapping tool names to their results and errors.
     */
    runParallel(
        toolsToRun: Array<{ name: string; params?: Record<string, any> }>,
        concurrencyLimit?: number
    ): Promise<{ results: Record<string, any>, errors: Record<string, any> }>;

    /**
     * Lists all available tools (full names).
     */
    listTools(): string[];
}