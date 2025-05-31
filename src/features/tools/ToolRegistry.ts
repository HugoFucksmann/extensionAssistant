// src/features/tools/ToolRegistry.ts
import { ToolDefinition, ToolResult, ToolExecutionContext } from './types';
import { InternalEventDispatcher } from '../../core/events/InternalEventDispatcher';
import * as vscode from 'vscode';
import { ToolValidator } from './ToolValidator';
import { generateOperationId } from '../../shared/utils/generateIds';
import { EventType, ToolExecutionEventPayload } from '../../features/events/eventTypes';
import { ToolOutput } from '../../shared/types'; 

import { createDynamicTool, createDynamicToolsFromDefinitions } from '../ai/lcel/DynamicToolAdapter';
import { DynamicStructuredTool } from '@langchain/core/tools';

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition<any, any>>();

  constructor(private dispatcher: InternalEventDispatcher) {
    
  }

  private log(level: 'info' | 'warning' | 'error', message: string, details?: Record<string, any>, errorObj?: Error) {
    const source = 'ToolRegistry';
    switch (level) {
      case 'info':
        this.dispatcher.systemInfo(message, details, source);
        break;
      case 'warning':
        this.dispatcher.systemWarning(message, details, source);
        break;
      case 'error':
        this.dispatcher.systemError(message, errorObj, details, source);
        break;
    }
  }

  public registerTools(toolsToRegister: ToolDefinition<any, any>[]): void {
    for (const tool of toolsToRegister) {
      if (this.tools.has(tool.name)) {
        this.log('warning', `Tool "${tool.name}" is already registered. Overwriting.`, { toolName: tool.name });
      }
      this.tools.set(tool.name, tool);
    }
    this.log('info', `Registered ${toolsToRegister.length} tools. Total tools: ${this.tools.size}.`, { registeredNow: toolsToRegister.map(t => t.name) });
  }

  getTool(name: string): ToolDefinition<any, any> | undefined {
    return this.tools.get(name);
  }

  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  getAllTools(): ToolDefinition<any, any>[] {
    return Array.from(this.tools.values());
  }

  private generateToolUIDescription(toolName: string, params: any, toolDefinition?: ToolDefinition<any,any>): string {
    if (!toolDefinition) return `Executing ${toolName}`;

    const getFileName = (filePath: string | undefined): string => 
        typeof filePath === 'string' ? filePath.split(/[\\/]/).pop() || 'archivo' : 'archivo';

    switch (toolName) {
        case 'getFileContents':
            return `Reading file: ${getFileName(params.path)}`;
        case 'searchInWorkspace':
            return `Searching workspace for: "${params.query}"`;
        case 'writeToFile':
            return `Writing to file: ${getFileName(params.path)}`;
        case 'createFileOrDirectory':
            return `Creating ${params.type || 'item'}: ${getFileName(params.path)}`;
        case 'deletePath':
            return `Deleting: ${getFileName(params.path)}`;
        case 'getActiveEditorInfo':
            return 'Getting active editor information';
        case 'getDocumentDiagnostics':
            return `Getting diagnostics for: ${params.filePath ? getFileName(params.filePath) : 'active editor'}`;
        case 'getGitStatus':
            return 'Getting Git status';
        case 'getProjectSummary':
            return 'Getting project summary';
        case 'runInTerminal':
            return `Running in terminal: "${params.command}"`;
        default:
            return toolDefinition.description || `Executing ${toolName}`;
    }
  }

  private mapToToolOutput(toolName: string, rawData: any, success: boolean, errorMsg?: string): ToolOutput {
    let output: ToolOutput = { message: success ? "Tool executed." : `Error: ${errorMsg || "Unknown error"}` };
    if (!success) {
        output.details = { originalError: errorMsg };
    }

    if (success && rawData) {
        const data = rawData as any;
        switch (toolName) {
            case 'getFileContents':
                output = { filePath: data.filePath, content: data.content, availableFiles: data.availableFiles };
                break;
            case 'createFileOrDirectory':
                output = { filePath: data.path, fileOperationType: data.type, fileOperationStatus: data.operation };
                break;
            case 'deletePath':
                output = { filePath: data.path, fileOperationStatus: data.deleted ? 'deleted' : 'error_not_deleted' };
                break;
            case 'searchInWorkspace':
                output = { query: data.query, results: data.results, totalFound: data.totalFound, searchLimited: data.searchLimited };
                break;
            case 'getActiveEditorInfo':
                if (data) {
                    output = {
                        activeEditor_filePath: data.filePath, activeEditor_content: data.content,
                        activeEditor_languageId: data.languageId, activeEditor_lineCount: data.lineCount,
                        activeEditor_selection: data.selection,
                    };
                } else { // Tool might return null if no editor is active, which is a valid 'success' case
                    output = { message: "No active editor found." };
                }
                break;
            case 'getDocumentDiagnostics':
                output = { diagnostics_documentPath: data.documentPath, diagnostics_list: data.diagnostics };
                break;
            case 'runInTerminal':
                output = { terminal_name: data.terminalName, terminal_commandSent: data.commandSent };
                break;
            case 'getGitStatus':
                if (data && data.currentBranch !== undefined) { 
                     output = {
                        git_currentBranch: data.currentBranch, git_remoteTracking: data.remoteTracking,
                        git_changedFilesCount: data.changedFilesCount, git_stagedFilesCount: data.stagedFilesCount,
                        git_unstagedFilesCount: data.unstagedFilesCount, git_untrackedFilesCount: data.untrackedFilesCount,
                        git_conflictedFilesCount: data.conflictedFilesCount, git_files: data.files,
                    };
                } else if (data && data.errorReason) { // This case might occur if getGitStatus returns success:false but has data.errorReason
                     output = { message: `Git status error: ${data.errorReason}` };
                } else if (success) { // If success but data is not as expected
                     output = { message: "Git status determined successfully but data format unexpected.", details: data };
                }
                // If !success, the generic error message is already set
                break;
            case 'getProjectSummary':
                if (data) {
                    output = {
                        project_name: data.projectName, project_rootPath: data.rootPath,
                        project_workspaceName: data.workspaceName, project_topLevelStructure: data.topLevelStructure,
                        project_detectedPrimaryLanguage: data.detectedPrimaryLanguage,
                    };
                } else { // Tool might return null if no workspace, valid 'success' case
                    output = { message: "No workspace open or project summary not available." };
                }
                break;
            case 'writeToFile':
                output = { filePath: data.filePath, fileOperationStatus: 'overwritten' };
                break;
            default:
                if (success) output = { message: "Tool executed successfully.", details: data };
                // If !success, generic error message is fine
        }
    } else if (!success && toolName === 'getGitStatus' && rawData && (rawData as any).errorReason) {
        // Special handling for getGitStatus error structure
        output = { message: `Git status error: ${(rawData as any).errorReason}` };
    }
    return output;
  }

  async executeTool(
    name: string,
    rawParams: any,
    executionCtxArgs: { chatId?: string; [key: string]: any } = {}
  ): Promise<ToolResult> { // This is ToolResult from ./types
    const operationId = generateOperationId();
    const startTime = Date.now();

    const tool = this.getTool(name);
    const toolDescriptionForUI = this.generateToolUIDescription(name, rawParams, tool);

    const dispatchToolEvent = (type: EventType, payload: Partial<ToolExecutionEventPayload>) => {
      const eventPayload: ToolExecutionEventPayload = {
        toolName: name,
        parameters: payload.parameters || rawParams,
        toolDescription: toolDescriptionForUI,
        toolParams: payload.toolParams || rawParams, 
        chatId: executionCtxArgs.chatId,
        source: 'ToolRegistry',
        operationId,
        result: payload.result, // This will be ToolOutput
        error: payload.error,
        duration: payload.duration,
        isProcessingStep: payload.isProcessingStep,
        timestamp: Date.now(),
      };
      this.dispatcher.dispatch(type, eventPayload);
    };
    
    dispatchToolEvent(EventType.TOOL_EXECUTION_STARTED, { parameters: rawParams, toolParams: rawParams });
   
    if (!tool) {
      const errorMsg = `Tool not found: ${name}`;
      const executionTime = Date.now() - startTime;
      const mappedErrorOutput = this.mapToToolOutput(name, null, false, errorMsg);
      dispatchToolEvent(EventType.TOOL_EXECUTION_ERROR, {
        error: errorMsg,
        duration: executionTime,
        result: mappedErrorOutput,
      });
      return { 
        success: false, 
        error: errorMsg, 
        executionTime: executionTime,
        mappedOutput: mappedErrorOutput,
      };
    }
    
    const validationResult = ToolValidator.validate(tool.parametersSchema, rawParams);

    if (!validationResult.success) {
      const executionTime = Date.now() - startTime;
      const mappedErrorOutput = this.mapToToolOutput(name, null, false, validationResult.error);
      dispatchToolEvent(EventType.TOOL_EXECUTION_ERROR, {
        error: validationResult.error,
        duration: executionTime,
        parameters: rawParams, 
        toolParams: rawParams,
        result: mappedErrorOutput,
      });
      return { 
        success: false, 
        error: validationResult.error, 
        executionTime: executionTime,
        mappedOutput: mappedErrorOutput,
      };
    }
    const validatedParams = validationResult.data;

    const executionContext: ToolExecutionContext = {
      vscodeAPI: vscode,
      dispatcher: this.dispatcher,
      chatId: executionCtxArgs.chatId,
      ...executionCtxArgs
    };

    try {
      // tool.execute is expected to return Promise<ToolResult<R>>
      // where ToolResult<R> might not have mappedOutput or executionTime set by the tool itself.
      const toolExecuteOutcome = await tool.execute(validatedParams, executionContext);
      const executionTime = Date.now() - startTime;

      // Centralized mapping from toolExecuteOutcome.data to a structured ToolOutput
      const mappedOutput = this.mapToToolOutput(name, toolExecuteOutcome.data, toolExecuteOutcome.success, toolExecuteOutcome.error);

      const finalToolResultToReturn: ToolResult = {
        success: toolExecuteOutcome.success,
        data: toolExecuteOutcome.data, // Preserve original raw data
        mappedOutput: mappedOutput,    // Set the centrally mapped output
        error: toolExecuteOutcome.error,
        warnings: toolExecuteOutcome.warnings,
        executionTime: executionTime,  // Set execution time
      };

      if (finalToolResultToReturn.success) {
        dispatchToolEvent(EventType.TOOL_EXECUTION_COMPLETED, {
            parameters: validatedParams,
            toolParams: validatedParams,
            result: finalToolResultToReturn.mappedOutput, // Use mappedOutput for the event
            duration: executionTime,
        });
      } else {
        dispatchToolEvent(EventType.TOOL_EXECUTION_ERROR, {
            parameters: validatedParams,
            toolParams: validatedParams,
            error: finalToolResultToReturn.error || "Tool execution failed",
            result: finalToolResultToReturn.mappedOutput, // Include mappedOutput in error event
            duration: executionTime,
        });
      }
      
      return finalToolResultToReturn;

    } catch (error: any) { 
      const executionTime = Date.now() - startTime;
      const errorMsg = `Unexpected error during execution of tool ${name}: ${error.message}`;
      const mappedErrorOutput = this.mapToToolOutput(name, { originalException: error.toString() }, false, errorMsg);
      
      dispatchToolEvent(EventType.TOOL_EXECUTION_ERROR, {
        parameters: validatedParams, 
        toolParams: validatedParams,
        error: errorMsg,
        result: mappedErrorOutput,
        duration: executionTime,
      });

      return { 
        success: false, 
        error: errorMsg, 
        executionTime,
        mappedOutput: mappedErrorOutput,
      };
    }
  }

  public asDynamicTool(toolName: string, contextDefaults: Record<string, any> = {}): DynamicStructuredTool | undefined {
    const toolDef = this.getTool(toolName);
    if (!toolDef) return undefined;
    // Langchain's func expects the raw data, not the full ToolResult wrapper.
    // So, we adapt executeTool's Promise<ToolResult> to what DynamicStructuredTool's func expects.
    const langChainFunc = async (input: any, runContext?: any) => {
        const toolResult = await this.executeTool(toolName, input, {...contextDefaults, ...runContext});
        if (toolResult.success) {
            // Langchain tools typically return the direct data or a string summary.
            // We can return the raw data, or a stringified version of mappedOutput if it's more descriptive.
            return toolResult.data ?? JSON.stringify(toolResult.mappedOutput) ?? "Success";
        } else {
            throw new Error(toolResult.error || `Tool ${toolName} execution failed.`);
        }
    };
    return new DynamicStructuredTool({
        name: toolDef.name,
        description: toolDef.description,
        schema: toolDef.parametersSchema,
        func: langChainFunc,
    });
  }

  public asDynamicTools(contextDefaults: Record<string, any> = {}): DynamicStructuredTool[] {
    return this.getAllTools()
        .map(toolDef => this.asDynamicTool(toolDef.name, contextDefaults))
        .filter(tool => tool !== undefined) as DynamicStructuredTool[];
  }
}