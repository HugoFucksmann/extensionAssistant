// src/tools/toolRunner.ts

import * as vscode from 'vscode';

import { IToolRunner } from './interfaces';
import { IWorkspaceService } from '../../workspace/interfaces';
import { getActiveEditorContent } from '../editor';
import { getPackageDependencies, getProjectInfo, searchWorkspace } from '../project';
import { applyWorkspaceEdit } from '../codeManipulation';


// Define a type for the tool function itself, including the attached properties
type ToolFunction = ((params: Record<string, any>) => Promise<any>) & {
  validateParams?: (params: Record<string, any>) => boolean | string;
  requiredParams?: string[];
};

// Interface for the entry in the ToolRegistry
interface ToolEntry {
    execute: ToolFunction; // The tool function with potential validation properties
    requiredParams?: string[];
  }

type ToolRegistry = Record<string, ToolEntry>;

// Implement the IToolRunner interface
export class ToolRunner implements IToolRunner { // <-- Added implements

  // The TOOLS registry maps tool names to the imported functions or internal methods.
  // We now rely on the imported function object having the validateParams/requiredParams properties.
  // This is now an instance property to access the injected workspaceService.
  private readonly TOOLS: ToolRegistry; // <-- Made instance property

  // Inject IWorkspaceService dependency
  constructor(private workspaceService: IWorkspaceService) { // <-- Added constructor with dependency
      // Initialize the TOOLS registry here to use the injected dependency
      this.TOOLS = {
          // Filesystem Tools - Now delegate to WorkspaceService
          'filesystem.getWorkspaceFiles': {
              execute: async (params: Record<string, any>) => {
                   // Validation can be added here if needed, or rely on WorkspaceService
                   return this.workspaceService.listWorkspaceFiles();
              },
              // No specific params validation needed here, WorkspaceService handles internal logic
          },
          'filesystem.getFileContents': {
              execute: async (params: Record<string, any>) => {
                  // Validate params before calling WorkspaceService
                  if (params.filePath === undefined || params.filePath === null || typeof params.filePath !== 'string') {
                      throw new Error("Parameter 'filePath' is required and must be a string.");
                  }
                  // WorkspaceService handles file not found/read errors
                  return this.workspaceService.getFileContent(params.filePath);
              },
              requiredParams: ['filePath'] // Keep validation definition here for consistency
          },

          // Editor Tools
          'editor.getActiveEditorContent': { execute: getActiveEditorContent as ToolFunction },

          // Project Tools
          'project.getPackageDependencies': { execute: getPackageDependencies as ToolFunction },
          'project.getProjectInfo': { execute: getProjectInfo as ToolFunction },
          'project.searchWorkspace': { execute: searchWorkspace as ToolFunction },

          // Code Manipulation Tools
          'codeManipulation.applyWorkspaceEdit': { execute: applyWorkspaceEdit as ToolFunction },
      };
       console.log('[ToolRunner] Initialized with WorkspaceService.'); // Added log
  }


