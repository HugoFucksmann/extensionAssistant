// src/core/interfaces/Disposable.ts

/**
 * Interfaz estándar para recursos que requieren limpieza explícita.
 */
export interface Disposable {
  dispose(): void | Promise<void>;
}
