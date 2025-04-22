import * as vscode from 'vscode';
import { MemoryAgent } from '../memory/memoryAgent';
import { ModelAgent } from '../model/modelAgent';

/**
 * Interfaz para el componente que maneja la comunicación con la UI
 */
export interface UIProvider {
  sendMessageToWebview(message: any): void;
}

/**
 * Interfaz base para todos los agentes del sistema
 */
export interface Agent {
  initialize(...args: any[]): Promise<void>;
  dispose(): void;
}

/**
 * Registro de todos los agentes creados por la fábrica
 */
export interface AgentRegistry {
  memoryAgent: MemoryAgent;
  modelAgent: ModelAgent;
  // Añadir aquí nuevos agentes a medida que se implementen
}

/**
 * Fábrica responsable de crear e inicializar todos los agentes del sistema
 */
export class AgentFactory {
  private agents: Partial<AgentRegistry> = {};
  private uiProvider: UIProvider | null = null;

  constructor(private context: vscode.ExtensionContext) {}

  /**
   * Establece el proveedor de UI para los agentes
   * @param uiProvider El proveedor de UI
   */
  public setUIProvider(uiProvider: UIProvider): void {
    this.uiProvider = uiProvider;
  }

  /**
   * Crea e inicializa todos los agentes del sistema
   * @returns Promesa que se resuelve cuando todos los agentes están inicializados
   */
  public async createAndInitializeAgents(): Promise<AgentRegistry> {
    // Crear agentes
    await this.createMemoryAgent();
    await this.createModelAgent();
    
    // Verificar que todos los agentes requeridos existen
    this.validateAgentRegistry();
    
    return this.agents as AgentRegistry;
  }

  /**
   * Crea e inicializa el agente de memoria
   */
  private async createMemoryAgent(): Promise<void> {
    console.log('Creando MemoryAgent...');
    const memoryAgent = new MemoryAgent(this.context);
    
    // Inicializar con o sin notificación UI según disponibilidad
    if (this.uiProvider) {
      await memoryAgent.initialize(
        (response) => this.uiProvider!.sendMessageToWebview(response)
      );
    } else {
      await memoryAgent.initialize();
    }
    
    this.agents.memoryAgent = memoryAgent;
  }

  /**
   * Crea e inicializa el agente de modelo
   */
  private async createModelAgent(): Promise<void> {
    console.log('Creando ModelAgent...');
    const modelAgent = new ModelAgent();
    await modelAgent.initialize(this.context);
    this.agents.modelAgent = modelAgent;
  }



  /**
   * Valida que todos los agentes requeridos existan
   */
  private validateAgentRegistry(): void {
    if (!this.agents.memoryAgent) {
      throw new Error('MemoryAgent no inicializado');
    }
    
    if (!this.agents.modelAgent) {
      throw new Error('ModelAgent no inicializado');
    }
    
    // Añadir validaciones para nuevos agentes aquí
  }

  /**
   * Libera todos los recursos de los agentes
   */
  public dispose(): void {
    console.log('Liberando recursos de todos los agentes...');
    
    // Liberar recursos de cada agente
    Object.values(this.agents).forEach(agent => {
      if (agent && typeof agent.dispose === 'function') {
        agent.dispose();
      }
    });
    
    // Limpiar referencias
    this.agents = {};
    this.uiProvider = null;
  }
}
