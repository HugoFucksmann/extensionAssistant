export class UIStateContext {
    private state: Map<string, any> = new Map();
    private listeners: Map<string, Function[]> = new Map();
    
    // Set state and notify listeners
    setState(key: string, value: any): void {
      this.state.set(key, value);
      
      // Notify listeners
      const handlers = this.listeners.get(key) || [];
      handlers.forEach(handler => handler(value));
    }
    
    // Get state
    getState(key: string): any {
      return this.state.get(key);
    }
    
    // Subscribe to state changes
    subscribe(key: string, handler: Function): () => void {
      if (!this.listeners.has(key)) {
        this.listeners.set(key, []);
      }
      
      const handlers = this.listeners.get(key)!;
      handlers.push(handler);
      
      // Return unsubscribe function
      return () => {
        const index = handlers.indexOf(handler);
        if (index !== -1) {
          handlers.splice(index, 1);
        }
      };
    }
    
    // Clear all state
    clearState(): void {
      this.state.clear();
    }
  }