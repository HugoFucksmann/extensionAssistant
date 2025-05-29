// src/features/tools/definitions/filesystem/index.ts
import { getFileContents } from './getFileContents';
import { createFileOrDirectory } from './createFileOrDirectory';
import { deletePath } from './deletePath';

export const filesystemToolDefinitions = [
  getFileContents,
  createFileOrDirectory,
  deletePath,
];

export {
  getFileContents,
  createFileOrDirectory,
  deletePath,
};