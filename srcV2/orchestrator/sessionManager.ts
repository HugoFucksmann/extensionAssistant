// src/services/sessionManager.ts

/**
 * Gestor de Sesiones
 * * Responsabilidad: Gestionar las sesiones de usuario, incluyendo el contexto,
 * el historial de interacciones, las preferencias y el estado general de la sesión.
 * Asegura la persistencia (si es necesaria) y la recuperación de sesiones.
 */

import { Logger } from '../utils/logger';
import { ErrorHandler } from '../utils/errorHandler';
import { EventBus } from '../core/event/eventBus';
// Podría necesitar un almacenamiento persistente
// import { StorageService } from '../core/storage/storageService'; 

/**
 * Interfaz que define el estado de una sesión
 */
export interface SessionState {
  sessionId: string;
  userId: string; // Identificador del usuario
  contextItems: { // Almacén clave-valor para el contexto de la sesión
    key: string;
    value: any;
    expiry?: number; // Timestamp de expiración (opcional)
  }[];
  history: { // Historial de acciones/interacciones dentro de la sesión
    timestamp: number;
    action: string; // Descripción o tipo de acción
    result: any;    // Resultado resumido o ID del resultado completo
  }[];
  preferences: Record<string, any>; // Preferencias del usuario para esta sesión/globales
  active: boolean; // Si la sesión está activa
  lastActivity: number; // Timestamp de la última actividad
}

// Implementación de SessionContext que usa SessionManager
import { SessionContext } from '../core/context/sessionContext'; 

/**
 * Clase para gestionar sesiones de usuario
 */
export class SessionManager implements SessionContext { // Implementa la interfaz de contexto
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private eventBus: EventBus;
  // private storageService: StorageService; // Para persistencia

  private sessions: Map<string, SessionState> = new Map(); // Almacén en memoria
  private currentSessionId: string | null = null;

  // Constantes para configuración (podrían venir de ConfigManager)
  private readonly SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos
  private readonly MAX_HISTORY_ITEMS = 100;

  constructor(
    logger: Logger,
    errorHandler: ErrorHandler,
    eventBus: EventBus
    // storageService: StorageService 
  ) {
    this.logger = logger;
    this.errorHandler = errorHandler;
    this.eventBus = eventBus;
    // this.storageService = storageService;

    // Cargar sesiones persistentes al iniciar (si aplica)
    // this.loadSessions(); 
  }

