// src/tools/filesystem/getWorkspaceFiles.ts
import * as vscode from 'vscode';
import * as path from 'path';
import { readdir, stat, normalizePath, parseGitignore as coreParseGitignore } from '../core/core'; // Renombrar para evitar conflicto si se pega

// Mantener DEFAULT_EXCLUSIONS como está en la versión de tools
export const DEFAULT_EXCLUSIONS = {
  dirs: ['node_modules', '.git', 'dist', 'build', '.vscode', '.github', 'out'],
  files: ['.gitignore', '.env', '.env.local', '.env.development', '.env.production'],
  media: [
    // Imágenes
    '*.jpg', '*.JPG', '*.jpeg', '*.png', '*.gif', '*.svg', '*.webp', '*.bmp', '*.tiff',
    // Videos
    '*.mp4', '*.mov', '*.avi', '*.mkv', '*.webm', '*.wmv',
    // Audio
    '*.mp3', '*.wav', '*.ogg', '*.flac', '*.aac',
    // Otros
    '*.pdf', '*.zip', '*.rar', '*.tar', '*.gz', '*.otf', '*.ttf'
  ]
};

// Esta es la función parseGitignore de fileSystemService.ts. Si es idéntica a la de core.ts, no la necesitas aquí.
// Si es diferente y quieres usar esta, llámala diferente o úsala directamente.
// Por ahora, asumiré que la de core.ts es la que se debe usar.
// private async parseGitignore(rootDir: string): Promise<string[]> { ... } // De fileSystemService

// Esta es la función getWorkspaceFiles de fileSystemService.ts
export async function getWorkspaceFiles(): Promise<string[]> {
    const excludedDirs = [...DEFAULT_EXCLUSIONS.dirs]; // Usar DEFAULT_EXCLUSIONS de este archivo
    const excludedFiles = [...DEFAULT_EXCLUSIONS.files];
    const mediaExtensions = [...DEFAULT_EXCLUSIONS.media];

    const files: string[] = [];
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        return [];
    }

    for (const folder of workspaceFolders) {
        const rootPath = folder.uri.fsPath;
        // Usar coreParseGitignore de '../core/core'
        const gitignorePatterns = await coreParseGitignore(rootPath);
        await getFilesFromDirectory( // Renombrar la función auxiliar si es necesario
            rootPath,
            '',
            files,
            [...excludedDirs, ...excludedFiles, ...gitignorePatterns, ...mediaExtensions]
        );
    }
    return files;
}

// Esta es la función getFilesFromDirectory de fileSystemService.ts
async function getFilesFromDirectory( // Asegúrate de que esta función auxiliar se copie también
    rootDir: string,
    currentDir: string,
    files: string[],
    excludedPatterns: string[] // Cambiado el nombre del parámetro para claridad
): Promise<void> {
    const currentPath = path.join(rootDir, currentDir);

    try {
        const entries = await readdir(currentPath);

        for (const entry of entries) {
            const relativePath = path.join(currentDir, entry);
            const fullPath = path.join(rootDir, relativePath);
            const unixRelativePath = normalizePath(relativePath); // Usa normalizePath de core

            let matchedPattern: string | null = null;
            // La lógica de exclusión de fileSystemService.getFilesFromDirectory es más compleja,
            // asegúrate de que se traslade correctamente.
            const shouldExclude = await excludedPatterns.reduce(async (prevPromise, pattern) => {
                const prevResult = await prevPromise;
                if (prevResult) return true;

                let normalizedPattern = normalizePath(pattern);

                if (normalizedPattern.startsWith('/')) {
                    normalizedPattern = normalizedPattern.substring(1);
                    if (unixRelativePath === normalizedPattern) {
                        matchedPattern = pattern;
                        return true;
                    }
                    return false;
                }

                if (normalizedPattern.endsWith('/')) {
                    normalizedPattern = normalizedPattern.slice(0, -1);
                    try {
                        const stats = await stat(fullPath);
                        if (!stats.isDirectory()) return false;
                    } catch { return false; }
                }

                if (normalizedPattern.includes('*')) {
                    const regexPattern = normalizedPattern
                        .replace(/\./g, '\\.') // Escapar puntos para regex literal
                        .replace(/\*/g, '.*')
                        .replace(/\?/g, '.');
                    const regex = new RegExp(`^${regexPattern}$`);
                    if (regex.test(entry) || regex.test(unixRelativePath)) {
                        matchedPattern = pattern;
                        return true;
                    }
                    return false;
                }

                const isMatch = entry === normalizedPattern ||
                    unixRelativePath.includes(`/${normalizedPattern}/`) ||
                    unixRelativePath.endsWith(`/${normalizedPattern}`) ||
                    unixRelativePath === normalizedPattern;

                if (isMatch) {
                    matchedPattern = pattern;
                }
                return isMatch;
            }, Promise.resolve(false));

            if (shouldExclude && matchedPattern) {
                continue;
            }

            try {
                const statsResult = await stat(fullPath);
                if (statsResult.isDirectory()) {
                    await getFilesFromDirectory(rootDir, relativePath, files, excludedPatterns);
                } else {
                    files.push(unixRelativePath);
                }
            } catch (err) {
                console.error(`Error accessing ${fullPath}:`, err);
            }
        }
    } catch (err) {
        console.error(`Error reading directory ${currentPath}:`, err);
    }
}