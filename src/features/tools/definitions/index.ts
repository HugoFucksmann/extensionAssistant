// src/features/tools/definitions/index.ts
import { workspaceToolDefinitions } from './workspace';
import { editorToolDefinitions } from './edit';
import { filesystemToolDefinitions } from './filesystem';

import { terminalToolDefinitions } from './terminal';

export const allToolDefinitions = [
  ...workspaceToolDefinitions,
  ...editorToolDefinitions,
  ...filesystemToolDefinitions,

  ...terminalToolDefinitions,
];

export {
  workspaceToolDefinitions,
  editorToolDefinitions,
  filesystemToolDefinitions,

  terminalToolDefinitions,
};
