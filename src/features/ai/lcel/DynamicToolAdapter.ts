// src/features/ai/lcel/DynamicToolAdapter.ts
import { DynamicStructuredTool } from "@langchain/core/tools";
import { ToolDefinition, ToolExecutionContext } from "../../tools/types";
import { z } from "zod";

/**
 * Adapta una ToolDefinition existente al formato DynamicTool de LangChain.
 * - El ejecutor de la herramienta se invoca a través del ToolRegistry para mantener permisos y validaciones.
 * - El contexto debe inyectarse desde el entorno de ejecución (VSCode, dispatcher, etc).
 */
export function createDynamicTool(
  toolDef: ToolDefinition,
  toolRegistryExecute: (
    name: string,
    params: any,
    executionCtxArgs?: Record<string, any>
  ) => Promise<any>,
  contextDefaults: Partial<ToolExecutionContext> = {}
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: toolDef.name,
    description: toolDef.description,
    schema: toolDef.parametersSchema,
    func: async (input, runContext?: any) => {
      const executionCtxArgs = { ...contextDefaults, ...runContext };
      const result = await toolRegistryExecute(toolDef.name, input, executionCtxArgs);
      if (result.success) {
        return result.data ?? "Success";
      } else {
        throw new Error(result.error || "Tool execution failed");
      }
    },
  });
}

/**
 * Convierte una lista de ToolDefinition en DynamicStructuredTool[] para LangChain.
 * @param toolDefs Lista de ToolDefinition
 * @param toolRegistryExecute Referencia a ToolRegistry.executeTool
 * @param contextDefaults Contexto por defecto para la ejecución
 */
export function createDynamicToolsFromDefinitions(
  toolDefs: ToolDefinition[],
  toolRegistryExecute: (
    name: string,
    params: any,
    executionCtxArgs?: Record<string, any>
  ) => Promise<any>,
  contextDefaults: Partial<ToolExecutionContext> = {}
): DynamicStructuredTool[] {
  return toolDefs.map(toolDef => createDynamicTool(toolDef, toolRegistryExecute, contextDefaults));
}
