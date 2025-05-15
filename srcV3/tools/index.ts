// src/tools/index.ts

// Filesystem Tools
export { getWorkspaceFiles } from './filesystem/getWorkspaceFiles';
export { getFileContents } from './filesystem/getFileContents';
export { createFile } from './filesystem/createFile'; // Export new tool
export { createDirectory } from './filesystem/createDirectory'; // Export new tool

// Editor Tools
export { getActiveEditorContent } from './editor/getActiveEditorContent';

// Project Tools
export { getPackageDependencies } from './project/getPackageDependencies';
export { getProjectInfo } from './project/getProjectInfo';
export { searchWorkspace } from './project/searchWorkspace';
export { installDependencies } from './project/installDependencies'; // Export new tool
export { addDependency } from './project/addDependency'; // Export new tool


// Code Manipulation Tools (Future)
export { applyWorkspaceEdit } from './codeManipulation/applyWorkspaceEdit'; // Assuming this exists

// Terminal Tools
export { runCommand } from './terminal/runCommand';