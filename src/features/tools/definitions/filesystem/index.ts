// src/features/tools/definitions/filesystem/index.ts
import { getFileContents } from './getFileContents';
import { writeToFile } from './writeToFile';
import { listFiles } from './listFiles';
import { createFileOrDirectory } from './createFileOrDirectory';
import { deletePath } from './deletePath';

export const filesystemToolDefinitions = [
  getFileContents,
  writeToFile,
  listFiles,
  createFileOrDirectory,
  deletePath,
];

export {
  getFileContents,
  writeToFile,
  listFiles,
  createFileOrDirectory,
  deletePath,
};