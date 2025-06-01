// src/features/ai/ModelManager.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOllama } from '@langchain/ollama';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
// ELIMINADO: import { cleanResponseString } from './util/responseCleaner'; // Ya no se usa aquí
import * as vscode from 'vscode';

export type ModelProvider = 'gemini' | 'ollama';

export interface ModelConfig {
  provider: ModelProvider;
  modelName: string;
  temperature: number;
  maxTokens?: number;
  apiKey?: string;
  baseUrl?: string;
}

export class ModelManager {
  private models: Map<ModelProvider, BaseChatModel>;
  private activeProvider: ModelProvider;
  private config: Record<ModelProvider, ModelConfig>;
  private configChangeDisposable: vscode.Disposable;

  constructor() {
    this.models = new Map();
    this.config = this.loadDetailedConfiguration();
    this.activeProvider = this.getUserPreferredProvider();
    this.initializeModels();
    this.ensureActiveProviderIsValid();

    console.log(`[ModelManager] Inicializado. Proveedor preferido: ${this.getUserPreferredProvider()}, Proveedor activo: ${this.activeProvider}`);

    this.configChangeDisposable = vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('extensionAssistant')) {
        console.log('[ModelManager] Configuración cambiada, reinicializando...');
        const oldPreferredProvider = this.getUserPreferredProvider(); // Guardar antes de recargar config
        this.config = this.loadDetailedConfiguration();
        const newPreferredProvider = this.getUserPreferredProvider(); // Obtener nueva preferencia

        // Solo reinicializar modelos y revalidar proveedor si la configuración relevante cambió
        // o si el proveedor preferido cambió.
        if (this.didModelConfigChange(oldPreferredProvider) || oldPreferredProvider !== newPreferredProvider) {
            this.initializeModels();
            this.activeProvider = newPreferredProvider; // Actualizar al nuevo preferido
            this.ensureActiveProviderIsValid(); // Validar el nuevo activo

            if (oldPreferredProvider !== this.activeProvider || this.didModelConfigChange(oldPreferredProvider)) {
                 console.log(`[ModelManager] Proveedor activo o configuración de modelo cambiada a: ${this.activeProvider}.`);
            }
        }
      }
    });
  }

  // Helper para verificar si la configuración del modelo cambió
  private didModelConfigChange(oldPreferredProvider: ModelProvider): boolean {
    const oldConfig = this.config[oldPreferredProvider];
    const currentVsCodeConfig = vscode.workspace.getConfiguration('extensionAssistant');
    let changed = false;

    if (oldPreferredProvider === 'gemini') {
        if (oldConfig.modelName !== (currentVsCodeConfig.get<string>('google.modelName') || 'gemini-2.0-flash-exp') ||
            oldConfig.temperature !== (currentVsCodeConfig.get<number>('google.temperature') ?? 0.2) ||
            oldConfig.maxTokens !== (currentVsCodeConfig.get<number>('google.maxTokens') || 4096) ||
            oldConfig.apiKey !== (currentVsCodeConfig.get<string>('google.apiKey') || "AIzaSyBXGZbSj099c4bUOpLxbXKJgysGKKF3sR0")) {
            changed = true;
        }
    } else if (oldPreferredProvider === 'ollama') {
        if (oldConfig.modelName !== (currentVsCodeConfig.get<string>('ollama.modelName') || 'qwen2.5-coder:7b') ||
            oldConfig.temperature !== (currentVsCodeConfig.get<number>('ollama.temperature') ?? 0.2) ||
            oldConfig.baseUrl !== (currentVsCodeConfig.get<string>('ollama.baseUrl') || 'http://localhost:11434') ||
            oldConfig.maxTokens !== (currentVsCodeConfig.get<number>('ollama.maxTokens') || 4096)) {
            changed = true;
        }
    }
    return changed;
  }


  private getUserPreferredProvider(): ModelProvider {
    const config = vscode.workspace.getConfiguration('extensionAssistant');
    return config.get<ModelProvider>('modelType', 'gemini');
  }

  private loadDetailedConfiguration(): Record<ModelProvider, ModelConfig> {
    const vsCodeConfig = vscode.workspace.getConfiguration('extensionAssistant');
    return {
      gemini: {
        provider: 'gemini',
        modelName: vsCodeConfig.get<string>('google.modelName') || 'gemini-2.0-flash-exp',
        temperature: vsCodeConfig.get<number>('google.temperature') ?? 0.2,
        maxTokens: vsCodeConfig.get<number>('google.maxTokens') || 4096,
        apiKey: vsCodeConfig.get<string>('google.apiKey') || "AIzaSyBXGZbSj099c4bUOpLxbXKJgysGKKF3sR0",
      },
      ollama: {
        provider: 'ollama',
        modelName: vsCodeConfig.get<string>('ollama.modelName') || 'qwen2.5-coder:7b',
        temperature: vsCodeConfig.get<number>('ollama.temperature') ?? 0.2,
        baseUrl: vsCodeConfig.get<string>('ollama.baseUrl') || 'http://localhost:11434',
        maxTokens: vsCodeConfig.get<number>('ollama.maxTokens') || 4096,
      }
    };
  }

  private initializeModels(): void {
    this.models.clear();
    const detailedConfigs = this.config;

    if (detailedConfigs.gemini.apiKey) {
      try {
        this.models.set('gemini', new ChatGoogleGenerativeAI({
          model: detailedConfigs.gemini.modelName,
          temperature: detailedConfigs.gemini.temperature,
          maxOutputTokens: detailedConfigs.gemini.maxTokens,
          apiKey: detailedConfigs.gemini.apiKey,
        }));
        console.log('[ModelManager] Modelo Gemini inicializado.');
      } catch (error: any) {
        console.warn('[ModelManager] Error al inicializar Gemini:', error.message);
      }
    } else {
      console.warn("[ModelManager] Clave de API de Google no proporcionada. Modelo Gemini no disponible.");
    }

    try {
      this.models.set('ollama', new ChatOllama({
        model: detailedConfigs.ollama.modelName,
        temperature: detailedConfigs.ollama.temperature,
        baseUrl: detailedConfigs.ollama.baseUrl,
      }));
      console.log('[ModelManager] Modelo Ollama inicializado.');
    } catch (error: any) {
      console.warn('[ModelManager] No se pudo conectar con Ollama. ¿Está en ejecución?', error.message);
    }
  }

  private ensureActiveProviderIsValid(): void {
    const preferredProvider = this.getUserPreferredProvider();

    if (this.models.has(preferredProvider)) {
      this.activeProvider = preferredProvider;
    } else if (this.models.size > 0) {
      const fallbackProvider = Array.from(this.models.keys())[0];
      console.warn(`[ModelManager] Proveedor preferido '${preferredProvider}' no disponible. Usando fallback: '${fallbackProvider}'.`);
      this.activeProvider = fallbackProvider;
    } else {
      console.error('[ModelManager] No hay modelos disponibles. Configura Ollama o proporciona una clave de API de Google.');
      // Aquí podrías asignar un proveedor por defecto aunque no esté inicializado,
      // para evitar errores de 'undefined', aunque getActiveModel() fallará.
      // O manejarlo para que getActiveModel() devuelva undefined o lance un error más específico.
      // Por ahora, se mantiene como estaba, lo que podría llevar a errores si no hay modelos.
    }
  }

  // ELIMINADO: private wrapModelWithCleaning(model: BaseChatModel): BaseChatModel { ... }

  public dispose(): void {
    this.configChangeDisposable.dispose();
  }

  public getActiveModel(): BaseChatModel {
    const model = this.models.get(this.activeProvider);
    if (!model) {
      // Intentar reinicializar y revalidar si el modelo no está disponible
      // Esto podría ocurrir si la configuración cambió pero el listener no se disparó o hubo un error.
      console.warn(`[ModelManager] Modelo para proveedor activo '${this.activeProvider}' no encontrado. Intentando reinicializar...`);
      this.initializeModels();
      this.ensureActiveProviderIsValid();
      const recheckedModel = this.models.get(this.activeProvider);
      if (!recheckedModel) {
        throw new Error(`Modelo para el proveedor activo '${this.activeProvider}' sigue sin estar disponible después de reinicializar. Verifique la configuración.`);
      }
      return recheckedModel; // Devolver el modelo re-verificado
    }
    // YA NO SE ENVUELVE CON EL PROXY: return this.wrapModelWithCleaning(model);
    return model;
  }

  public setActiveProvider(provider: ModelProvider): void {
    if (!this.models.has(provider)) {
      console.warn(`[ModelManager] Intento de activar proveedor no disponible: '${provider}'. Verifique que el modelo esté configurado e inicializado. No se realizaron cambios.`);
      return;
    }
    if (this.activeProvider !== provider) {
        this.activeProvider = provider;
        console.log(`[ModelManager] Proveedor activo cambiado manualmente a: ${provider}`);
    }
  }
}