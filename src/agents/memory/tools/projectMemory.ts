import { SQLiteStorage } from '../../../db/SQLiteStorage';

/**
 * Herramienta para gestionar la memoria de proyectos
 */
export class ProjectMemory {
  constructor(private storage: SQLiteStorage) {}

  /**
   * Almacena una memoria para un proyecto específico
   * @param projectPath La ruta del proyecto como identificador
   * @param key La clave bajo la cual almacenar la memoria
   * @param content El contenido a almacenar
   */
  public async storeProjectMemory(projectPath: string, key: string, content: string): Promise<void> {
    return this.storage.storeProjectMemory(projectPath, key, content);
  }

  /**
   * Recupera una memoria para un proyecto específico
   * @param projectPath La ruta del proyecto como identificador
   * @param key La clave para recuperar la memoria
   */
  public async getProjectMemory(projectPath: string, key: string): Promise<any> {
    return this.storage.getProjectMemory(projectPath, key);
  }
}
