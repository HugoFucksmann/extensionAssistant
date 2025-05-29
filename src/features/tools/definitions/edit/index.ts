// src/features/tools/definitions/editor/index.ts
import { getActiveEditorInfo } from './getActiveEditorInfo';

import { getDocumentDiagnostics } from './getDocumentDiagnostics';

import { writeToFile } from './writeToFile';

export const editorToolDefinitions = [
  getActiveEditorInfo,
  writeToFile,
  getDocumentDiagnostics,

];


export {
  getActiveEditorInfo,
  writeToFile,
  getDocumentDiagnostics,

};