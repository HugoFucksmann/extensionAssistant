// src/features/tools/definitions/git/index.ts
import { getGitStatus } from './getGitStatus';
import { gitCommit } from './gitCommit';
import { gitPush } from './gitPush';
import { gitPull } from './gitPull';
import { gitDiff } from './gitDiff';

export const gitToolDefinitions = [
  getGitStatus,
  gitCommit,
  gitPush,
  gitPull,
  gitDiff,
];

export {
  getGitStatus,
  gitCommit,
  gitPush,
  gitPull,
  gitDiff,
};