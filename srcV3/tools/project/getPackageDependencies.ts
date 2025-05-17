import path from 'path';
import { safeReadFile, getMainWorkspacePath } from '../core/core'; // safeReadFile now throws on error

/**
 * Tool to get the list of production dependencies from package.json.
 * @param params - Parameters including projectPath (optional, defaults to main workspace).
 * @returns An array of dependency names (strings). Returns an empty array if package.json is not found or cannot be parsed, or if no workspace is open.
 */
export async function getPackageDependencies(params: { projectPath?: string } = {}): Promise<string[]> {
    const { projectPath } = params;
    let basePath = projectPath;


    if (!basePath) {
        try {
            basePath = getMainWorkspacePath();
        } catch (error: any) {
            console.warn(`[Tool.getPackageDependencies] Could not determine workspace path: ${error.message}`);
            return [];
        }
    }

    try {
        const packageJsonPath = path.join(basePath, 'package.json');
      
        const content = await safeReadFile(packageJsonPath);
        const pkg = JSON.parse(content);
     
        return Object.keys(pkg.dependencies || {});
    } catch (error: any) {
      
        console.warn(`[Tool.getPackageDependencies] Could not read or parse package.json at ${basePath}: ${error.message}`);
        return [];
    }
}

