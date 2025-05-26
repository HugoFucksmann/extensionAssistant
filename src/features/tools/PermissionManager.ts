import * as vscode from 'vscode';
import { ToolPermission } from './types';


export class PermissionManager {
    // Cache para permisos "prompt-session"
    private static sessionGrantedPermissions = new Set<string>();

    public static async checkPermissions(
        toolName: string,
        requiredPermissions: ToolPermission[],
        toolParams: any, // Para dar contexto en el prompt
        // context?: ToolExecutionContext // Si necesita más info
    ): Promise<boolean> {
        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true; // No se requieren permisos específicos
        }

        const config = vscode.workspace.getConfiguration('extensionAssistant.toolPermissions');

        for (const perm of requiredPermissions) {
            const permKey = this.getPermissionConfigKey(perm);
            const configValue = config.get<boolean | 'prompt' | 'prompt-session'>(permKey, false); // Default a false (denegado)

            if (configValue === true) {
                continue; // Permitido por configuración
            } else if (configValue === false) {
                vscode.window.showWarningMessage(`Execution of tool '${toolName}' denied: Permission '${perm}' is disabled in settings.`);
                return false; // Denegado por configuración
            } else if (configValue === 'prompt' || configValue === 'prompt-session') {
                if (configValue === 'prompt-session' && this.sessionGrantedPermissions.has(perm)) {
                    continue; // Ya concedido en esta sesión
                }

                const userResponse = await vscode.window.showWarningMessage(
                    `Tool '${toolName}' wants to perform an action requiring permission: '${perm}'.\nParams: ${JSON.stringify(toolParams, null, 2).substring(0, 100)}...\nDo you allow this action?`,
                    { modal: true }, // Hace el diálogo modal
                    'Allow', 'Deny'
                );

                if (userResponse === 'Allow') {
                    if (configValue === 'prompt-session') {
                        this.sessionGrantedPermissions.add(perm);
                    }
                    continue; // Permitido por el usuario
                } else {
                    vscode.window.showInformationMessage(`Action for tool '${toolName}' (permission: '${perm}') was denied by user.`);
                    return false; // Denegado por el usuario
                }
            } else {
                // Configuración desconocida o inválida, tratar como denegado por seguridad
                vscode.window.showWarningMessage(`Execution of tool '${toolName}' denied: Invalid configuration for permission '${perm}'.`);
                return false;
            }
        }
        return true; // Todos los permisos requeridos fueron concedidos
    }

    private static getPermissionConfigKey(permission: ToolPermission): string {
        // Convierte 'filesystem.write' a 'allowFilesystemWrite'
        const parts = permission.split('.');
        return `allow${parts[0].charAt(0).toUpperCase() + parts[0].slice(1)}${parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : ''}`;
    }

    public static clearSessionPermissions(): void {
        this.sessionGrantedPermissions.clear();
    }
}