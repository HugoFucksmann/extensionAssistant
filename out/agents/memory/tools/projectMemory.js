"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectMemory = void 0;
/**
 * Herramienta para gestionar la memoria de proyectos
 */
class ProjectMemory {
    constructor(storage) {
        this.storage = storage;
    }
    /**
     * Almacena una memoria para un proyecto específico
     * @param projectPath La ruta del proyecto como identificador
     * @param key La clave bajo la cual almacenar la memoria
     * @param content El contenido a almacenar
     */
    async storeProjectMemory(projectPath, key, content) {
        return this.storage.storeProjectMemory(projectPath, key, content);
    }
    /**
     * Recupera una memoria para un proyecto específico
     * @param projectPath La ruta del proyecto como identificador
     * @param key La clave para recuperar la memoria
     */
    async getProjectMemory(projectPath, key) {
        return this.storage.getProjectMemory(projectPath, key);
    }
}
exports.ProjectMemory = ProjectMemory;
//# sourceMappingURL=projectMemory.js.map