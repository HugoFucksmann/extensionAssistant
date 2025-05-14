import * as vscode from 'vscode';

export async function getActiveEditorContent(): Promise<{
  content: string;
  languageId: string;
  fileName: string;
} | null> {
  const activeEditor = vscode.window.activeTextEditor;
  if (!activeEditor) {
    return null; // Devuelve null en lugar de lanzar error
  }
  return {
    content: activeEditor.document.getText(),
    languageId: activeEditor.document.languageId,
    fileName: activeEditor.document.fileName
  };
}
