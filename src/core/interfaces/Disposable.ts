// src/core/interfaces/Disposable.ts

export interface Disposable {
  dispose(): void | Promise<void>;
}
