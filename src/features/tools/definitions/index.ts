// src/features/tools/definitions/index.ts
import { workspaceToolDefinitions } from './workspace';
import { editorToolDefinitions } from './edit';
import { filesystemToolDefinitions } from './filesystem';
import { gitToolDefinitions } from './git';
import { terminalToolDefinitions } from './terminal';

export const allToolDefinitions = [
  ...workspaceToolDefinitions,
  ...editorToolDefinitions,
  ...filesystemToolDefinitions,
  ...gitToolDefinitions,
  ...terminalToolDefinitions,
];

export {
  workspaceToolDefinitions,
  editorToolDefinitions,
  filesystemToolDefinitions,
  gitToolDefinitions,
  terminalToolDefinitions,
};
