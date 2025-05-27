// src/features/tools/PermissionManager.ts
import * as vscode from 'vscode';
import { ToolPermission, ToolExecutionContext } from './types'; // ToolExecutionContext para el contexto del prompt
import { EventType, WindsurfEvent, UserInputReceivedPayload, UserInteractionRequiredPayload } from '../events/eventTypes';

// Variable global para habilitar el modo de prueba
let testModeEnabled = false;

export class PermissionManager {
    private static sessionGrantedPermissions = new Set<string>(); // Cache para permisos "prompt-session"

    /**
     * Habilita o deshabilita el modo de prueba. En modo de prueba, todas las verificaciones de permisos son automáticamente aprobadas.
     * @param enabled True para habilitar el modo de prueba, false para deshabilitarlo.
     */
    public static setTestMode(enabled: boolean): void {
        testModeEnabled = enabled;
        console.log(`[PermissionManager] Test mode ${enabled ? 'enabled' : 'disabled'}. All permission checks will be ${enabled ? 'automatically approved' : 'enforced'}.`);
    }

    /**
     * Verifica si el modo de prueba está habilitado.
     * @returns True si el modo de prueba está habilitado, false en caso contrario.
     */
    public static isTestModeEnabled(): boolean {
        return testModeEnabled;
    }

    public static async checkPermissions(
        toolName: string,
        requiredPermissions: ToolPermission[],
        toolParams: any, // Para dar contexto en el prompt
        executionContext?: ToolExecutionContext // Para acceso a vscodeAPI y potencialmente más info
    ): Promise<boolean> {
        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true; // No se requieren permisos específicos
        }

        // Si el modo de prueba está habilitado, aprobar automáticamente todos los permisos
        if (testModeEnabled) {
            executionContext?.dispatcher?.systemInfo(
                `[TestMode] Permission check for tool '${toolName}' automatically approved in test mode.`,
                { toolName, requiredPermissions, testMode: true },
                executionContext?.chatId
            );
            return true;
        }

        const vscodeAPI = executionContext?.vscodeAPI || vscode; // Usar del contexto o el global
        const config = vscodeAPI.workspace.getConfiguration('extensionAssistant.toolPermissions');

