// src/features/tools/definitions/index.ts
import { workspaceToolDefinitions } from './workspace';
import { editorToolDefinitions } from './edit';
import { filesystemToolDefinitions } from './filesystem';
import { gitToolDefinitions } from './git';
import { terminalToolDefinitions } from './terminal';
import { userInterfaceToolDefinitions } from './userInterface';

// Exportar todas las definiciones de herramientas
export const allToolDefinitions = [
  ...workspaceToolDefinitions,
  ...editorToolDefinitions,
  ...filesystemToolDefinitions,
  ...gitToolDefinitions,
  ...terminalToolDefinitions,
  ...userInterfaceToolDefinitions,
];

// Exportar también las categorías individuales para permitir registro selectivo
export {
  workspaceToolDefinitions,
  editorToolDefinitions,
  filesystemToolDefinitions,
  gitToolDefinitions,
  terminalToolDefinitions,
  userInterfaceToolDefinitions,
};
