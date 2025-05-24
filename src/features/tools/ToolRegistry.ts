import { ToolDefinition, ParameterDefinition, ToolResult } from './types';
import * as filesystem from './definitions/filesystem';
import * as editor from './definitions/editor';
import * as workspace from './definitions/workspace';
import * as core from './definitions/core';

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  constructor() {
    this.registerTools([
      // Filesystem tools
      filesystem.getFileContents,
      filesystem.writeToFile,
      filesystem.listFiles,
      
      // Editor tools
      editor.getActiveEditorContent,
      editor.applyTextEdit,
      
      // Workspace tools
      workspace.getProjectInfo,
      workspace.searchWorkspace,
      
      // Core tools
      core.respond
    ]);
  }

  private registerTools(tools: ToolDefinition[]): void {
    for (const tool of tools) {
      this.tools.set(tool.name, tool);
    }
  }

  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  async executeTool(name: string, params: any): Promise<ToolResult> {
    const tool = this.getTool(name);
    if (!tool) {
      return { success: false, error: `Tool not found: ${name}` };
    }

    try {
      this.validateParameters(tool, params);
      return await tool.execute(params);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private validateParameters(tool: ToolDefinition, params: any): void {
    const errors: string[] = [];
    
    // Check required parameters
    for (const [name, def] of Object.entries(tool.parameters)) {
      if (def.required && params != null && !(name in params)) {
        errors.push(`Missing required parameter: ${name}`);
      }
    }
    
    // Validate provided parameters
    if (params != null) {
      for (const [name, value] of Object.entries(params)) {
        const def = tool.parameters[name];
        if (!def) {
          errors.push(`Unknown parameter: ${name}`);
          continue;
        }
        
        const error = this.validateParameterValue(name, value, def);
        if (error) errors.push(error);
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Validation failed for ${tool.name}: ${errors.join(', ')}`);
    }
  }

  private validateParameterValue(name: string, value: any, def: ParameterDefinition): string | null {
    if (value == null) return null;
    
    // Type validation
    const expectedType = def.type === 'any' ? typeof value : def.type;
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    
    if (expectedType !== actualType) {
      return `Parameter ${name} must be ${expectedType}, got ${actualType}`;
    }
    
    // Enum validation
    if (def.enum && !(def.enum as unknown[]).includes(value)) {
      return `Parameter ${name} must be one of: ${def.enum.join(', ')}`;
    }
    
    // String/Array length validation
    if ((def.type === 'string' || def.type === 'array') && value.length != null) {
      if (def.minLength != null && value.length < def.minLength) {
        return `Parameter ${name} must have at least ${def.minLength} items`;
      }
      if (def.maxLength != null && value.length > def.maxLength) {
        return `Parameter ${name} must have at most ${def.maxLength} items`;
      }
    }
    
    // Number range validation
    if (def.type === 'number') {
      if (def.minimum != null && value < def.minimum) {
        return `Parameter ${name} must be at least ${def.minimum}`;
      }
      if (def.maximum != null && value > def.maximum) {
        return `Parameter ${name} must be at most ${def.maximum}`;
      }
    }
    
    // Pattern validation for strings
    if (def.type === 'string' && def.pattern) {
      if (!new RegExp(def.pattern).test(value)) {
        return `Parameter ${name} does not match pattern: ${def.pattern}`;
      }
    }
    
    return null;
  }
}