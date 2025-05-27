// src/features/tools/definitions/terminal/index.ts
import { executeShellCommand } from './executeShellCommand';
import { runInTerminal } from './runInTerminal';

export const terminalToolDefinitions = [
  executeShellCommand,
  runInTerminal,
];

export {
  executeShellCommand,
  runInTerminal,
};