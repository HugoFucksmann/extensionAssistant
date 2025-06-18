// src/features/tools/definitions/workspace/index.ts
import { getProjectSummary } from './getProjectSummary';
import { searchWorkspaceFiles } from './searchWorkspaceFiles';

export const workspaceToolDefinitions = [
  getProjectSummary,
  searchWorkspaceFiles,
];