  /**
   * Executes a specific tool after validating its parameters.
   * Standardizes error handling and user feedback.
   * @param toolName The full name of the tool (e.g., 'filesystem.getFileContents')
   * @param params Parameters object for the tool. Defaults to an empty object.
   * @returns The result of the tool execution.
   * @throws Error if the tool is not found, validation fails, or the tool execution fails.
   */
  public async runTool( // <-- Removed static
    toolName: string,
    params: Record<string, any> = {}
  ): Promise<any> {
    const toolEntry = this.TOOLS[toolName]; // Access instance property
    if (!toolEntry) {
      const error = new Error(`Tool not registered: ${toolName}`);
      console.error('[ToolRunner]', error.message);
      // Show error message in VS Code UI
      // Note: Showing UI messages from a service might be questionable depending on architecture.
      // Ideally, errors are returned/thrown and handled by the UI layer.
      // For now, keeping it as it was.
      vscode.window.showErrorMessage(`Error executing tool: Tool '${toolName}' not registered.`);
      throw error;
    }

    const toolFunction = toolEntry.execute;

    // --- Parameter Validation ---
    // Check for validateParams property first
    if (typeof toolFunction.validateParams === 'function') {
      const validationResult = toolFunction.validateParams(params);
      if (typeof validationResult === 'string') {
        const error = new Error(`Validation Error for ${toolName}: ${validationResult}`);
        console.error('[ToolRunner]', error.message);
        vscode.window.showErrorMessage(`Error executing tool ${toolName}: ${validationResult}`);
        throw error;
      }
    }
    // If no validateParams, check for requiredParams property
    else if (Array.isArray(toolEntry.requiredParams)) { // <-- Check on toolEntry, not toolFunction
      for (const param of toolEntry.requiredParams) { // <-- Check on toolEntry
        if (params[param] === undefined || params[param] === null) {
          const error = new Error(`Missing required parameter for ${toolName}: ${param}`);
          console.error('[ToolRunner]', error.message);
          vscode.window.showErrorMessage(`Error executing tool ${toolName}: Parameter '${param}' is required.`);
          throw error;
        }
      }
    }
    // --- End Validation ---


    try {
      console.log(`[ToolRunner] Executing tool: ${toolName} with params:`, params);
      // Pass the params object directly to the tool function
      const result = await toolFunction(params);
      console.log(`[ToolRunner] Tool execution successful: ${toolName}`);
      return result;
    } catch (error: any) {
      console.error(`[ToolRunner] Error executing tool ${toolName}:`, error);
      // Show error message in VS Code UI for user feedback
      // Use a more user-friendly message, hiding internal details unless necessary
      const userFacingMessage = `Error executing tool ${toolName}: ${error.message || 'An unknown error occurred.'}`;
      vscode.window.showErrorMessage(userFacingMessage);
      // Re-throw the error for the orchestrator/handler to catch and potentially log more detail
      throw new Error(`Tool execution failed for ${toolName}: ${error.message || String(error)}`);
    }
  }

  /**
   * Executes multiple tools sequentially (concurrency limit is ignored in this version).
   * This function structure is kept for potential future parallel implementation.
   * @param toolsToRun Array of tools to execute (with full name and optional params).
   * @param concurrencyLimit Number maximum of tools to execute simultaneously (ignored).
   * @returns A record mapping tool names to their results and errors.
   */
  public async runParallel( // <-- Removed static
    toolsToRun: Array<{ name: string; params?: Record<string, any> }>,
    concurrencyLimit: number = 0 // concurrencyLimit is ignored in this simplified implementation
  ): Promise<{ results: Record<string, any>, errors: Record<string, any> }> {
      // console.warn("[ToolRunner] runParallel called. Note: Concurrency limit is not fully implemented in this version. Running sequentially.");
      const results: Record<string, any> = {};
      const errors: Record<string, any> = {};

      // Simple sequential execution for now
      for (const { name, params } of toolsToRun) {
          try {
              // Call instance method runTool
              results[name] = await this.runTool(name, params);
          } catch (error: any) {
              // runTool already logs and shows UI message, just store the error here
              errors[name] = error;
              // console.error(`[ToolRunner] Error in parallel execution for tool '${name}':`, error); // runTool already logged
          }
      }

      // The caller can inspect the results and errors objects
      // Returning the map allows the caller to handle partial success.
      return { results, errors };
  }


  /**
   * Lists all available tools (full names).
   *
   * EXTENSIBILITY: To add a new tool, create its implementation file,
   * export the function, attach `validateParams`/`requiredParams` properties if needed,
   * add it to the relevant src/tools/MODULE/index.ts barrel file,
   * ensure it's re-exported in the root src/tools/index.ts,
   * and register it in the TOOLS map here.
   */
  public listTools(): string[] { // <-- Removed static
    return Object.keys(this.TOOLS); // Access instance property
  }

  // Dispose method if needed (e.g., for listeners), but not strictly required for this version
  // dispose(): void { ... }
}