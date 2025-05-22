// src/features/tools/ToolRunner.ts
import { ToolRegistry } from './ToolRegistry';
import { ToolResult } from './types';
import { VSCodeContext } from '@shared/types'; // Si las herramientas necesitan contexto

export class ToolRunner {
  private toolRegistry: ToolRegistry;
  private vscodeContext?: VSCodeContext; // Opcional

  constructor(toolRegistry: ToolRegistry, vscodeContext?: VSCodeContext) {
    this.toolRegistry = toolRegistry;
    this.vscodeContext = vscodeContext;
  }

  public async runTool(toolName: string, params: any): Promise<ToolResult> {
    const tool = this.toolRegistry.getTool(toolName);
    if (!tool) {
      return { success: false, error: `Tool not found: ${toolName}` };
    }

    // Aquí es donde podrías pasar el vscodeContext si la firma de execute lo permite
    // return tool.execute(params, this.vscodeContext);
    // O si ToolRegistry.executeTool ya maneja el contexto:
    return this.toolRegistry.executeTool(toolName, params /*, this.vscodeContext */);
  }
}