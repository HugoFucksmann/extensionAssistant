// src/features/ai/ModelManager.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOllama } from '@langchain/ollama';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
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

import { Disposable } from '../../core/interfaces/Disposable';

export class ModelManager implements Disposable {
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
        const oldPreferredProvider = this.getUserPreferredProvider();
        this.config = this.loadDetailedConfiguration();
        this.activeProvider = this.getUserPreferredProvider(); // Re-evaluar preferencia
        this.initializeModels();
        this.ensureActiveProviderIsValid();

        if (oldPreferredProvider !== this.activeProvider) {
          console.log(`[ModelManager] Proveedor activo cambiado a: ${this.activeProvider} debido a cambio de configuración o disponibilidad.`);
        }
      }
    });
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
        modelName: 'gemini-2.0-flash-exp',
        temperature: 0.2,
        maxTokens: 4096,
        apiKey: vsCodeConfig.get<string>('google.apiKey') || process.env.GOOGLE_API_KEY,
      },
      ollama: {
        provider: 'ollama',
        modelName: 'qwen2.5-coder:7b',
        temperature: 0.2,
        baseUrl: 'http://localhost:11434',
        maxTokens: 4096,
      }
    };
  }

  private initializeModels(): void {
    this.models.clear();
    const detailedConfigs = this.config;



    const geminiConfig = detailedConfigs.gemini;
    if (geminiConfig.apiKey) {

      if (!/^AIzaSy[0-9A-Za-z_-]{33}$/.test(geminiConfig.apiKey)) {
        console.warn('[ModelManager] Clave de API de Google inválida. Formato esperado: AIzaSy seguido de 33 caracteres alfanuméricos.');
        this.models.delete('gemini');
        return;
      }

      try {
        this.models.set('gemini', new ChatGoogleGenerativeAI({
          model: geminiConfig.modelName,
          temperature: geminiConfig.temperature,
          maxOutputTokens: geminiConfig.maxTokens,
          apiKey: geminiConfig.apiKey,
        }));
        console.log('[ModelManager] Modelo Gemini inicializado.');
      } catch (error: any) {
        console.warn('[ModelManager] Error al inicializar Gemini:', error.message);
        this.models.delete('gemini');
      }
    } else {
      console.warn("[ModelManager] Clave de API de Google no proporcionada. Modelo Gemini no disponible.");
      this.models.delete('gemini');
    }


    try {
      this.models.set('ollama', new ChatOllama({
        model: detailedConfigs.ollama.modelName,
        temperature: detailedConfigs.ollama.temperature,
        baseUrl: detailedConfigs.ollama.baseUrl,

      }));

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

      console.error('[ModelManager] No hay modelos disponibles. Por favor, asegúrate de tener Ollama en ejecución o configura una clave de API de Google.');
    }
  }



  public dispose(): void {
    this.configChangeDisposable.dispose();
  }

  public getActiveModel(): BaseChatModel {
    const model = this.models.get(this.activeProvider);
    if (!model) {
      throw new Error(`Modelo para el proveedor activo '${this.activeProvider}' no está disponible.`);
    }

    return model;
  }

  public setActiveProvider(provider: ModelProvider): void {

    if (!this.models.has(provider)) {
      console.warn(`[ModelManager] Intento de activar proveedor no disponible: '${provider}'. No se realizaron cambios.`);

      return;
    }
    this.activeProvider = provider;
    console.log(`[ModelManager] Proveedor activo cambiado manualmente a: ${provider}`);
  }
}