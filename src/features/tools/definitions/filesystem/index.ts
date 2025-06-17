// src/features/tools/definitions/filesystem/index.ts
import { getFileContents } from './getFileContents';
import { createFileOrDirectory } from './createFileOrDirectory';
import { deletePath } from './deletePath';
import { writeToFile } from './writeToFile';
import { findFilesByName } from './findFilesByName';

export const filesystemToolDefinitions = [
  getFileContents,
  createFileOrDirectory,
  deletePath,
  writeToFile,
  findFilesByName,
];

export {
  getFileContents,
  createFileOrDirectory,
  deletePath,
  writeToFile,
  findFilesByName,
};