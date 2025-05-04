import * as vscode from 'vscode';
import { BaseAPI } from '../models/baseAPI';
import { SQLiteStorage } from './storage/db/SQLiteStorage';
import { ConfigurationManager } from './config/ConfigurationManager';
import { ErrorHandler } from '../utils/errorHandler';
import { OrchestratorService } from '../orchestrator/orchestratorService';
import { EventBus } from './event/eventBus';
import { logger, LoggerService } from '../utils/logger';

/**
 * Contenedor centralizado de dependencias para resolver dependencias circulares
 * y facilitar la inyección de dependencias en la aplicación.
 * 
 * Implementa el patrón Singleton para asegurar una única instancia.
 */
export class DependencyContainer {
  private static instance: DependencyContainer | null = null;
  
  // Servicios principales
  private context: vscode.ExtensionContext | null = null;
  private configManager: ConfigurationManager | null = null;
  private errorHandler: ErrorHandler | null = null;
  private eventBus: EventBus | null = null;
  private logger: LoggerService | null = null;
  
  // Servicios de datos
  private storage: SQLiteStorage | null = null;
  private baseAPI: BaseAPI | null = null;
  
  // Servicios de orquestación
  private orchestratorService: OrchestratorService | null = null;
  
  // Mapa para dependencias personalizadas
  private customDependencies: Map<string, any> = new Map();
  
  private constructor() {
    // Constructor privado para implementar Singleton
  }
  
  /**
   * Obtiene la instancia única del contenedor de dependencias
   */
  public static getInstance(): DependencyContainer {
    if (!DependencyContainer.instance) {
      DependencyContainer.instance = new DependencyContainer();
    }
    return DependencyContainer.instance;
  }
  
  /**
   * Inicializa el contenedor con el contexto de la extensión
   * @param context Contexto de la extensión de VS Code
   */
  public initialize(context: vscode.ExtensionContext): void {
    this.context = context;
    
    // Inicializar servicios principales
    this.eventBus = EventBus.getInstance();
    this.logger = logger;
    this.configManager = ConfigurationManager.getInstance(context);
    this.errorHandler = new ErrorHandler(this.configManager);
  }
  
  /**
   * Inicializa los servicios de datos
   */
  public async initializeDataServices(): Promise<void> {
    if (!this.context) {
      throw new Error('DependencyContainer no inicializado. Llame a initialize() primero.');
    }
    
    // Inicializar almacenamiento
    this.storage = new SQLiteStorage(this.context);
    
    // Inicializar API
    this.baseAPI = new BaseAPI(this.getConfigManager());
    await this.baseAPI.initialize();
  }
  
  /**
   * Inicializa el servicio de orquestación
   */
  public async initializeOrchestrator(): Promise<void> {
    if (!this.baseAPI || !this.configManager || !this.errorHandler || !this.context) {
      throw new Error('Servicios de datos no inicializados. Llame a initializeDataServices() primero.');
    }
    
    // Inicializar orquestador
    this.orchestratorService = await OrchestratorService.create({
      eventBus: this.getEventBus(),
      logger: this.getLogger(),
      errorHandler: this.getErrorHandler(),
      baseAPI: this.getBaseAPI(),
      configurationManager: this.getConfigManager(),
      context: this.getContext()
    });
  }
  
  // Getters para servicios principales
  public getContext(): vscode.ExtensionContext {
    if (!this.context) {
      throw new Error('Contexto no inicializado');
    }
    return this.context;
  }
  
  public getConfigManager(): ConfigurationManager {
    if (!this.configManager) {
      throw new Error('ConfigurationManager no inicializado');
    }
    return this.configManager;
  }
  
  public getErrorHandler(): ErrorHandler {
    if (!this.errorHandler) {
      throw new Error('ErrorHandler no inicializado');
    }
    return this.errorHandler;
  }
  
  public getEventBus(): EventBus {
    if (!this.eventBus) {
      throw new Error('EventBus no inicializado');
    }
    return this.eventBus;
  }
  
  public getLogger(): LoggerService {
    if (!this.logger) {
      throw new Error('Logger no inicializado');
    }
    return this.logger;
  }
  
  // Getters para servicios de datos
  public getStorage(): SQLiteStorage {
    if (!this.storage) {
      throw new Error('SQLiteStorage no inicializado');
    }
    return this.storage;
  }
  
  public getBaseAPI(): BaseAPI {
    if (!this.baseAPI) {
      throw new Error('BaseAPI no inicializado');
    }
    return this.baseAPI;
  }
  
  // Getters para servicios de orquestación
  public getOrchestratorService(): OrchestratorService {
    if (!this.orchestratorService) {
      throw new Error('OrchestratorService no inicializado');
    }
    return this.orchestratorService;
  }
  
  // Métodos para dependencias personalizadas
  public register<T>(key: string, instance: T): void {
    this.customDependencies.set(key, instance);
  }
  
  public resolve<T>(key: string): T {
    const instance = this.customDependencies.get(key);
    if (!instance) {
      throw new Error(`Dependencia no registrada: ${key}`);
    }
    return instance as T;
  }
  
  /**
   * Libera todos los recursos
   */
  public dispose(): void {
    // Liberar recursos en orden inverso de dependencia
    if (this.orchestratorService) {
      this.orchestratorService.dispose?.();
      this.orchestratorService = null;
    }
    
    if (this.baseAPI) {
      this.baseAPI.dispose();
      this.baseAPI = null;
    }
    
    if (this.storage) {
      this.storage.close();
      this.storage = null;
    }
    
    // Limpiar dependencias personalizadas
    this.customDependencies.clear();
    
    // Limpiar instancia singleton
    DependencyContainer.instance = null;
  }
}
