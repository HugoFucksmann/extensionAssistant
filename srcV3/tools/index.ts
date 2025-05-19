// src/tools/index.ts

// Export all tools from their modules
export * as filesystem from './filesystem';
export * as editor from './editor';
export * as project from './project';
export * as codeManipulation from './codeManipulation';

// Export core tool utilities
export * from './core/core';

// Re-export individual tools for backward compatibility
export { getWorkspaceFiles } from './filesystem';
export { getFileContents } from './filesystem';
export { getActiveEditorContent } from './editor';
export { getPackageDependencies, getProjectInfo, searchWorkspace } from './project';
export { applyWorkspaceEdit } from './codeManipulation';