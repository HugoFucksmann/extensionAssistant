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

    // Determine the base path: use provided projectPath or the main workspace path
    if (!basePath) {
        try {
            basePath = getMainWorkspacePath(); // Throws if no workspace
        } catch (error: any) {
            console.warn(`[Tool.getPackageDependencies] Could not determine workspace path: ${error.message}`);
            return []; // Return empty array gracefully if workspace path cannot be determined
        }
    }

    try {
        const packageJsonPath = path.join(basePath, 'package.json');
        // safeReadFile will throw if file not found or unreadable
        const content = await safeReadFile(packageJsonPath);
        const pkg = JSON.parse(content);
        // Return keys from the 'dependencies' object, default to empty object if not present
        return Object.keys(pkg.dependencies || {});
    } catch (error: any) {
        // Catch errors from safeReadFile (file not found/unreadable) or JSON.parse (invalid JSON)
        console.warn(`[Tool.getPackageDependencies] Could not read or parse package.json at ${basePath}: ${error.message}`);
        return []; // Return empty array on failure to read/parse package.json
    }
}

// This tool's parameter is optional and has a default, so no requiredParams.
// Basic validation could check if projectPath is a string if provided.
// getPackageDependencies.validateParams = (params: Record<string, any>) => {
//     if (params.projectPath !== undefined && typeof params.projectPath !== 'string') {
//          return 'Optional parameter "projectPath" must be a string.';
//     }
//     return true;
// };
// getPackageDependencies.requiredParams = []; // No required parameters