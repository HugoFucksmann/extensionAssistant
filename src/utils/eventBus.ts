/**
 * EventBus - Sistema de eventos para la comunicación entre componentes
 * Permite desacoplar los componentes mediante un patrón de publicación/suscripción
 */
export type EventCallback = (data?: any) => void;

export class EventBus {
  private static listeners: Map<string, EventCallback[]> = new Map();
  
  /**
   * Suscribe una función callback a un evento específico
   * @param event Nombre del evento
   * @param callback Función a ejecutar cuando ocurra el evento
   * @returns Función para cancelar la suscripción
   */
  public static subscribe(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    
    this.listeners.get(event)!.push(callback);
    
    // Retornar función para cancelar la suscripción
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }
  
  /**
   * Publica un evento con datos opcionales
   * @param event Nombre del evento
   * @param data Datos opcionales para pasar a los suscriptores
   */
  public static publish(event: string, data?: any): void {
    if (this.listeners.has(event)) {
      // Crear una copia del array para evitar problemas si un suscriptor
      // se da de baja durante la ejecución
      const callbacks = [...this.listeners.get(event)!];
      callbacks.forEach(callback => callback(data));
    }
  }
  
  /**
   * Elimina todas las suscripciones a un evento específico
   * @param event Nombre del evento
   */
  public static clear(event: string): void {
    this.listeners.delete(event);
  }
  
  /**
   * Elimina todas las suscripciones
   */
  public static clearAll(): void {
    this.listeners.clear();
  }
  
  /**
   * Libera todos los recursos y limpia todas las suscripciones
   * Debe llamarse cuando la extensión se desactiva
   */
  public static dispose(): void {
    console.log('Liberando recursos del EventBus');
    this.clearAll();
  }
}
