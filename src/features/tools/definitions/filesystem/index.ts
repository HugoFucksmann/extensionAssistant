// src/features/tools/definitions/filesystem/index.ts
import { getFileContents } from './getFileContents';
import { createFileOrDirectory } from './createFileOrDirectory';
import { deletePath } from './deletePath';
import { writeToFile } from './writeToFile';

export const filesystemToolDefinitions = [
  getFileContents,
  createFileOrDirectory,
  deletePath,
  writeToFile,
];

export {
  getFileContents,
  createFileOrDirectory,
  deletePath,
  writeToFile,
};