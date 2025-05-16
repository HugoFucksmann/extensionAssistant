// src/tools/filesystem/getFileContents.ts
import * as vscode from 'vscode';
import * as path from 'path';
import { safeReadFile } from '../core/core'; // Importar safeReadFile

export async function getFileContents(params: { filePath: string }): Promise<string> {
    const { filePath } = params;
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        // Considerar si 'file not found' es la mejor respuesta o si se debe lanzar un error.
        // Para consistencia con el comportamiento anterior de fileSystemService, podría ser:
        // throw new Error('No workspace folders found');
        return 'file not found'; // O mantener el string si es esperado por el consumidor
    }

    // Asumimos que filePath es relativo al primer workspaceFolder.
    // Si puede ser un path absoluto, o relativo a otro folder, se necesitaría lógica adicional.
    const fullPath = path.join(workspaceFolders[0].uri.fsPath, filePath);

    try {
        // Usar safeReadFile que utiliza vscode.workspace.openTextDocument
        return await safeReadFile(fullPath);
    } catch (error: any) {
        // safeReadFile ya lanza un error "File not found: ..."
        // Si quieres devolver 'file not found' específicamente:
        if (error.message.startsWith('File not found')) {
            return 'file not found';
        }
        // Para otros errores, podrías relanzar o devolver un mensaje de error
        console.error(`[Tool.getFileContents] Error reading file ${filePath}:`, error);
        return `Error reading file: ${error.message}`;
    }
}