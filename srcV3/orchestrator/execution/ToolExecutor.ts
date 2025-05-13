import { ToolRunner } from "../../services/toolRunner";
import { IExecutor } from "./types";

/**
 * ToolExecutor implements the IExecutor interface for tool-based actions.
 * It delegates to ToolRunner for actual execution and tool discovery.
 */
export class ToolExecutor implements IExecutor {
  /**
   * Checks if this executor can handle the specified tool action
   * @param action The tool name to check
   * @returns true if the tool exists in ToolRunner
   */
  canExecute(action: string): boolean {
    return ToolRunner.listTools().includes(action);
  }

  /**
   * Executes the specified tool with the provided parameters
   * @param action The tool name to execute
   * @param params Parameters required by the tool
   * @returns Promise resolving to the result of the tool execution
   */
  async execute(action: string, params: Record<string, any>): Promise<any> {
    return ToolRunner.runTool(action, params);
  }
}