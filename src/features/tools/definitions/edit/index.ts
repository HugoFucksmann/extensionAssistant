// src/features/tools/definitions/editor/index.ts
import { getActiveEditorInfo } from './getActiveEditorInfo';

import { getDocumentDiagnostics } from './getDocumentDiagnostics';


export const editorToolDefinitions = [
  getActiveEditorInfo,

  getDocumentDiagnostics,

];


export {
  getActiveEditorInfo,

  getDocumentDiagnostics,

};