import * as vscode from 'vscode';
import { SQLiteStorage } from '../db/SQLiteStorage';
import { TemporaryMemory } from './memory/temporaryMemory';
import { ProjectMemory } from './memory/projectMemory';

/**
 * MemoryManager es responsable de las operaciones básicas de almacenamiento
 * y recuperación de datos en la base de datos y memoria temporal.
 */
export class MemoryManager {
  private temporaryMemory: TemporaryMemory;
  private projectMemory: ProjectMemory;
  private storage: SQLiteStorage;

  constructor(context: vscode.ExtensionContext) {
    this.storage = new SQLiteStorage(context);
    this.temporaryMemory = new TemporaryMemory();
    this.projectMemory = new ProjectMemory(this.storage);
  }

  /**
   * Almacena una memoria para un proyecto específico
   */
  public async storeProjectMemory(projectPath: string, key: string, content: string): Promise<void> {
    return this.projectMemory.storeProjectMemory(projectPath, key, content);
  }

  /**
   * Recupera una memoria para un proyecto específico
   */
  public async getProjectMemory(projectPath: string, key: string): Promise<any> {
    return this.projectMemory.getProjectMemory(projectPath, key);
  }

  /**
   * Almacena una memoria temporal
   */
  public storeTemporaryMemory(key: string, content: any): void {
    this.temporaryMemory.store(key, content);
  }

  /**
   * Recupera una memoria temporal
   */
  public getTemporaryMemory(key: string): any {
    return this.temporaryMemory.get(key);
  }

  /**
   * Limpia todas las memorias temporales
   */
  public clearTemporaryMemory(): void {
    this.temporaryMemory.clear();
  }

  /**
   * Obtiene el objeto de almacenamiento SQLite
   */
  public getStorage(): SQLiteStorage {
    return this.storage;
  }

  /**
   * Inicializa el gestor de memoria
   */
  public async initialize(): Promise<void> {
    console.log('MemoryManager inicializado');
  }

  /**
   * Limpia los recursos cuando se desactiva la extensión
   */
  public dispose(): void {
    console.log('MemoryManager eliminado');
    this.storage.close();
  }
}
