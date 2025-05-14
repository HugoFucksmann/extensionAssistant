import { ToolRunner } from "../../tools/core/toolRunner";
import { IExecutor } from "./types";

/**
 * ToolExecutor implements the IExecutor interface for tool-based actions.
 * It delegates to ToolRunner for actual execution and tool discovery.
 * Handles tool names with module prefixes (e.g., 'filesystem.getFileContents').
 */
export class ToolExecutor implements IExecutor {
  /**
   * Checks if this executor can handle the specified tool action
   * @param action The tool name (potentially with module prefix) to check
   * @returns true if the tool exists in ToolRunner
   */
  canExecute(action: string): boolean {
    // ToolRunner.listTools() now returns names like 'filesystem.getFileContents'
    return ToolRunner.listTools().includes(action);
  }

  /**
   * Executes the specified tool with the provided parameters
   * @param action The tool name (potentially with module prefix) to execute
   * @param params Parameters required by the tool. These are the resolved parameters
   *               provided by StepExecutor.
   * @returns Promise resolving to the result of the tool execution
   */
  async execute(action: string, params: Record<string, any>): Promise<any> {
    // ToolRunner.runTool expects the full tool name and resolved parameters
    return ToolRunner.runTool(action, params);
  }
}