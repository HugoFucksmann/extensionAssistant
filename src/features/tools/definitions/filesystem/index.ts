// src/features/tools/definitions/filesystem/index.ts
import { getFileContents } from './getFileContents';
import { writeToFile } from './writeToFile';
import { createFileOrDirectory } from './createFileOrDirectory';
import { deletePath } from './deletePath';

export const filesystemToolDefinitions = [
  getFileContents,
  writeToFile,
  createFileOrDirectory,
  deletePath,
];

export {
  getFileContents,
  writeToFile,
  createFileOrDirectory,
  deletePath,
};