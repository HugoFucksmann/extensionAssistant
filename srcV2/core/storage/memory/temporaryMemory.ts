/**
 * Herramienta para gestionar la memoria temporal durante un intercambio de mensajes
 */
export class TemporaryMemory {
  private memoryMap: Map<string, any> = new Map();

  /**
   * Almacena un valor en la memoria temporal
   * @param key La clave bajo la cual almacenar el valor
   * @param content El contenido a almacenar
   */
  public store(key: string, content: any): void {
    this.memoryMap.set(key, content);
  }

  /**
   * Recupera un valor de la memoria temporal
   * @param key La clave para recuperar el valor
   */
  public get(key: string): any {
    return this.memoryMap.get(key);
  }

  /**
   * Limpia toda la memoria temporal
   * Debe llamarse después de completar cada intercambio de mensajes
   */
  public clear(): void {
    this.memoryMap.clear();
  }
}
