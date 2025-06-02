// src/features/tools/ToolRegistry.ts
import { ToolDefinition, ToolResult, ToolExecutionContext } from './types';
import { InternalEventDispatcher } from '../../core/events/InternalEventDispatcher';
import * as vscode from 'vscode';
import { ToolValidator } from './ToolValidator';
import { generateUniqueId } from '../../shared/utils/generateIds';
import { EventType, ToolExecutionEventPayload } from '../../features/events/eventTypes';
import { ToolOutput } from '../../shared/types'; 
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
    const getFileName = (path?: string) => path?.split(/[\/]/).pop() || 'archivo';
    
    const toolDescriptions: Record<string, (params: any) => string> = {
      getFileContents: (p) => `Reading file: ${getFileName(p.path)}`,
      searchInWorkspace: (p) => `Searching workspace for: "${p.query}"`,
      writeToFile: (p) => `Writing to file: ${getFileName(p.path)}`,
      createFileOrDirectory: (p) => `Creating ${p.type || 'item'}: ${getFileName(p.path)}`,
      deletePath: (p) => `Deleting: ${getFileName(p.path)}`,
      getActiveEditorInfo: () => 'Getting active editor information',
      getDocumentDiagnostics: (p) => `Getting diagnostics for: ${getFileName(p.filePath) || 'active editor'}`,
      getGitStatus: () => 'Getting Git status',
      getProjectSummary: () => 'Getting project summary',
      runInTerminal: (p) => `Running in terminal: "${p.command}"`
    };

    return toolDescriptions[toolName]?.(params) || toolDefinition?.description || `Executing ${toolName}`;
  }

  private mapToToolOutput(toolName: string, rawData: any, success: boolean, errorMsg?: string): ToolOutput {
    const baseOutput: ToolOutput = {
      message: success ? "Tool executed." : `Error: ${errorMsg || "Unknown error"}`,
      ...(success ? { details: rawData } : { details: { originalError: errorMsg } })
    };

    if (!success) return baseOutput;

    const toolMappers: Record<string, (data: any) => ToolOutput> = {
      getFileContents: (d) => ({ ...baseOutput, filePath: d.filePath, content: d.content, availableFiles: d.availableFiles }),
      createFileOrDirectory: (d) => ({ ...baseOutput, filePath: d.path, fileOperationType: d.type, fileOperationStatus: d.operation }),
      deletePath: (d) => ({ ...baseOutput, filePath: d.path, fileOperationStatus: d.deleted ? 'deleted' : 'error_not_deleted' }),
      searchInWorkspace: (d) => ({ ...baseOutput, query: d.query, results: d.results, totalFound: d.totalFound, searchLimited: d.searchLimited }),
      getActiveEditorInfo: (d) => d ? {
        ...baseOutput,
        activeEditor_filePath: d.filePath,
        activeEditor_content: d.content,
        activeEditor_languageId: d.languageId,
        activeEditor_lineCount: d.lineCount,
        activeEditor_selection: d.selection
      } : { ...baseOutput, message: "No active editor found." },
      getDocumentDiagnostics: (d) => ({ ...baseOutput, diagnostics_documentPath: d.documentPath, diagnostics_list: d.diagnostics }),
      runInTerminal: (d) => ({ ...baseOutput, terminal_name: d.terminalName, terminal_commandSent: d.commandSent }),
      getGitStatus: (d) => {
        if (d?.currentBranch !== undefined) {
          return {
            ...baseOutput,
            git_currentBranch: d.currentBranch,
            git_remoteTracking: d.remoteTracking,
            git_changedFilesCount: d.changedFilesCount,
            git_stagedFilesCount: d.stagedFilesCount,
            git_unstagedFilesCount: d.unstagedFilesCount,
            git_untrackedFilesCount: d.untrackedFilesCount,
            git_conflictedFilesCount: d.conflictedFilesCount,
            git_files: d.files
          };
        } else if (d?.errorReason) {
          return { ...baseOutput, message: `Git status error: ${d.errorReason}` };
        } else if (success) {
          return { ...baseOutput, message: "Git status determined successfully but data format unexpected.", details: d };
        }
        return baseOutput;
      },
      getProjectSummary: (d) => d ? {
        ...baseOutput,
        project_name: d.projectName,
        project_rootPath: d.rootPath,
        project_workspaceName: d.workspaceName,
        project_topLevelStructure: d.topLevelStructure,
        project_detectedPrimaryLanguage: d.detectedPrimaryLanguage
      } : { ...baseOutput, message: "No workspace open or project summary not available." },
      writeToFile: (d) => ({ ...baseOutput, filePath: d.filePath, fileOperationStatus: 'overwritten' })
    };

    return toolMappers[toolName]?.(rawData) || baseOutput;
  }

  async executeTool(
    name: string,
    rawParams: any,
    executionCtxArgs: { chatId?: string; operationId?: string; [key: string]: any } = {}
): Promise<ToolResult> { // ToolResult de ./types
    const operationId = executionCtxArgs.operationId || generateUniqueId();
    const startTime = Date.now();
    const tool = this.getTool(name);
    const toolDescriptionForUI = this.generateToolUIDescription(name, rawParams, tool);

    // Solo despachar TOOL_EXECUTION_STARTED desde aquí
    const startPayload: ToolExecutionEventPayload = {
        toolName: name,
        parameters: rawParams,
        toolDescription: toolDescriptionForUI,
        toolParams: rawParams,
        chatId: executionCtxArgs.chatId,
        source: 'ToolRegistry',
        operationId, // Usa el operationId recibido o generado
        timestamp: Date.now(),
        // No incluir result, error, duration, modelAnalysis, etc. aquí
    };
    this.dispatcher.dispatch(EventType.TOOL_EXECUTION_STARTED, startPayload);

    if (!tool) {
        const errorMsg = `Tool not found: ${name}`;
        const executionTime = Date.now() - startTime;
        const mappedErrorOutput = this.mapToToolOutput(name, null, false, errorMsg);
        // NO despachar TOOL_EXECUTION_ERROR desde aquí
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
        // NO despachar TOOL_EXECUTION_ERROR desde aquí
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
        dispatcher: this.dispatcher, // El dispatcher se pasa para que la herramienta pueda emitir eventos si es necesario (raro)
        chatId: executionCtxArgs.chatId,
        ...executionCtxArgs
    };

    try {
        const toolExecuteOutcome = await tool.execute(validatedParams, executionContext);
        const executionTime = Date.now() - startTime;
        const mappedOutput = this.mapToToolOutput(name, toolExecuteOutcome.data, toolExecuteOutcome.success, toolExecuteOutcome.error);

        // NO despachar TOOL_EXECUTION_COMPLETED desde aquí
        return {
            success: toolExecuteOutcome.success,
            data: toolExecuteOutcome.data,
            mappedOutput: mappedOutput,
            error: toolExecuteOutcome.error,
            warnings: toolExecuteOutcome.warnings,
            executionTime: executionTime,
        };
    } catch (error: any) {
        const executionTime = Date.now() - startTime;
        const errorMsg = `Unexpected error during execution of tool ${name}: ${error.message}`;
        const mappedErrorOutput = this.mapToToolOutput(name, { originalException: error.toString() }, false, errorMsg);
        // NO despachar TOOL_EXECUTION_ERROR desde aquí
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