        for (const perm of requiredPermissions) {
            const permKey = this.getPermissionConfigKey(perm);
            // Default a 'prompt' si la clave no existe, o un valor seguro como 'false'
            // Aquí usamos el default definido en package.json si es posible, o 'prompt' como un default razonable.
            // El tercer argumento de config.get es el valor por defecto si la config no está seteada.
            // Los defaults de package.json se aplican si el usuario no ha cambiado la config.
            // Si la config está explícitamente en false, eso se respetará.
            const configValue = config.get<boolean | 'prompt' | 'prompt-session'>(permKey);


            if (configValue === true) {
                executionContext?.dispatcher?.systemInfo(`Permission '${perm}' for tool '${toolName}' granted by global config.`, { toolName, perm }, executionContext?.chatId);
                continue; // Permitido por configuración
            } else if (configValue === false) {
                const msg = `Execution of tool '${toolName}' denied: Permission '${perm}' is disabled in settings.`;
                executionContext?.dispatcher?.systemWarning(msg, { toolName, perm }, executionContext?.chatId);
                vscodeAPI.window.showWarningMessage(msg);
                return false; // Denegado por configuración
            } else if (configValue === 'prompt' || configValue === 'prompt-session') {
                const sessionPermKey = `${executionContext?.chatId || 'global_session'}::${perm}`; // Hacer la clave de sesión única por chatId
                if (configValue === 'prompt-session' && this.sessionGrantedPermissions.has(sessionPermKey)) {
                    executionContext?.dispatcher?.systemInfo(`Permission '${perm}' for tool '${toolName}' granted by session cache.`, { toolName, perm }, executionContext?.chatId);
                    continue; // Ya concedido en esta sesión
                }

                // Si tenemos un contexto de ejecución con dispatcher, usar la UI para solicitar el permiso
                if (executionContext?.dispatcher && executionContext?.uiOperationId) {
                    // Generar un ID único para esta solicitud de permiso
                    const permissionRequestId = `perm_req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                    
                    // Enviar evento de solicitud de permiso a la UI
                    executionContext.dispatcher.dispatch(EventType.USER_INTERACTION_REQUIRED, {
                        interactionType: 'confirmation',
                        uiOperationId: permissionRequestId,
                        promptMessage: `Tool '${toolName}' requires permission: '${this.getPermissionDescription(perm)}'`,
                        title: 'Permission Required',
                        chatId: executionContext.chatId,
                        confirmButtonText: 'Permitir',
                        cancelButtonText: 'Denegar',
                        // Incluir metadatos en el mensaje para que la UI pueda mostrar información relevante
                        options: [{
                            label: 'Permitir',
                            value: true
                        }, {
                            label: 'Denegar',
                            value: false
                        }]
                    });
                    
                    // Esperar la respuesta del usuario
                    return new Promise<boolean>((resolve) => {
                        const handlePermissionResponse = (event: WindsurfEvent) => {
                            const payload = event.payload as UserInputReceivedPayload;
                            if (payload.uiOperationId === permissionRequestId) {
                                // Eliminar el listener una vez recibida la respuesta
                                const subscription = executionContext.dispatcher?.subscribe(EventType.USER_INPUT_RECEIVED, handlePermissionResponse);
                                subscription?.unsubscribe();
                                
                                // Resolver con la respuesta del usuario
                                const allowed = !payload.wasCancelled && payload.value === true;
                                
                                if (allowed && configValue === 'prompt-session') {
                                    this.sessionGrantedPermissions.add(sessionPermKey);
                                }
                                
                                executionContext.dispatcher?.systemInfo(
                                    `Permission '${perm}' for tool '${toolName}' ${allowed ? 'granted' : 'denied'} by user via UI.`,
                                    { toolName, perm, response: allowed ? 'Allow' : 'Deny' },
                                    executionContext.chatId
                                );
                                
                                resolve(allowed);
                            }
                        };
                        
                        // Suscribirse al evento de respuesta
                        executionContext.dispatcher?.subscribe(EventType.USER_INPUT_RECEIVED, handlePermissionResponse);
                    });
                } else {
                    // Fallback a diálogo nativo si no hay contexto de UI
                    const userResponse = await vscodeAPI.window.showWarningMessage(
                        `Tool '${toolName}' requires permission: '${this.getPermissionDescription(perm)}' to perform its task with parameters: ${JSON.stringify(toolParams, null, 2).substring(0, 200)}...\n\nDo you allow this action?`,
                        { modal: true },
                        'Allow', 'Deny'
                    );

                    if (userResponse === 'Allow') {
                        if (configValue === 'prompt-session') {
                            this.sessionGrantedPermissions.add(sessionPermKey);
                        }
                        executionContext?.dispatcher?.systemInfo(`Permission '${perm}' for tool '${toolName}' granted by user prompt.`, { toolName, perm, response: 'Allow' }, executionContext?.chatId);
                        continue; // Permitido por el usuario
                    } else {
                        const msg = `Action for tool '${toolName}' (permission: '${perm}') was denied by user.`;
                        executionContext?.dispatcher?.systemWarning(msg, { toolName, perm, response: 'Deny' }, executionContext?.chatId);
                        vscodeAPI.window.showInformationMessage(msg);
                        return false; // Denegado por el usuario
                    }
                }
            } else {
                // Configuración desconocida, inválida, o no establecida (undefined)
                // Si es undefined, significa que no está en las settings del usuario Y no tiene default en package.json (raro)
                // O el default de package.json es uno de los valores 'prompt'/'prompt-session'/true/false.
                // Si configValue es undefined aquí, es un caso anómalo. Tratar como denegado por seguridad.
                const msg = `Execution of tool '${toolName}' denied: Permission '${perm}' has an invalid or unset configuration value ('${configValue}'). Please check extension settings.`;
                executionContext?.dispatcher?.systemError(msg, undefined, { toolName, perm, configValue }, executionContext?.chatId);
                vscodeAPI.window.showErrorMessage(msg);
                return false;
            }
        }
        return true; // Todos los permisos requeridos fueron concedidos
    }

    private static getPermissionConfigKey(permission: ToolPermission): string {
        // Caso especial para workspace.info.read
        if (permission === 'workspace.info.read') {
            return 'allowWorkspaceInfoRead';
        }
        
        const parts = permission.split('.');
        const actionPart = parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : '';
        return `allow${parts[0].charAt(0).toUpperCase() + parts[0].slice(1)}${actionPart}`;
    }
    
    private static getPermissionDescription(permission: ToolPermission): string {
        // Podrías mapear a descripciones más amigables aquí
        switch (permission) {
            case 'filesystem.read': return 'Read files from your workspace';
            case 'filesystem.write': return 'Write, create, or delete files/directories in your workspace';
            case 'terminal.execute': return 'Execute commands in the terminal';
            case 'interaction.userInput': return 'Ask you for input or choices';
            case 'editor.read': return 'Read content from your open editors';
            case 'editor.write': return 'Modify content in your open editors';
            case 'workspace.info.read': return 'Read general workspace and project information';
            // case 'git.read': return 'Read Git repository information'; // Si añades este permiso
            default: return permission;
        }
    }

    public static clearSessionPermissions(chatId?: string): void {
        if (chatId) {
            const prefix = `${chatId}::`;
            const keysToRemove = Array.from(this.sessionGrantedPermissions).filter(key => key.startsWith(prefix));
            keysToRemove.forEach(key => this.sessionGrantedPermissions.delete(key));
        } else {
            this.sessionGrantedPermissions.clear();
        }
    }
}