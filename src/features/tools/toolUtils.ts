// src/features/tools/toolUtils.ts
// Utilidades para herramientas

/**
 * Devuelve dinámicamente los nombres de todas las herramientas registradas
 */
export function getAvailableToolNames(): string[] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ComponentFactory } = require('../../core/ComponentFactory');
    const toolRegistry = ComponentFactory.getToolRegistry();
    return toolRegistry.getToolNames();
  } catch (e) {
    return [];
  }
}
