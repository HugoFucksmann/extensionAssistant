"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemporaryMemory = void 0;
/**
 * Herramienta para gestionar la memoria temporal durante un intercambio de mensajes
 */
class TemporaryMemory {
    constructor() {
        this.memoryMap = new Map();
    }
    /**
     * Almacena un valor en la memoria temporal
     * @param key La clave bajo la cual almacenar el valor
     * @param content El contenido a almacenar
     */
    store(key, content) {
        this.memoryMap.set(key, content);
    }
    /**
     * Recupera un valor de la memoria temporal
     * @param key La clave para recuperar el valor
     */
    get(key) {
        return this.memoryMap.get(key);
    }
    /**
     * Limpia toda la memoria temporal
     * Debe llamarse después de completar cada intercambio de mensajes
     */
    clear() {
        this.memoryMap.clear();
    }
}
exports.TemporaryMemory = TemporaryMemory;
//# sourceMappingURL=temporaryMemory.js.map