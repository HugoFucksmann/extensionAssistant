// src/features/tools/definitions/filesystem/index.ts
import { getFileContents } from './getFileContents';
import { writeToFile } from './writeToFile';
// import { listFiles } from './listFiles'; // Ya no se exporta como tool
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
  // listFiles, // Solo exportar si se requiere como función utilitaria
  createFileOrDirectory,
  deletePath,
};