  /**
   * Inicia una nueva sesión o recupera una existente para un usuario.
   * @param userId ID del usuario.
   * @param sessionId (Opcional) ID de una sesión existente a reanudar.
   * @returns El estado de la sesión iniciada o reanudada.
   */
  public startOrResumeSession(userId: string, sessionId?: string): SessionState {
    if (sessionId && this.sessions.has(sessionId)) {
      const existingSession = this.sessions.get(sessionId)!;
      if (existingSession.userId === userId) {
        this.currentSessionId = sessionId;
        existingSession.active = true;
        existingSession.lastActivity = Date.now();
        this.logger.info('SessionManager: Resumed session', { sessionId, userId });
        this.eventBus.emit('session:resumed', existingSession);
        return existingSession;
      } else {
         this.logger.warn('SessionManager: Attempt to resume session for wrong user', { requestedSessionId: sessionId, requestedUserId: userId, actualUserId: existingSession.userId });
         // No permitir reanudar sesión de otro usuario, crear una nueva
      }
    }

    // Crear nueva sesión
    const newSessionId = `sess-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const newSession: SessionState = {
      sessionId: newSessionId,
      userId: userId,
      contextItems: [],
      history: [],
      preferences: {}, // Cargar preferencias por defecto o del usuario
      active: true,
      lastActivity: Date.now(),
    };
    this.sessions.set(newSessionId, newSession);
    this.currentSessionId = newSessionId;
    this.logger.info('SessionManager: Started new session', { sessionId: newSessionId, userId });
    this.eventBus.emit('session:started', newSession);

    // Persistir sesión si es necesario
    // this.saveSession(newSessionId);

    return newSession;
  }

  /**
   * Obtiene el estado de la sesión actual activa.
   * @returns El estado de la sesión actual, o null si no hay sesión activa.
   */
  public getCurrentSession(): SessionState | null {
    if (!this.currentSessionId) return null;
    const session = this.sessions.get(this.currentSessionId);
    if (session && session.active) {
        // Verificar timeout (opcional, podría hacerse en un proceso separado)
        if (Date.now() - session.lastActivity > this.SESSION_TIMEOUT_MS) {
            this.logger.warn('SessionManager: Session timed out', { sessionId: this.currentSessionId });
            this.endSession(this.currentSessionId, 'timeout');
            return null;
        }
        return session;
    }
    return null;
  }

  /**
   * Finaliza una sesión.
   * @param sessionId ID de la sesión a finalizar.
   * @param reason Razón por la que finaliza (ej. 'user_logout', 'timeout', 'error').
   */
  public endSession(sessionId: string, reason: string = 'ended'): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.active = false;
      session.lastActivity = Date.now(); // Marcar cuándo terminó
      this.logger.info('SessionManager: Ended session', { sessionId, reason });
      this.eventBus.emit('session:ended', { sessionId, reason });
      if (this.currentSessionId === sessionId) {
        this.currentSessionId = null;
      }
      // Opcional: Limpiar sesión de la memoria o marcar para limpieza
      // Opcional: Persistir estado final
      // this.saveSession(sessionId);
      // setTimeout(() => this.sessions.delete(sessionId), 60 * 1000); // Ejemplo: borrar tras 1 min
    }
  }

  // --- Implementación de SessionContext ---

  public getSessionData(sessionId?: string): SessionState | null {
      const id = sessionId || this.currentSessionId;
      if (!id) return null;
      return this.sessions.get(id) || null;
  }

  public updateContext(updates: Record<string, any>, sessionId?: string): boolean {
    const session = this.getSessionData(sessionId);
    if (!session || !session.active) return false;

    let updated = false;
    for (const key in updates) {
      const existingIndex = session.contextItems.findIndex(item => item.key === key);
      if (existingIndex > -1) {
        session.contextItems[existingIndex].value = updates[key];
        // Podría actualizar expiry si se proporciona en updates[key]
      } else {
        session.contextItems.push({ key: key, value: updates[key] });
      }
      updated = true;
    }
    if (updated) {
        session.lastActivity = Date.now();
        this.eventBus.emit('session:context:updated', { sessionId: session.sessionId, updatedKeys: Object.keys(updates) });
        // this.saveSession(session.sessionId); // Persistir si es necesario
    }
    return updated;
  }

  public getContextItem(key: string, sessionId?: string): any | undefined {
     const session = this.getSessionData(sessionId);
     if (!session) return undefined;
     // Limpiar expirados antes de devolver?
     // this.clearExpiredContextItems(session.sessionId);
     const item = session.contextItems.find(item => item.key === key);
     return item?.value;
  }

  public addHistory(action: string, result: any, sessionId?: string): boolean {
    const session = this.getSessionData(sessionId);
    if (!session || !session.active) return false;

    session.history.push({ timestamp: Date.now(), action, result });
    // Mantener historial dentro del límite
    if (session.history.length > this.MAX_HISTORY_ITEMS) {
      session.history.shift(); // Quitar el más antiguo
    }
    session.lastActivity = Date.now();
    this.eventBus.emit('session:history:added', { sessionId: session.sessionId, action });
     // this.saveSession(session.sessionId); // Persistir si es necesario
    return true;
  }

  public getPreferences(sessionId?: string): Record<string, any> {
       const session = this.getSessionData(sessionId);
       return session?.preferences || {};
  }
  
  public setPreference(key: string, value: any, sessionId?: string): boolean {
      const session = this.getSessionData(sessionId);
      if (!session || !session.active) return false;
      session.preferences[key] = value;
      session.lastActivity = Date.now();
      this.eventBus.emit('session:preference:set', { sessionId: session.sessionId, key });
      // this.saveSession(session.sessionId); // Persistir si es necesario
      return true;
  }

  // --- Métodos privados (ejemplos) ---

  private clearExpiredContextItems(sessionId: string): void {
      const session = this.sessions.get(sessionId);
      if (!session) return;
      const now = Date.now();
      const initialLength = session.contextItems.length;
      session.contextItems = session.contextItems.filter(item => !item.expiry || item.expiry > now);
      if (session.contextItems.length < initialLength) {
          this.logger.debug('SessionManager: Cleared expired context items', { sessionId, count: initialLength - session.contextItems.length });
          // Persistir si cambió
      }
  }

  // Métodos para cargar/guardar sesiones (requieren StorageService)
  /*
  private saveSession(sessionId: string): void {
      const session = this.sessions.get(sessionId);
      if (session && this.storageService) {
          this.storageService.setItem(`session_${sessionId}`, JSON.stringify(session))
              .catch(err => this.logger.error('SessionManager: Failed to save session', { sessionId, error: err }));
      }
  }

  private loadSessions(): void {
      if (!this.storageService) return;
      // Lógica para encontrar y cargar sesiones desde storageService
      // ... this.sessions.set(id, loadedSession); ...
      this.logger.info('SessionManager: Loaded persistent sessions');
  }
  */
}