// src/features/tools/definitions/editor/index.ts
import { getActiveEditorInfo } from './getActiveEditorInfo';
import { applyEditorEdit } from './applyEditorEdit';
import { getDocumentDiagnostics } from './getDocumentDiagnostics';

// Cuando crees findDefinition.ts y renameSymbol.ts, impórtalos aquí:
// import { findDefinition } from './findDefinition';
// import { renameSymbol } from './renameSymbol';

/**
 * Array de todas las definiciones de herramientas relacionadas con el editor.
 * Estas herramientas se pueden registrar en el ToolRegistry.
 */
export const editorToolDefinitions = [
  getActiveEditorInfo,
  applyEditorEdit,
  getDocumentDiagnostics,
  // findDefinition, // Descomenta cuando esté listo
  // renameSymbol,   // Descomenta cuando esté listo
];

// También puedes exportar cada herramienta individualmente si necesitas
// acceder a ellas directamente en alguna otra parte de tu código,
// aunque generalmente se accederá a ellas a través del ToolRegistry.
export {
  getActiveEditorInfo,
  applyEditorEdit,
  getDocumentDiagnostics,
  // findDefinition,
  // renameSymbol,
};