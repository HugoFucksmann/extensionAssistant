/**
 * BackendService.js
 * Servicio centralizado para la comunicación con el backend (extensión de VS Code)
 */

import { AppCommands } from '../../core/constants';

// Exportamos AppCommands directamente para usar en el frontend
export const ACTIONS = {
  SEND_MESSAGE: AppCommands.MESSAGE_SEND,
  SET_MODEL: AppCommands.MODEL_CHANGE,
  LOAD_CHAT: AppCommands.CHAT_LOAD,
  LOAD_HISTORY: AppCommands.CHAT_LIST_LOAD,
  CLEAR_CONVERSATION: AppCommands.CHAT_NEW, // Reutilizamos el comando de nuevo chat
  GET_PROJECT_FILES: AppCommands.PROJECT_FILES_GET,
  NEW_CHAT: AppCommands.CHAT_NEW
};

class BackendService {
  constructor(vscode) {
    this.vscode = vscode;
    this.listeners = new Map();
    this._setupMessageListener();
  }

  _setupMessageListener() {
    window.addEventListener('message', (event) => {
      const { type, ...data } = event.data || {};
      if (!type) return;
      
      const callbacks = this.listeners.get(type);
      callbacks?.forEach(callback => callback(data));
    });
  }

  send(action, payload = {}) {
    if (!this.vscode) return;
    
    // Usar requestAnimationFrame para evitar bloquear la UI
    requestAnimationFrame(() => {
      this.vscode.postMessage({ type: action, ...payload });
    });
  }

  on(type, callback) {
    const callbacks = this.listeners.get(type) || [];
    this.listeners.set(type, [...callbacks, callback]);
  }

  off(type, callback) {
    const callbacks = this.listeners.get(type);
    if (!callbacks) return;
    
    const filtered = callbacks.filter(cb => cb !== callback);
    if (filtered.length === 0) {
      this.listeners.delete(type);
    } else {
      this.listeners.set(type, filtered);
    }
  }

  getState() {
    return this.vscode?.getState() || {};
  }

  setState(state) {
    this.vscode?.setState(state);
  }
}

export const createBackendService = vscode => new BackendService(vscode);
