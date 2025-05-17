// src/orchestrator/execution/ToolExecutor.ts
import { IToolRunner } from "../../tools";
import { IExecutor } from "./types"; 

/**
 * ToolExecutor implements the IExecutor interface for tool-based actions.
 * It delegates to the injected IToolRunner for actual execution and tool discovery.
 * Handles tool names with module prefixes (e.g., 'filesystem.getFileContents').
 */
export class ToolExecutor implements IExecutor {
  private readonly toolRunner: IToolRunner; 

  
  constructor(toolRunner: IToolRunner) { 
    this.toolRunner = toolRunner;
    console.log('[ToolExecutor] Initialized.');
  }

  /**
   * Checks if this executor can handle the specified tool action.
   * It checks if the tool exists in the injected IToolRunner.
   * @param action The tool name (potentially with module prefix) to check
   * @returns true if the tool exists in ToolRunner
   */
  canExecute(action: string): boolean {
   
    const isTool = this.toolRunner.listTools().includes(action);
    return isTool;
  }

  /**
   * Executes the specified tool with the provided parameters.
   * It uses the injected IToolRunner to run the tool.
   * @param action The tool name (potentially with module prefix) to execute (must be a valid ToolName)
   * @param params Parameters required by the tool. These are the resolved parameters
   *               provided by StepExecutor.
   * @returns Promise resolving to the result of the tool execution
   */
  async execute(action: string, params: Record<string, any>): Promise<any> {
   
    return this.toolRunner.runTool(action, params);
  }

  
}