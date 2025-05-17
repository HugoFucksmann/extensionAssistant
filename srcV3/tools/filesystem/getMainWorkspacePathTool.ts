// src/tools/filesystem/getMainWorkspacePathTool.ts
import { getMainWorkspacePath } from '../core/core';

// Interface for tool functions with static properties
interface ToolFunction {
    (): Promise<string>;
    validateParams?: (params: Record<string, any>) => boolean | string;
    requiredParams: string[];
}

/**
 * Tool to get the absolute path of the main workspace folder.
 * @returns The normalized absolute path of the first workspace folder.
 * @throws Error if no workspace folder is open.
 */
export const getMainWorkspacePathTool: ToolFunction = async function getMainWorkspacePathTool(): Promise<string> {
    console.log('[Tool] filesystem.getMainWorkspacePath called.');
    try {
        const workspacePath = getMainWorkspacePath();
        console.log(`[Tool] filesystem.getMainWorkspacePath returned: ${workspacePath}`);
        return workspacePath;
    } catch (error: any) {
        console.error('[Tool] filesystem.getMainWorkspacePath failed:', error.message);
        throw new Error(`Failed to get main workspace path: ${error.message}`);
    }
}

// Define validation rules (none needed for this tool)
getMainWorkspacePathTool.validateParams = (_params: Record<string, any>): boolean | string => {
    return true; // No parameters required or validated
};

getMainWorkspacePathTool.requiredParams = []; // No required parameters