// src/features/tools/definitions/git/index.ts
import { getGitStatus } from './getGitStatus';
// Importa otras herramientas de git aquí cuando las crees
// import { gitCommit } from './gitCommit';
// import { gitPush } from './gitPush';

export const gitToolDefinitions = [
  getGitStatus,
  // gitCommit,
  // gitPush,
];

export {
  getGitStatus,
  // gitCommit,
  // gitPush,
};