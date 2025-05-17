import * as vscode from 'vscode';

/**
 * Tool to get the content, language ID, and file name of the currently active text editor.
 * @returns An object containing content, languageId, and fileName, or null if no editor is active.
 */
export async function getActiveEditorContent(): Promise<{
  content: string;
  languageId: string;
  fileName: string;
} | null> {
  const activeEditor = vscode.window.activeTextEditor;
  if (!activeEditor) {
    // Return null if no active editor, as this is a valid state.
    return null;
  }
  return {
    content: activeEditor.document.getText(),
    languageId: activeEditor.document.languageId,
    fileName: activeEditor.document.fileName
  };
}
