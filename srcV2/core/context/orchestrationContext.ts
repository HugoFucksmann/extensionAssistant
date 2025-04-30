// srcV2/core/context/orchestrationContext.ts

export interface OrchestrationContextData {
    sessionId: string;
    preferences: Record<string, any>;
    contextItems: any[];
    lastActivity: number;
    [key: string]: any; // Extensible para otros datos de orquestación
  }
  
  export class OrchestrationContext {
    private data: OrchestrationContextData;
  
    constructor() {
      this.data = this.createEmptyContext();
    }
  
    private createEmptyContext(): OrchestrationContextData {
      return {
        sessionId: this.generateSessionId(),
        preferences: {},
        contextItems: [],
        lastActivity: Date.now()
      };
    }
  
    public get(): OrchestrationContextData {
      return this.data;
    }
  
    public set(data: Partial<OrchestrationContextData>) {
      Object.assign(this.data, data);
      this.data.lastActivity = Date.now();
    }
  
    public clear() {
      this.data = this.createEmptyContext();
    }
  
    private generateSessionId(): string {
      return Math.random().toString(36).slice(2);
    }

     // Añadir un método para inicializar el contexto con datos del proyecto
   public initializeWithProjectData(projectData: any): void {
    this.set({
      projectData,
      lastActivity: Date.now()
    });
    console.log(`[OrchestrationContext] Inicializado con datos del proyecto`);
  }
  }