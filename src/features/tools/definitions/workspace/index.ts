// src/features/tools/definitions/workspace/index.ts
import { getProjectSummary } from './getProjectSummary';
import { searchInWorkspace } from './searchInWorkspace';

export const workspaceToolDefinitions = [
  getProjectSummary,
  searchInWorkspace,
];

export {
  getProjectSummary,
  searchInWorkspace,
};